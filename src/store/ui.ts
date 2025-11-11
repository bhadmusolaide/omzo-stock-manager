import { create } from 'zustand';

interface UiState {
  // Batches
  addBatchOpen: boolean;
  editBatchOpen: boolean;
  editBatchId: string | null;
  deleteBatchOpen: boolean;
  deleteBatchId: string | null;

  // Feed
  addFeedOpen: boolean;
  editFeedOpen: boolean;
  editFeedId: string | null;
  deleteFeedOpen: boolean;
  deleteFeedId: string | null;

  // Orders
  addOrderOpen: boolean;
  editOrderOpen: boolean;
  editOrderId: string | null;
  deleteOrderOpen: boolean;
  deleteOrderId: string | null;

  // Transactions
  addTransactionOpen: boolean;
  editTransactionOpen: boolean;
  editTransactionId: string | null;

  // Actions
  setAddBatchOpen: (open: boolean) => void;
  setEditBatch: (open: boolean, id?: string | null) => void;
  setDeleteBatch: (open: boolean, id?: string | null) => void;

  setAddFeedOpen: (open: boolean) => void;
  setEditFeed: (open: boolean, id?: string | null) => void;
  setDeleteFeed: (open: boolean, id?: string | null) => void;

  setAddOrderOpen: (open: boolean) => void;
  setEditOrder: (open: boolean, id?: string | null) => void;
  setDeleteOrder: (open: boolean, id?: string | null) => void;

  setAddTransactionOpen: (open: boolean) => void;
  setEditTransaction: (open: boolean, id?: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  // Batches
  addBatchOpen: false,
  editBatchOpen: false,
  editBatchId: null,
  deleteBatchOpen: false,
  deleteBatchId: null,
  setAddBatchOpen: (open) => set({ addBatchOpen: open }),
  setEditBatch: (open, id = null) => set({ editBatchOpen: open, editBatchId: id ?? null }),
  setDeleteBatch: (open, id = null) => set({ deleteBatchOpen: open, deleteBatchId: id ?? null }),

  // Feed
  addFeedOpen: false,
  editFeedOpen: false,
  editFeedId: null,
  deleteFeedOpen: false,
  deleteFeedId: null,
  setAddFeedOpen: (open) => set({ addFeedOpen: open }),
  setEditFeed: (open, id = null) => set({ editFeedOpen: open, editFeedId: id ?? null }),
  setDeleteFeed: (open, id = null) => set({ deleteFeedOpen: open, deleteFeedId: id ?? null }),

  // Orders
  addOrderOpen: false,
  editOrderOpen: false,
  editOrderId: null,
  deleteOrderOpen: false,
  deleteOrderId: null,
  setAddOrderOpen: (open) => set({ addOrderOpen: open }),
  setEditOrder: (open, id = null) => set({ editOrderOpen: open, editOrderId: id ?? null }),
  setDeleteOrder: (open, id = null) => set({ deleteOrderOpen: open, deleteOrderId: id ?? null }),

  // Transactions
  addTransactionOpen: false,
  editTransactionOpen: false,
  editTransactionId: null,
  setAddTransactionOpen: (open) => set({ addTransactionOpen: open }),
  setEditTransaction: (open, id = null) => set({ editTransactionOpen: open, editTransactionId: id ?? null }),
}));

