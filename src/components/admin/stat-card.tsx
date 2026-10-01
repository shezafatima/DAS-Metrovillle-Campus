import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format-count";

interface StatCardProps {
  title: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  /** Shown as a yellow "highlight" badge next to the value when > 0 — e.g. unread messages. */
  highlightCount?: number;
  highlightLabel?: string;
}

export function StatCard({ title, value, icon: Icon, highlightCount, highlightLabel }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent className="flex items-baseline gap-2">
        <span className="font-bold text-3xl text-foreground">{value}</span>
        {!!highlightCount && highlightCount > 0 && (
          <Badge variant="highlight">
            {formatCount(highlightCount)} {highlightLabel ?? "new"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
