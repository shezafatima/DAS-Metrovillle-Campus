import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/dal";
import { safeAdminReturnPath } from "@/lib/validation/return-path";
import { LoginForm } from "@/components/admin/login-form";
import { loginCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Login" };

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  // A logged-in admin visiting /admin/login goes straight to /admin
  // without seeing the form (FR-012).
  if (await getAdminSession()) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;
  const rawNext = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const next = safeAdminReturnPath(rawNext);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-neutral-100 p-8 shadow-card">
        <h1 className="font-heading text-h3 text-text">{loginCopy.title}</h1>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
