import { redirect } from "next/navigation";
import { getAuthenticatedDestination } from "@/lib/auth/require-user";

export default async function HomePage() {
  redirect(await getAuthenticatedDestination());
}
