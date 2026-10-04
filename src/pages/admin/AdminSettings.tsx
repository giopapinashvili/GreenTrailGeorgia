import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
import Field from '../../components/ui/Field'
import Confirm from '../../components/ui/Confirm'
import { useToast } from '../../components/ui/Toast'
import { AI_KEY_HELP, AI_MODEL_SUGGESTIONS, AI_PROVIDERS, type AiProvider } from '../../lib/aiModels'
import { supabase, errorText } from '../../lib/supabase'
import { usePageTitle } from '../../lib/title'

interface AiSettings { provider: AiProvider | null; model: string | null; key_set: boolean; key_hint: string | null }

export default function AdminSettings() {
  usePageTitle('AI პარამეტრები — ადმინი')
  const qc = useQueryClient()
  const toast = useToast()
  const settings = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ai_settings')
      if (error) throw error
      return data as AiSettings
    },
  })
  const [provider, setProvider] = useState<AiProvider>('none')
  const [model, setModel] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [clear, setClear] = useState(false)

  useEffect(() => {
    if (!settings.data) return
    setProvider((settings.data.provider as AiProvider) ?? 'none')
    setModel(settings.data.model ?? '')
  }, [settings.data])

  const save = async () => {
    if (provider !== 'none' && !model.trim()) return toast('მიუთითე მოდელი.', 'error')
    if (provider !== 'none' && !key.trim() && !settings.data?.key_set) return toast('ჩაწერე API გასაღები.', 'error')
    setBusy(true)
    const { error } = await supabase.rpc('set_ai_settings', { p_provider: provider, p_model: model.trim(), p_key: key.trim() || null })
    setBusy(false)
    if (error) return toast(errorText(error), 'error')
    setKey('')
    qc.invalidateQueries({ queryKey: ['ai-settings'] })
    toast('შენახულია.')
  }
  const clearKey = async () => {
    const { error } = await supabase.rpc('clear_ai_key')
    if (error) { toast(errorText(error), 'error'); return }
    qc.invalidateQueries({ queryKey: ['ai-settings'] })
    toast('გასაღები წაიშალა.')
  }

  const s = settings.data
  return (
    <div className="max-w-2xl">
      <h1 className="text-[26px]">AI დამგეგმავი</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">
        დამგეგმავი ყოველთვის მუშაობს ჩაშენებული ფილტრით (დღეები, სირთულე, სეზონი, რეგიონი). AI დამატებით ადგენს დღეების გეგმას და რჩევებს — მხოლოდ საიტის მარშრუტებიდან.
      </p>

      <div className="card mt-6 grid gap-5 p-5">
        <div className="flex items-center gap-2 text-[14px]">
          <ShieldCheck size={18} className={s?.key_set ? 'text-easy' : 'text-ink-3'} />
          {settings.isLoading ? '…' : s?.key_set ? <>გასაღები შენახულია <span className="font-mono text-ink-3">{s.key_hint}</span></> : 'გასაღები ჯერ არ არის.'}
        </div>
        <Field label="პროვაიდერი">
          <select value={provider} onChange={(e) => { const p = e.target.value as AiProvider; setProvider(p); if (!model || !AI_MODEL_SUGGESTIONS[p].includes(model)) setModel(AI_MODEL_SUGGESTIONS[p][0] ?? '') }} className="input">
            {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        {provider !== 'none' && (
          <>
            <Field label="მოდელი" hint="იაფი და სწრაფი მოდელი სრულიად საკმარისია.">
              <input value={model} onChange={(e) => setModel(e.target.value)} list="ai-models" className="input font-mono text-[13.5px]" />
              <datalist id="ai-models">{AI_MODEL_SUGGESTIONS[provider].map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="API გასაღები" hint={<>სად აიღო: {AI_KEY_HELP[provider]}. ცარიელი დატოვე, თუ ძველი გასაღები არ იცვლება.</>}>
              <div className="relative">
                <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" className="input pl-9 font-mono text-[13.5px]" placeholder={s?.key_set ? '•••••••• (შენახულია)' : 'sk-…'} />
              </div>
            </Field>
          </>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {s?.key_set && <button onClick={() => setClear(true)} className="btn-danger mr-auto">გასაღების წაშლა</button>}
          <button onClick={save} disabled={busy} className="btn-primary">{busy && <LoaderCircle size={16} className="animate-spin" />} შენახვა</button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4 text-[13.5px] leading-relaxed text-ink-2">
        <p className="font-semibold text-ink">როგორ არის დაცული</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>გასაღები ინახება მხოლოდ მონაცემთა ბაზაში და მას მხოლოდ სერვერის ფუნქცია კითხულობს — ბრაუზერამდე არასდროს მიდის.</li>
          <li>AI-ის გამოყენება მხოლოდ შესულ მომხმარებლებს შეუძლიათ, დღეში 15 გეგმამდე თითოეულს.</li>
          <li>თუ AI არ პასუხობს ან გამორთულია, დამგეგმავი ჩაშენებული ფილტრით აგრძელებს მუშაობას.</li>
        </ul>
      </div>
      <Confirm open={clear} onClose={() => setClear(false)} title="გასაღების წაშლა?" text="AI დამგეგმავი გაითიშება, სანამ ახალ გასაღებს არ ჩაწერ." confirmLabel="წაშლა" danger onConfirm={clearKey} />
    </div>
  )
}
