"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutOthersButton } from "@/components/admin/account/sign-out-others-button";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { accountCopy } from "@/content/admin";

/** Password age + "Sign out other devices" (010 US2, FR-012/FR-013). */
export function SignOutOthersCard({ lastChangedAt }: { lastChangedAt: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{accountCopy.signOutOthers.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-body text-sm text-foreground">
          {accountCopy.lastChangedLabel}:{" "}
          <span data-testid="password-last-changed">
            {lastChangedAt ? formatAdminDateTime(new Date(lastChangedAt)) : accountCopy.lastChangedUnavailable}
          </span>
        </p>
        <SignOutOthersButton />
      </CardContent>
    </Card>
  );
}
