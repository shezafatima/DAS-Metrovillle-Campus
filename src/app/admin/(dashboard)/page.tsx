import type { Metadata } from "next";
import { Mail, Newspaper, UserPlus } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { countPublishedPosts } from "@/lib/news/admin-queries";
import { countSignups } from "@/lib/signup/admin-queries";
import { countMessages } from "@/lib/messages/admin-queries";

export const metadata: Metadata = { title: "Overview" };

// News, Messages and Signups are all wired to real counts; 011 owns any
// remaining overview work.
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [newsCount, signupsCount, messages] = await Promise.all([
    countPublishedPosts(),
    countSignups(),
    countMessages(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="News" value={newsCount} icon={Newspaper} />
        <StatCard
          title="Messages"
          value={messages.total}
          icon={Mail}
          highlightCount={messages.new}
          highlightLabel="new"
        />
        <StatCard title="Signups" value={signupsCount} icon={UserPlus} />
      </div>
    </div>
  );
}
