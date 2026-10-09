import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Mail, Newspaper } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { requireAdminPage } from "@/lib/dal";
import { canAccess } from "@/lib/permissions";
import { countPublishedPosts } from "@/lib/news/admin-queries";
import { countApplications } from "@/lib/careers/admin-queries";
import { countMessages } from "@/lib/messages/admin-queries";
import { countNewApplications } from "@/lib/notifications/queries";
import { accessCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Overview" };

// News, Messages and Applications are all wired to real counts.
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  const session = await requireAdminPage("any");
  const params = await searchParams;
  const denied = params.denied === "1";

  // 011 FR-010: only the sections this user may use are shown — and only
  // their counts are queried, so nothing about the others is read at all.
  const showNews = canAccess(session, "news");
  const showMessages = canAccess(session, "messages");
  const showApplications = canAccess(session, "careers");

  const [newsCount, messages, applicationsCount, applicationsNew] = await Promise.all([
    showNews ? countPublishedPosts() : 0,
    showMessages ? countMessages() : { total: 0, new: 0 },
    showApplications ? countApplications() : 0,
    showApplications ? countNewApplications(session.userId) : 0,
  ]);

  const hasAnyCard = showNews || showMessages || showApplications;

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">Overview</h1>

      {denied && (
        <div
          role="status"
          className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted px-4 py-3 text-foreground text-sm"
        >
          <span>{accessCopy.denied}</span>
          <Link href="/admin" className="font-bold underline">
            {accessCopy.dismiss}
          </Link>
        </div>
      )}

      {hasAnyCard ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showNews && <StatCard title="News" value={newsCount} icon={Newspaper} />}
          {showMessages && (
            <StatCard
              title="Messages"
              value={messages.total}
              icon={Mail}
              highlightCount={messages.new}
              highlightLabel="new"
            />
          )}
          {showApplications && (
            <StatCard
              title="Applications"
              value={applicationsCount}
              icon={Briefcase}
              highlightCount={applicationsNew}
              highlightLabel="new"
            />
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{accessCopy.noGrants}</p>
      )}
    </div>
  );
}
