/**
 * Supabase database types — generated from the database schema.
 *
 * In a production workflow, you'd run `npx supabase gen types typescript`
 * to auto-generate this file. For now, we define it manually to match
 * our migrations. When the local Supabase instance is running, regenerate
 * with: npx supabase gen types typescript --local > src/types/database.ts
 */

export interface Database {
  public: {
    Tables: {
      annotations: {
        Row: {
          id: string;
          user_id: string;
          translation: string;
          book: string;
          chapter: number;
          verse_start: number;
          verse_end: number;
          content_md: string;
          is_public: boolean;
          is_encrypted: boolean;
          encryption_iv: string | null;
          encryption_salt: string | null;
          verse_text: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          search_vector: string | null;
          publish_status: string | null;
          published_at: string | null;
          rejection_reason: string | null;
          author_display_name: string | null;
          ai_screening_passed: boolean | null;
          ai_screening_flags: unknown[] | null;
          ai_screened_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          translation: string;
          book: string;
          chapter: number;
          verse_start: number;
          verse_end: number;
          content_md?: string;
          is_public?: boolean;
          is_encrypted?: boolean;
          encryption_iv?: string | null;
          encryption_salt?: string | null;
          verse_text?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          publish_status?: string | null;
          published_at?: string | null;
          rejection_reason?: string | null;
          author_display_name?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          translation?: string;
          book?: string;
          chapter?: number;
          verse_start?: number;
          verse_end?: number;
          content_md?: string;
          is_public?: boolean;
          is_encrypted?: boolean;
          encryption_iv?: string | null;
          encryption_salt?: string | null;
          verse_text?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          publish_status?: string | null;
          published_at?: string | null;
          rejection_reason?: string | null;
          author_display_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "annotations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cross_references: {
        Row: {
          id: string;
          annotation_id: string;
          book: string;
          chapter: number;
          verse_start: number;
          verse_end: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          annotation_id: string;
          book: string;
          chapter: number;
          verse_start: number;
          verse_end: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          annotation_id?: string;
          book?: string;
          chapter?: number;
          verse_start?: number;
          verse_end?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cross_references_annotation_id_fkey";
            columns: ["annotation_id"];
            isOneToOne: false;
            referencedRelation: "annotations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_log: {
        Row: {
          id: string;
          annotation_id: string | null;
          devotional_bible_id: string | null;
          moderator_id: string;
          action: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          annotation_id?: string | null;
          devotional_bible_id?: string | null;
          moderator_id: string;
          action: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          annotation_id?: string | null;
          devotional_bible_id?: string | null;
          moderator_id?: string;
          action?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_log_annotation_id_fkey";
            columns: ["annotation_id"];
            isOneToOne: false;
            referencedRelation: "annotations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_log_devotional_bible_id_fkey";
            columns: ["devotional_bible_id"];
            isOneToOne: false;
            referencedRelation: "devotional_bibles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_log_moderator_id_fkey";
            columns: ["moderator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_encryption: {
        Row: {
          id: string;
          user_id: string;
          key_salt: string;
          iterations: number;
          recovery_code_hash: string;
          recovery_wrapped_key: string;
          recovery_key_salt: string;
          verification_ciphertext: string;
          verification_iv: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key_salt: string;
          iterations?: number;
          recovery_code_hash: string;
          recovery_wrapped_key: string;
          recovery_key_salt: string;
          verification_ciphertext: string;
          verification_iv: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key_salt?: string;
          iterations?: number;
          recovery_code_hash?: string;
          recovery_wrapped_key?: string;
          recovery_key_salt?: string;
          verification_ciphertext?: string;
          verification_iv?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_encryption_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      devotional_bibles: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          translation: string;
          type: string;
          is_published: boolean;
          publish_status: string | null;
          published_at: string | null;
          rejection_reason: string | null;
          forked_from_id: string | null;
          author_display_name: string | null;
          entry_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          translation: string;
          type: string;
          is_published?: boolean;
          publish_status?: string | null;
          published_at?: string | null;
          rejection_reason?: string | null;
          forked_from_id?: string | null;
          author_display_name?: string | null;
          entry_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          translation?: string;
          type?: string;
          is_published?: boolean;
          publish_status?: string | null;
          published_at?: string | null;
          rejection_reason?: string | null;
          forked_from_id?: string | null;
          author_display_name?: string | null;
          entry_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "devotional_bibles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devotional_bibles_forked_from_id_fkey";
            columns: ["forked_from_id"];
            isOneToOne: false;
            referencedRelation: "devotional_bibles";
            referencedColumns: ["id"];
          },
        ];
      };
      devotional_bible_entries: {
        Row: {
          id: string;
          devotional_bible_id: string;
          annotation_id: string;
          sort_order: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          devotional_bible_id: string;
          annotation_id: string;
          sort_order?: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          devotional_bible_id?: string;
          annotation_id?: string;
          sort_order?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devotional_bible_entries_devotional_bible_id_fkey";
            columns: ["devotional_bible_id"];
            isOneToOne: false;
            referencedRelation: "devotional_bibles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devotional_bible_entries_annotation_id_fkey";
            columns: ["annotation_id"];
            isOneToOne: false;
            referencedRelation: "annotations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferences: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferences?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferences?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
