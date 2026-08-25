export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      cargas: {
        Row: {
          archivo: string
          created_at: string
          filas_duplicadas: number
          filas_nuevas: number
          filas_recibidas: number
          id: number
          usuario_id: string | null
        }
        Insert: {
          archivo: string
          created_at?: string
          filas_duplicadas?: number
          filas_nuevas?: number
          filas_recibidas?: number
          id?: number
          usuario_id?: string | null
        }
        Update: {
          archivo?: string
          created_at?: string
          filas_duplicadas?: number
          filas_nuevas?: number
          filas_recibidas?: number
          id?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      dim_canal: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_ciudad: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_coleccion: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_correria: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_linea: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_marca: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_pais: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_tercero: {
        Row: {
          codigo: string
          id: number
          nombre: string | null
        }
        Insert: {
          codigo: string
          id?: number
          nombre?: string | null
        }
        Update: {
          codigo?: string
          id?: number
          nombre?: string | null
        }
        Relationships: []
      }
      dim_vendedor: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_zona: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_zona_colombia: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      dim_zona2: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      fact_ventas: {
        Row: {
          anio: number | null
          anio_col: string | null
          canal_id: number | null
          cantidad: number | null
          ciudad_id: number | null
          cod_color: string | null
          coleccion_id: number | null
          color: string | null
          correria_id: number | null
          costo: number | null
          costo_total: number | null
          created_at: string
          dia: number | null
          fecha: string | null
          fecha_compra: string | null
          id: number
          linea_id: number | null
          marca_id: number | null
          mes: number | null
          pais_id: number | null
          prenda_hgi: string | null
          producto: string | null
          producto_c: string | null
          row_hash: string
          sku: string | null
          talla: string | null
          tercero_id: number | null
          tr: number | null
          transaccion: string | null
          valor: number | null
          vendedor_id: number | null
          vendedor2_id: number | null
          zona_colombia_id: number | null
          zona_id: number | null
          zona2_id: number | null
        }
        Insert: {
          anio?: number | null
          anio_col?: string | null
          canal_id?: number | null
          cantidad?: number | null
          ciudad_id?: number | null
          cod_color?: string | null
          coleccion_id?: number | null
          color?: string | null
          correria_id?: number | null
          costo?: number | null
          costo_total?: number | null
          created_at?: string
          dia?: number | null
          fecha?: string | null
          fecha_compra?: string | null
          id?: number
          linea_id?: number | null
          marca_id?: number | null
          mes?: number | null
          pais_id?: number | null
          prenda_hgi?: string | null
          producto?: string | null
          producto_c?: string | null
          row_hash: string
          sku?: string | null
          talla?: string | null
          tercero_id?: number | null
          tr?: number | null
          transaccion?: string | null
          valor?: number | null
          vendedor_id?: number | null
          vendedor2_id?: number | null
          zona_colombia_id?: number | null
          zona_id?: number | null
          zona2_id?: number | null
        }
        Update: {
          anio?: number | null
          anio_col?: string | null
          canal_id?: number | null
          cantidad?: number | null
          ciudad_id?: number | null
          cod_color?: string | null
          coleccion_id?: number | null
          color?: string | null
          correria_id?: number | null
          costo?: number | null
          costo_total?: number | null
          created_at?: string
          dia?: number | null
          fecha?: string | null
          fecha_compra?: string | null
          id?: number
          linea_id?: number | null
          marca_id?: number | null
          mes?: number | null
          pais_id?: number | null
          prenda_hgi?: string | null
          producto?: string | null
          producto_c?: string | null
          row_hash?: string
          sku?: string | null
          talla?: string | null
          tercero_id?: number | null
          tr?: number | null
          transaccion?: string | null
          valor?: number | null
          vendedor_id?: number | null
          vendedor2_id?: number | null
          zona_colombia_id?: number | null
          zona_id?: number | null
          zona2_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_ventas_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "dim_canal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_ciudad_id_fkey"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "dim_ciudad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_coleccion_id_fkey"
            columns: ["coleccion_id"]
            isOneToOne: false
            referencedRelation: "dim_coleccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_correria_id_fkey"
            columns: ["correria_id"]
            isOneToOne: false
            referencedRelation: "dim_correria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_linea_id_fkey"
            columns: ["linea_id"]
            isOneToOne: false
            referencedRelation: "dim_linea"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "dim_marca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "dim_pais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "dim_tercero"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "dim_vendedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_vendedor2_id_fkey"
            columns: ["vendedor2_id"]
            isOneToOne: false
            referencedRelation: "dim_vendedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_zona_colombia_id_fkey"
            columns: ["zona_colombia_id"]
            isOneToOne: false
            referencedRelation: "dim_zona_colombia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "dim_zona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_ventas_zona2_id_fkey"
            columns: ["zona2_id"]
            isOneToOne: false
            referencedRelation: "dim_zona2"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ingest_ventas: {
        Args: { payload: Json }
        Returns: {
          nuevas: number
          recibidas: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
