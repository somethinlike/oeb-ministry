/**
 * Translation backup service — encrypted server-side backup for user-uploaded Bibles.
 *
 * Encrypts chapter verse data with the user's existing AES-256-GCM key (same
 * key used for private annotations) before storing in Supabase. Manifests
 * (metadata) are stored in plaintext — they're not copyrightable.
 *
 * This is a "personal backup system": users can only access their own data.
 * No distribution, no sharing, no cross-user access. RLS enforces this at
 * the database level; role checks gate the feature at the UI level.
 *
 * Designed for gradual upload/restore: chapters are stored individually
 * (not as one blob) to keep row sizes reasonable and allow partial restore.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { UserTranslationManifest, StoredUserChapter } from "../types/user-translation";
import type { BookInfo } from "../types/bible";
import { encryptContent, decryptContent, uint8ToBase64, base64ToUint8 } from "./crypto";

type DbClient = SupabaseClient<Database>;

/** How many chapter rows to insert per batch (avoids huge payloads) */
const CHAPTER_BATCH_SIZE = 100;

// ── Types ──

/** Shape of a backup manifest as returned by listBackups() */
export interface TranslationBackup {
  id: string;
  translationId: string;
  name: string;
  abbreviation: string;
  language: string;
  license: string;
  books: BookInfo[];
  originalFilename: string;
  fileType: "epub" | "text";
  uploadedAt: string;
  createdAt: string;
}

// ── Backup ──

/**
 * Encrypt and upload a user translation to Supabase as a personal backup.
 *
 * 1. Upserts the manifest row (plaintext metadata)
 * 2. Encrypts each chapter's verse data with AES-256-GCM
 * 3. Upserts chapter rows in batches of CHAPTER_BATCH_SIZE
 *
 * If a backup for this translation already exists, it's replaced.
 */
export async function backupTranslation(
  client: DbClient,
  userId: string,
  manifest: UserTranslationManifest,
  chapters: StoredUserChapter[],
  cryptoKey: CryptoKey,
): Promise<void> {
  // 1. Upsert the manifest row
  const { data: backupRow, error: manifestError } = await client
    .from("translation_backups")
    .upsert(
      {
        user_id: userId,
        translation_id: manifest.translation,
        name: manifest.name,
        abbreviation: manifest.abbreviation,
        language: manifest.language,
        license: manifest.license,
        books: manifest.books as unknown,
        original_filename: manifest.originalFilename,
        file_type: manifest.fileType,
        uploaded_at: manifest.uploadedAt,
      },
      { onConflict: "user_id,translation_id" },
    )
    .select("id")
    .single();

  if (manifestError || !backupRow) {
    throw new Error(`Backup manifest save failed: ${manifestError?.message ?? "no data returned"}`);
  }

  const backupId = backupRow.id;

  // 2. Delete existing chapters for this backup (clean re-upload)
  const { error: deleteError } = await client
    .from("translation_backup_chapters")
    .delete()
    .eq("backup_id", backupId);

  if (deleteError) {
    throw new Error(`Failed to clear old backup chapters: ${deleteError.message}`);
  }

  // 3. Encrypt and upload chapters in batches
  for (let i = 0; i < chapters.length; i += CHAPTER_BATCH_SIZE) {
    const batch = chapters.slice(i, i + CHAPTER_BATCH_SIZE);

    // Encrypt all chapters in this batch in parallel
    const encryptedBatch = await Promise.all(
      batch.map(async (ch) => {
        const versesJson = JSON.stringify(ch.verses);
        const { ciphertext, iv } = await encryptContent(versesJson, cryptoKey);
        return {
          backup_id: backupId,
          user_id: userId,
          book: ch.book,
          chapter: ch.chapter,
          book_name: ch.bookName,
          encrypted_verses: uint8ToBase64(ciphertext),
          encryption_iv: uint8ToBase64(iv),
        };
      }),
    );

    const { error: insertError } = await client
      .from("translation_backup_chapters")
      .insert(encryptedBatch);

    if (insertError) {
      throw new Error(`Failed to save backup chapters (batch ${i}): ${insertError.message}`);
    }
  }
}

// ── List backups ──

/**
 * List all translation backups for the given user.
 * Returns manifest metadata only — no chapter data, no decryption needed.
 */
export async function listBackups(
  client: DbClient,
  userId: string,
): Promise<TranslationBackup[]> {
  const { data, error } = await client
    .from("translation_backups")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list backups: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    translationId: row.translation_id,
    name: row.name,
    abbreviation: row.abbreviation,
    language: row.language,
    license: row.license,
    books: row.books as BookInfo[],
    originalFilename: row.original_filename,
    fileType: row.file_type as "epub" | "text",
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
  }));
}

// ── Restore ──

/**
 * Restore a translation from its encrypted backup.
 *
 * 1. Fetches the backup manifest from Supabase
 * 2. Fetches all encrypted chapter rows
 * 3. Decrypts each chapter's verse data with the user's CryptoKey
 * 4. Returns the manifest + chapters in the shapes needed for IndexedDB save
 *
 * The caller is responsible for writing the result to IndexedDB via
 * saveUserTranslation() — this function only handles the Supabase + crypto side.
 */
export async function restoreTranslation(
  client: DbClient,
  userId: string,
  backupId: string,
  cryptoKey: CryptoKey,
): Promise<{ manifest: UserTranslationManifest; chapters: StoredUserChapter[] }> {
  // 1. Fetch the backup manifest
  const { data: backupRow, error: manifestError } = await client
    .from("translation_backups")
    .select("*")
    .eq("id", backupId)
    .eq("user_id", userId)
    .single();

  if (manifestError || !backupRow) {
    throw new Error(`Backup not found: ${manifestError?.message ?? "no data"}`);
  }

  // 2. Fetch all encrypted chapters
  const { data: chapterRows, error: chaptersError } = await client
    .from("translation_backup_chapters")
    .select("*")
    .eq("backup_id", backupId)
    .eq("user_id", userId)
    .order("book")
    .order("chapter");

  if (chaptersError) {
    throw new Error(`Failed to fetch backup chapters: ${chaptersError.message}`);
  }

  // 3. Decrypt all chapters in parallel
  const chapters: StoredUserChapter[] = await Promise.all(
    (chapterRows ?? []).map(async (row) => {
      const ciphertext = base64ToUint8(row.encrypted_verses);
      const iv = base64ToUint8(row.encryption_iv);
      const versesJson = await decryptContent(ciphertext, cryptoKey, iv);
      return {
        translation: backupRow.translation_id,
        book: row.book,
        chapter: row.chapter,
        bookName: row.book_name,
        verses: JSON.parse(versesJson),
      };
    }),
  );

  // 4. Reconstruct the manifest in IndexedDB shape
  const manifest: UserTranslationManifest = {
    translation: backupRow.translation_id,
    name: backupRow.name,
    abbreviation: backupRow.abbreviation,
    language: backupRow.language,
    license: backupRow.license,
    books: backupRow.books as BookInfo[],
    originalFilename: backupRow.original_filename,
    fileType: backupRow.file_type as "epub" | "text",
    uploadedAt: backupRow.uploaded_at,
  };

  return { manifest, chapters };
}

// ── Delete backup ──

/**
 * Delete a translation backup (chapters cascade via FK).
 */
export async function deleteBackup(
  client: DbClient,
  userId: string,
  backupId: string,
): Promise<void> {
  const { error } = await client
    .from("translation_backups")
    .delete()
    .eq("id", backupId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete backup: ${error.message}`);
}

// ── Backup status check ──

/**
 * Check which of the given translation IDs have server-side backups.
 * Returns a Map from translationId to backup info (or undefined if not backed up).
 *
 * Used by the UI to show backup status indicators next to each translation.
 */
export async function getBackupStatus(
  client: DbClient,
  userId: string,
  translationIds: string[],
): Promise<Map<string, TranslationBackup>> {
  if (translationIds.length === 0) return new Map();

  const { data, error } = await client
    .from("translation_backups")
    .select("*")
    .eq("user_id", userId)
    .in("translation_id", translationIds);

  if (error) return new Map();

  const result = new Map<string, TranslationBackup>();
  for (const row of data ?? []) {
    result.set(row.translation_id, {
      id: row.id,
      translationId: row.translation_id,
      name: row.name,
      abbreviation: row.abbreviation,
      language: row.language,
      license: row.license,
      books: row.books as BookInfo[],
      originalFilename: row.original_filename,
      fileType: row.file_type as "epub" | "text",
      uploadedAt: row.uploaded_at,
      createdAt: row.created_at,
    });
  }
  return result;
}
