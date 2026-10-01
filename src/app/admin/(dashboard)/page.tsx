import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Newspaper, UserPlus } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { requireAdminPage } from "@/lib/dal";
import { canAccess } from "@/lib/permissions";
import { countPublishedPosts } from "@/lib/news/admin-queries";
import { countSignups } from "@/lib/signup/admin-queries";
import { countMessages } from "@/lib/messages/admin-queries";
import { countNewSignups } from "@/lib/notifications/queries";
import { accessCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Overview" };

// News, Messages and Signups are all wired to real counts.
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  const session = await requireAdminPage("any");
  const params = await searchParams;
  const denied = params.denied === "1";

  // 011 FR-010: only the sections this user may use are shown — and only
  // their counts are queried, so nothing about the others is read at all.
  const showNews = canAccess(session, "news");
  const showMessages = canAccess(session, "messages");
  const showSignups = canAccess(session, "careers");

  const [newsCount, messages, signupsCount, signupsNew] = await Promise.all([
    showNews ? countPublishedPosts() : 0,
    showMessages ? countMessages() : { total: 0, new: 0 },
    showSignups ? countSignups() : 0,
    showSignups ? countNewSignups(session.userId) : 0,
  ]);

  const hasAnyCard = showNews || showMessages || showSignups;

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
          {showSignups && (
            <StatCard
              title="Signups"
              value={signupsCount}
              icon={UserPlus}
              highlightCount={signupsNew}
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
