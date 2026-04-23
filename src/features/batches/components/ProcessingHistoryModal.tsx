'use client';

import Modal from '@/components/ui/Modal';
import ProcessingHistoryTable from './ProcessingHistoryTable';

interface ProcessingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId?: string | null;
}

export default function ProcessingHistoryModal({ isOpen, onClose, batchId }: ProcessingHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Processing History">
      <div className="p-1">
        <div className="max-h-[60vh] overflow-auto">
          <ProcessingHistoryTable batchId={batchId} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
