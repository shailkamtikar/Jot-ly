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
      <p className="mb-6 text-[0.95rem] leading-relaxed text-muted">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" data-autofocus onClick={onCancel} className="label rounded-[3px] border border-line-strong px-4 py-2.5 transition-colors hover:bg-sunken">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`label rounded-[3px] px-4 py-2.5 transition-[filter] hover:brightness-110 ${danger ? 'bg-danger text-[#fff]' : 'bg-accent text-accent-fg'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
