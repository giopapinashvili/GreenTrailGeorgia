import { useState } from 'react'
import { Flag } from 'lucide-react'
import Modal from '../ui/Modal'
import { supabase, errorText } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useToast } from '../ui/Toast'
import type { Report } from '../../lib/types'

const REASONS = ['სპამი ან რეკლამა', 'შეურაცხყოფა ან სიძულვილი', 'არასწორი ან სახიფათო ინფორმაცია', 'სხვისი ფოტო ან პირადი ინფორმაცია', 'სხვა']

/** Small "report" link that opens a dialog; only for signed-in users. */
export default function ReportButton({ type, id, className = '', label = 'შეტყობინება' }: { type: Report['target_type']; id: string | number; className?: string; label?: string }) {
  const { user } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return null

  const send = async () => {
    setBusy(true)
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason
    const { error } = await supabase.from('reports').insert({ target_type: type, target_id: String(id), reason: text.slice(0, 1000) })
    setBusy(false)
    if (error) return toast(errorText(error), 'error')
    toast('მადლობა — მოდერატორი გადახედავს.')
    setOpen(false)
    setNote('')
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-hard ${className}`}>
        <Flag size={13} /> {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="რა არის პრობლემა?"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>გაუქმება</button>
            <button className="btn-primary" onClick={send} disabled={busy}>გაგზავნა</button>
          </>
        }
      >
        <div className="grid gap-2">
          {REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-[14px] hover:bg-surface-2">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[rgb(var(--forest))]" />
              {r}
            </label>
          ))}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={800} className="input mt-1" placeholder="დამატებითი დეტალები (არასავალდებულო)" />
        </div>
      </Modal>
    </>
  )
}
