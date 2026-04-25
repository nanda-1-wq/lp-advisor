const isDev = import.meta.env.DEV
export const API_BASE = isDev
  ? ''
  : 'https://lp-advisor-production.up.railway.app'
