import type { AuthUser } from "@/types/auth";

/**
 * 운영 DB 도입 시 구현할 사용자 저장소 경계입니다.
 * 현재 단계에서는 사용자를 세션에만 보관하므로 구현체를 연결하지 않습니다.
 */
export interface UserRepository {
  findByGoogleSub(googleSub: string): Promise<AuthUser | null>;
  save(user: AuthUser): Promise<AuthUser>;
}
