import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = '確認',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-elevation-3 p-6 w-full max-w-[320px] space-y-4">
        {title && <h3 className="headline text-center">{title}</h3>}
        <p className="body text-center">{message}</p>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-primary flex-1" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
} 