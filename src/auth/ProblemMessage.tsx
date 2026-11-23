import { useTranslation } from 'react-i18next'
import type { AuthProblem } from './types'

/** The sentence for a failed UPT sign-in or link, plus Microsoft's own message when it gave one. */
export function ProblemMessage({ problem }: { problem: AuthProblem }) {
  const { t } = useTranslation()
  return (
    <>
      <span>{t(`signIn.problems.${problem.code}`)}</span>
      {problem.detail && (
        <span className="mt-1 block text-caption break-words text-ink-muted">{problem.detail}</span>
      )}
    </>
  )
}
