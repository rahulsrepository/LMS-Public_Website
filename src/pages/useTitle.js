import { useEffect } from 'react'

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · C2C Academy` : 'C2C Academy | Campus to Corporate'
  }, [title])
}
