import type { Metadata } from "next";
import { Mail, Newspaper, UserPlus } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Overview" };

// TODO(003-news, 004-signup, 007-contact): replace these hardcoded 0s
// with real counts from the database once those features land — this
// page (002-foundation) only owns the final card layout, per the
// admin redesign brief ("the numbers come from the database in a
// later feature, so keep them at 0 with a clear TODO for now").
const NEWS_COUNT = 0;
const MESSAGES_COUNT = 0;
const NEW_MESSAGES_COUNT = 0;
const SIGNUPS_COUNT = 0;

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="News" value={NEWS_COUNT} icon={Newspaper} />
        <StatCard
          title="Messages"
          value={MESSAGES_COUNT}
          icon={Mail}
          highlightCount={NEW_MESSAGES_COUNT}
          highlightLabel="new"
        />
        <StatCard title="Signups" value={SIGNUPS_COUNT} icon={UserPlus} />
      </div>
    </div>
  );
}
