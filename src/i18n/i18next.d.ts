import 'i18next'
import type en from './en.json'

// Types every `t('…')` key against en.json: an unknown key is a compile error. strictKeyChecks keeps
// that true when a fallback text is passed (`t('x', 'Fallback')` or `{ defaultValue }`), which i18next
// otherwise accepts for any key.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
    returnNull: false
    strictKeyChecks: true
  }
}
