export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  authSecret: string;
  baseUrl: string;
}

export function getAuthConfig(): AuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const authSecret = process.env.AUTH_SECRET;
  const baseUrl = process.env.AUTH_URL?.replace(/\/$/, "");

  if (!clientId || !clientSecret || !authSecret || !baseUrl) {
    throw new Error("Google 인증 환경변수가 설정되지 않았습니다.");
  }
  if (authSecret.length < 32) {
    throw new Error("AUTH_SECRET은 32자 이상이어야 합니다.");
  }

  return { clientId, clientSecret, authSecret, baseUrl };
}
