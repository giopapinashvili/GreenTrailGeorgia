import { useState } from 'react'
import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  text?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

export default function Confirm({ open, title, text, confirmLabel = 'დადასტურება', danger, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>გაუქმება</button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); onClose() } finally { setBusy(false) } }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {text && <p className="text-ink-2">{text}</p>}
    </Modal>
  )
}
