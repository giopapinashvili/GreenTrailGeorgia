import { useEffect } from 'react'
import { SITE_NAME } from './config'

/** Sets the browser tab title for the current page. */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — სალაშქრო მარშრუტები საქართველოში`
  }, [title])
}
