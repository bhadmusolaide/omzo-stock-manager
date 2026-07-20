export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      batches: {
        Row: {
          id: string
          name: string
          doc_purchased_count: number
          doc_free_count: number
          total_doc_cost: number
          initial_chick_count: number
          current_live: number
          total_mortality: number
          total_weight_kg: number
          effective_unit_cost: number
          start_date: string
          status: Database["public"]["Enums"]["batch_status"]
          is_deleted: boolean
          notes: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          doc_purchased_count?: number
          doc_free_count?: number
          total_doc_cost?: number
          initial_chick_count?: number
          current_live?: number
          total_mortality?: number
          total_weight_kg?: number
          effective_unit_cost?: number
          start_date: string
          status?: Database["public"]["Enums"]["batch_status"]
          is_deleted?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          doc_purchased_count?: number
          doc_free_count?: number
          total_doc_cost?: number
          initial_chick_count?: number
          current_live?: number
          total_mortality?: number
          total_weight_kg?: number
          effective_unit_cost?: number
          start_date?: string
          status?: Database["public"]["Enums"]["batch_status"]
          is_deleted?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          batch_id: string | null
          date: string
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          batch_id?: string | null
          date: string
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string | null
          date?: string
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          description?: string
          created_at?: string
        }
      }
      feed_borrows: {
        Row: {
          id: string
          source_batch_id: string
          target_batch_id: string
          feed_purchase_id: string | null
          feed_type: Database["public"]["Enums"]["feed_type"]
          kg_borrowed: number
          cost_value: number
          borrow_date: string
          status: Database["public"]["Enums"]["feed_borrow_status"]
          settled_date: string | null
          settled_method: Database["public"]["Enums"]["feed_borrow_settlement_method"] | null
          notes: string | null
          created_by: string | null
          updated_by: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_batch_id: string
          target_batch_id: string
          feed_purchase_id?: string | null
          feed_type: Database["public"]["Enums"]["feed_type"]
          kg_borrowed: number
          cost_value?: number
          borrow_date?: string
          status?: Database["public"]["Enums"]["feed_borrow_status"]
          settled_date?: string | null
          settled_method?: Database["public"]["Enums"]["feed_borrow_settlement_method"] | null
          notes?: string | null
          created_by?: string | null
          updated_by?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_batch_id?: string
          target_batch_id?: string
          feed_purchase_id?: string | null
          feed_type?: Database["public"]["Enums"]["feed_type"]
          kg_borrowed?: number
          cost_value?: number
          borrow_date?: string
          status?: Database["public"]["Enums"]["feed_borrow_status"]
          settled_date?: string | null
          settled_method?: Database["public"]["Enums"]["feed_borrow_settlement_method"] | null
          notes?: string | null
          created_by?: string | null
          updated_by?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      feed_purchases: {
        Row: {
          id: string
          batch_id: string
          feed_type: Database["public"]["Enums"]["feed_type"]
          kg: number
          unit_cost: number
          total_cost: number
          supplier: string | null
          purchase_date: string
          notes: string | null
          created_by: string | null
          is_deleted: boolean
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          feed_type: Database["public"]["Enums"]["feed_type"]
          kg: number
          unit_cost: number
          total_cost: number
          supplier?: string | null
          purchase_date: string
          notes?: string | null
          created_by?: string | null
          is_deleted?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          feed_type?: Database["public"]["Enums"]["feed_type"]
          kg?: number
          unit_cost?: number
          total_cost?: number
          supplier?: string | null
          purchase_date?: string
          notes?: string | null
          created_by?: string | null
          is_deleted?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      feed_usages: {
        Row: {
          id: string
          batch_id: string
          feed_id: string
          kg: number
          date: string
          notes: string | null
          created_by: string | null
          is_deleted: boolean
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          feed_id: string
          kg: number
          date: string
          notes?: string | null
          created_by?: string | null
          is_deleted?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          feed_id?: string
          kg?: number
          date?: string
          notes?: string | null
          created_by?: string | null
          is_deleted?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mortality_records: {
        Row: {
          id: string
          batch_id: string
          date: string
          count: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          date: string
          count?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          date?: string
          count?: number
          notes?: string | null
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_phone: string | null
          location: string | null
          order_date: string
          total_amount: number
          amount_paid: number
          balance_due: number
          write_off_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["payment_status"]
          order_type: Database["public"]["Enums"]["order_type"]
          linked_batch_id: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          is_deleted: boolean
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          customer_phone?: string | null
          location?: string | null
          order_date: string
          total_amount: number
          amount_paid?: number
          balance_due?: number
          write_off_amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["payment_status"]
          order_type?: Database["public"]["Enums"]["order_type"]
          linked_batch_id?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
        Update: {
          id?: string
          order_number?: string
          customer_name?: string
          customer_phone?: string | null
          location?: string | null
          order_date?: string
          total_amount?: number
          amount_paid?: number
          balance_due?: number
          write_off_amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["payment_status"]
          order_type?: Database["public"]["Enums"]["order_type"]
          linked_batch_id?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
      }
      processing_outputs: {
        Row: {
          id: string
          batch_id: string
          date: string
          output_type: string
          quantity: number
          price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          date: string
          output_type: string
          quantity: number
          price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          date?: string
          output_type?: string
          quantity?: number
          price?: number | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          date: string
          description: string
          amount: number
          type: Database["public"]["Enums"]["transaction_type"]
          category: Database["public"]["Enums"]["transaction_category"]
          linked_batch_id: string | null
          linked_order_id: string | null
          linked_feed_id: string | null
          created_by: string | null
          is_deleted: boolean
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          description: string
          amount: number
          type: Database["public"]["Enums"]["transaction_type"]
          category: Database["public"]["Enums"]["transaction_category"]
          linked_batch_id?: string | null
          linked_order_id?: string | null
          linked_feed_id?: string | null
          created_by?: string | null
          is_deleted?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          description?: string
          amount?: number
          type?: Database["public"]["Enums"]["transaction_type"]
          category?: Database["public"]["Enums"]["transaction_category"]
          linked_batch_id?: string | null
          linked_order_id?: string | null
          linked_feed_id?: string | null
          created_by?: string | null
          is_deleted?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_insights: {
        Row: {
          id: string
          related_batch_id: string | null
          insight_type: string
          insight_value: Json
          created_at: string
        }
        Insert: {
          id?: string
          related_batch_id?: string | null
          insight_type: string
          insight_value: Json
          created_at?: string
        }
        Update: {
          id?: string
          related_batch_id?: string | null
          insight_type?: string
          insight_value?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      batch_status: "BROODING" | "GROWING" | "PROCESSING" | "CLOSED"
      feed_borrow_status: "PENDING" | "SETTLED" | "CANCELLED"
      feed_borrow_settlement_method: "RETURNED" | "PURCHASED" | "WRITTEN_OFF"
      feed_type: "STARTER" | "GROWER" | "FINISHER"
      payment_status: "PENDING" | "PARTIAL" | "PAID" | "COMPLIMENTARY"
      transaction_category: "DOC" | "FEED" | "ORDER" | "EXPENSE" | "OTHER" | "LOSS"
      transaction_type: "CREDIT" | "DEBIT"
      order_type: "DRESSED" | "LIVE"
    }
  }
}