import { notFound } from "next/navigation";
import type { User } from "@/types/workspace";

export const SUPER_ADMIN_EMAIL="alab01bella@gmail.com";
export const normalizeAccountEmail=(value:string)=>value.trim().toLowerCase();
export const isSuperAdminEmail=(email:string)=>normalizeAccountEmail(email)===SUPER_ADMIN_EMAIL;

export function requireSuperAdminUser<T extends Pick<User,"email">>(user:T):T{
  if(!isSuperAdminEmail(user.email))notFound();
  return user;
}
