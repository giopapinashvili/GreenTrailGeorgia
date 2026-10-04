// Suggested model names per AI provider (checked October 2026; the admin can type any other model id).
export type AiProvider = 'none' | 'anthropic' | 'openai' | 'gemini'

export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: 'none', label: 'გამორთული (მხოლოდ ჭკვიანი ფილტრი)' },
  { id: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
]

export const AI_MODEL_SUGGESTIONS: Record<AiProvider, string[]> = {
  none: [],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-5-5', 'claude-opus-5-5'],
  openai: ['gpt-5.4-mini', 'gpt-5.5', 'gpt-4.1-mini'],
  gemini: ['gemini-3.8-flash', 'gemini-3.7-flash'],
}

export const AI_KEY_HELP: Record<Exclude<AiProvider, 'none'>, string> = {
  anthropic: 'console.anthropic.com → API Keys',
  openai: 'platform.openai.com → API keys',
  gemini: 'aistudio.google.com → Get API key',
}
