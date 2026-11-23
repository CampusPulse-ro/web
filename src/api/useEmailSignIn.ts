import { useMutation } from '@tanstack/react-query'
import { startSession } from '../auth/session'
import type { Language } from '../i18n'
import { api, unwrap } from './client'

/** `POST /auth/email/start`: emails a 6-digit code (always 202 for a valid address). */
export function useSendEmailCode() {
  return useMutation({
    mutationFn: async ({ email, language }: { email: string; language: Language }) =>
      unwrap(await api.POST('/auth/email/start', { body: { email, language } })),
  })
}

/** `POST /auth/email/verify`: signs in with the code (creating the account the first time). */
export function useVerifyEmailCode() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const tokens = unwrap(await api.POST('/auth/email/verify', { body: { email, code } }))
      await startSession(tokens)
      return tokens
    },
  })
}
