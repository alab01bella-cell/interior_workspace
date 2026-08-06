import { redirect } from "next/navigation";
import { LoginLanding } from "@/components/auth/login-landing";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  return <LoginLanding error={error} />;
}
