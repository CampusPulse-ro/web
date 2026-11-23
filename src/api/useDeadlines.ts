import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Deadline } from './client'

const deadlinesKey = ['me', 'deadlines'] as const

/** What the add and edit forms send. `course` and `notes` are '' when left empty. */
export interface DeadlineInput {
  title: string
  course: string
  dueAt: string
  notes: string
}

/** `GET /me/deadlines`: the student's own deadlines, by due date. */
export function useDeadlines() {
  return useQuery({
    queryKey: deadlinesKey,
    queryFn: async ({ signal }) => unwrap(await api.GET('/me/deadlines', { signal })),
  })
}

/** `POST /me/deadlines`. */
export function useCreateDeadline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeadlineInput) =>
      unwrap(
        await api.POST('/me/deadlines', {
          body: {
            title: input.title,
            dueAt: input.dueAt,
            course: input.course || null,
            notes: input.notes || null,
          },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deadlinesKey }),
  })
}

/** `PATCH /me/deadlines/{id}` with every field ('' clears the course or notes). */
export function useUpdateDeadline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DeadlineInput }) =>
      unwrap(
        await api.PATCH('/me/deadlines/{id}', {
          params: { path: { id } },
          body: input,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deadlinesKey }),
  })
}

/** `PATCH /me/deadlines/{id}` `{ done }`, shown at once and put back if the API refuses it. */
export function useSetDeadlineDone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) =>
      unwrap(await api.PATCH('/me/deadlines/{id}', { params: { path: { id } }, body: { done } })),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: deadlinesKey })
      queryClient.setQueryData<Deadline[]>(deadlinesKey, (list) =>
        list?.map((item) => (item.id === id ? { ...item, done } : item)),
      )
    },
    // Only this item goes back: other rows ticked meanwhile keep their change.
    onError: (_err, { id, done }) => {
      queryClient.setQueryData<Deadline[]>(deadlinesKey, (list) =>
        list?.map((item) => (item.id === id ? { ...item, done: !done } : item)),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: deadlinesKey }),
  })
}

/** `DELETE /me/deadlines/{id}`. */
export function useDeleteDeadline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.DELETE('/me/deadlines/{id}', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deadlinesKey }),
  })
}
