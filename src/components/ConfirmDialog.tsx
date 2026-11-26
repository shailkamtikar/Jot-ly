import { Modal } from './Modal'

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5 text-sm text-muted">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" data-autofocus onClick={onCancel} className="rounded-lg border border-line px-3.5 py-2 text-sm hover:bg-sunken">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium text-white ${danger ? 'bg-danger' : 'bg-accent text-accent-fg'}`}
          style={danger ? { color: '#fff' } : undefined}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
