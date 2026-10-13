import 'i18next'
import type en from './en.json'

// Types every `t('…')` key against en.json: an unknown key is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
    returnNull: false
  }
}
