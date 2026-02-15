/**
 * Annotation data access layer.
 *
 * All Supabase queries for annotations and cross-references go through
 * this module. This keeps database logic in one place and makes it
 * easy to add offline support later (Phase 7).
 *
 * Every function takes a Supabase client as its first argument instead
 * of importing a global one — this lets us use either the browser client
 * or the server client depending on context.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { Annotation, AnnotationFormData } from "../types/annotation";
import type { BookId } from "../types/bible";

type DbClient = SupabaseClient<Database>;

/** Maps a database row to our Annotation type. */
function rowToAnnotation(
  row: Database["public"]["Tables"]["annotations"]["Row"],
  crossRefs: Database["public"]["Tables"]["cross_references"]["Row"][] = [],
): Annotation {
  return {
    id: row.id,
    userId: row.user_id,
    translation: row.translation,
    anchor: {
      book: row.book as BookId,
      chapter: row.chapter,
      verseStart: row.verse_start,
      verseEnd: row.verse_end,
    },
    contentMd: row.content_md,
    isPublic: row.is_public,
    crossReferences: crossRefs.map((ref) => ({
      id: ref.id,
      annotationId: ref.annotation_id,
      book: ref.book as BookId,
      chapter: ref.chapter,
      verseStart: ref.verse_start,
      verseEnd: ref.verse_end,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches annotations for a specific chapter that belong to the current user.
 * Used in the ChapterReader to show annotation indicators on verses.
 */
export async function getAnnotationsForChapter(
  client: DbClient,
  userId: string,
  translation: string,
  book: string,
  chapter: number,
): Promise<Annotation[]> {
  // Fetch annotations
  const { data: annotations, error } = await client
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .eq("translation", translation)
    .eq("book", book)
    .eq("chapter", chapter)
    .order("verse_start", { ascending: true });

  if (error) throw new Error(`Failed to load annotations: ${error.message}`);
  if (!annotations?.length) return [];

  // Fetch cross-references for all annotations in one query
  const annotationIds = annotations.map((a) => a.id);
  const { data: crossRefs } = await client
    .from("cross_references")
    .select("*")
    .in("annotation_id", annotationIds);

  // Group cross-references by annotation ID for efficient lookup
  const crossRefsByAnnotation = new Map<string, typeof crossRefs>();
  for (const ref of crossRefs ?? []) {
    const existing = crossRefsByAnnotation.get(ref.annotation_id) ?? [];
    existing.push(ref);
    crossRefsByAnnotation.set(ref.annotation_id, existing);
  }

  return annotations.map((row) =>
    rowToAnnotation(row, crossRefsByAnnotation.get(row.id) ?? []),
  );
}

/**
 * Fetches a single annotation by ID, including its cross-references.
 */
export async function getAnnotation(
  client: DbClient,
  annotationId: string,
): Promise<Annotation | null> {
  const { data: row, error } = await client
    .from("annotations")
    .select("*")
    .eq("id", annotationId)
    .single();

  if (error || !row) return null;

  const { data: crossRefs } = await client
    .from("cross_references")
    .select("*")
    .eq("annotation_id", annotationId);

  return rowToAnnotation(row, crossRefs ?? []);
}

/**
 * Creates a new annotation with optional cross-references.
 * Uses a transaction-like pattern: creates the annotation first,
 * then inserts cross-references.
 */
export async function createAnnotation(
  client: DbClient,
  userId: string,
  formData: AnnotationFormData,
): Promise<Annotation> {
  // Insert the annotation
  const { data: row, error } = await client
    .from("annotations")
    .insert({
      user_id: userId,
      translation: formData.translation,
      book: formData.anchor.book,
      chapter: formData.anchor.chapter,
      verse_start: formData.anchor.verseStart,
      verse_end: formData.anchor.verseEnd,
      content_md: formData.contentMd,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(`Failed to create annotation: ${error?.message ?? "Unknown error"}`);
  }

  // Insert cross-references if any
  let crossRefs: Database["public"]["Tables"]["cross_references"]["Row"][] = [];
  if (formData.crossReferences.length > 0) {
    const { data: refs, error: refError } = await client
      .from("cross_references")
      .insert(
        formData.crossReferences.map((ref) => ({
          annotation_id: row.id,
          book: ref.book,
          chapter: ref.chapter,
          verse_start: ref.verseStart,
          verse_end: ref.verseEnd,
        })),
      )
      .select();

    if (refError) {
      console.error("Failed to create cross-references:", refError.message);
    }
    crossRefs = refs ?? [];
  }

  return rowToAnnotation(row, crossRefs);
}

/**
 * Updates an existing annotation's content and cross-references.
 * Replaces all cross-references (delete old ones, insert new ones).
 */
export async function updateAnnotation(
  client: DbClient,
  annotationId: string,
  formData: Partial<AnnotationFormData>,
): Promise<Annotation> {
  // Build the update object — only include fields that were provided
  const updateData: Database["public"]["Tables"]["annotations"]["Update"] = {};
  if (formData.contentMd !== undefined) updateData.content_md = formData.contentMd;
  if (formData.anchor) {
    updateData.book = formData.anchor.book;
    updateData.chapter = formData.anchor.chapter;
    updateData.verse_start = formData.anchor.verseStart;
    updateData.verse_end = formData.anchor.verseEnd;
  }

  const { data: row, error } = await client
    .from("annotations")
    .update(updateData)
    .eq("id", annotationId)
    .select()
    .single();

  if (error || !row) {
    throw new Error(`Failed to update annotation: ${error?.message ?? "Unknown error"}`);
  }

  // Replace cross-references if provided
  let crossRefs: Database["public"]["Tables"]["cross_references"]["Row"][] = [];
  if (formData.crossReferences !== undefined) {
    // Delete existing cross-references
    await client
      .from("cross_references")
      .delete()
      .eq("annotation_id", annotationId);

    // Insert new ones
    if (formData.crossReferences.length > 0) {
      const { data: refs } = await client
        .from("cross_references")
        .insert(
          formData.crossReferences.map((ref) => ({
            annotation_id: annotationId,
            book: ref.book,
            chapter: ref.chapter,
            verse_start: ref.verseStart,
            verse_end: ref.verseEnd,
          })),
        )
        .select();

      crossRefs = refs ?? [];
    }
  } else {
    // Fetch existing cross-references if not replacing
    const { data: refs } = await client
      .from("cross_references")
      .select("*")
      .eq("annotation_id", annotationId);
    crossRefs = refs ?? [];
  }

  return rowToAnnotation(row, crossRefs);
}

/**
 * Deletes an annotation and its cross-references (cascade).
 */
export async function deleteAnnotation(
  client: DbClient,
  annotationId: string,
): Promise<void> {
  const { error } = await client
    .from("annotations")
    .delete()
    .eq("id", annotationId);

  if (error) {
    throw new Error(`Failed to delete annotation: ${error.message}`);
  }
}

/**
 * Full-text search across the user's annotations.
 * Uses Postgres tsvector for fast, language-aware search.
 */
export async function searchAnnotations(
  client: DbClient,
  userId: string,
  query: string,
): Promise<Annotation[]> {
  // Convert the search query to tsquery format.
  // Split words and join with & (AND) for stricter matching.
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");

  if (!tsQuery) return [];

  const { data: annotations, error } = await client
    .from("annotations")
    .select("*")
    .eq("user_id", userId)
    .textSearch("search_vector", tsQuery)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Search failed: ${error.message}`);

  return (annotations ?? []).map((row) => rowToAnnotation(row));
}
