import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-10">
        <Logo />
      </div>
      <div className="card w-full max-w-sm p-6 sm:p-8">{children}</div>
    </main>
  );
}
