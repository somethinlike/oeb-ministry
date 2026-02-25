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
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          search_vector: string | null;
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
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
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
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
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
