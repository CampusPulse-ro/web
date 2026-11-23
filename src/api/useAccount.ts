import { useMutation, useQuery } from '@tanstack/react-query'
import { accountDeleted, updateUser } from '../auth/session'
import { api, unwrap } from './client'

/** `GET /me`, kept fresh on the account page (UPT may have been linked on another device). */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async ({ signal }) => {
      const me = unwrap(await api.GET('/me', { signal }))
      updateUser(me)
      return me
    },
  })
}

/** `DELETE /me/identities/upt-microsoft`, then the account as it is now. */
export function useUnlinkUpt() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await api.DELETE('/me/identities/upt-microsoft'))
      updateUser(unwrap(await api.GET('/me')))
    },
  })
}

/**
 * `DELETE /me`: the account and everything in it. The API ends its sessions too, so this device
 * signs out at once.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await api.DELETE('/me'))
    },
    onSuccess: () => accountDeleted(),
  })
}
