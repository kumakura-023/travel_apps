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
      <div className="alert animate-spring">
        {title && <h3 className="alert-title">{title}</h3>}
        <p className="alert-message">{message}</p>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1 ease-ios-default duration-ios-fast" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-primary flex-1 ease-ios-default duration-ios-fast" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
} 