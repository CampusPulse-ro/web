import { useMutation, useQuery } from '@tanstack/react-query'
import { updateUser } from '../auth/session'
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
 * `DELETE /me`: the account and everything in it. The API ends its sessions too: the caller signs
 * this device out right after (`accountDeleted()`), once it has moved off any page that needs one.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await api.DELETE('/me'))
    },
  })
}
