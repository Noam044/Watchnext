import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

/** Raccourci vers son propre profil. */
export default async function MyProfilePage() {
  const user = await requireUser();
  redirect(`/u/${user.handle}`);
}
