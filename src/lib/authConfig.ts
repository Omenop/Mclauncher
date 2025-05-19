export const MICROSOFT_CLIENT_ID    = process.env.MICROSOFT_CLIENT_ID!
export const MICROSOFT_CLIENT_SECRET= process.env.MICROSOFT_CLIENT_SECRET!
export const MICROSOFT_TENANT_ID    = process.env.MICROSOFT_TENANT_ID!
export const BASE_URL              = process.env.NEXT_PUBLIC_BASE_URL!
export const REDIRECT_URI          = `${BASE_URL}/api/auth/microsoft/callback`
export const MICROSOFT_SCOPES      = [
  'openid',
  'email',
  'offline_access',
  'XboxLive.signin', 
].join(' ')
