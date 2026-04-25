console.log('API_BASE:', import.meta.env.VITE_API_URL, 'DEV:', import.meta.env.DEV)
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)
  ?? (import.meta.env.DEV ? '' : 'https://lp-advisor-production.up.railway.app')
