import type { Metadata } from "next";
import { Mail, Newspaper, UserPlus } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { countPublishedPosts } from "@/lib/news/admin-queries";
import { countSignups } from "@/lib/signup/admin-queries";

export const metadata: Metadata = { title: "Overview" };

// TODO(007-contact): replace these hardcoded 0s with real counts once
// that feature lands — this page (002-foundation) only owns the final
// card layout. News (003) and Signups (004) are wired to real counts.
const MESSAGES_COUNT = 0;
const NEW_MESSAGES_COUNT = 0;

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [newsCount, signupsCount] = await Promise.all([countPublishedPosts(), countSignups()]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="News" value={newsCount} icon={Newspaper} />
        <StatCard
          title="Messages"
          value={MESSAGES_COUNT}
          icon={Mail}
          highlightCount={NEW_MESSAGES_COUNT}
          highlightLabel="new"
        />
        <StatCard title="Signups" value={signupsCount} icon={UserPlus} />
      </div>
    </div>
  );
}
