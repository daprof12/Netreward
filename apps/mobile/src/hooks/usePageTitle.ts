import { useEffect } from 'react';

const APP_NAME = 'NetReward';

/**
 * Sets the browser tab title.
 * Usage: usePageTitle('Dashboard') → "Dashboard | NetReward"
 *        usePageTitle()             → "NetReward"
 */
export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    const title = pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME;
    document.title = title;
    return () => {
      document.title = APP_NAME; // reset on unmount
    };
  }, [pageTitle]);
}
