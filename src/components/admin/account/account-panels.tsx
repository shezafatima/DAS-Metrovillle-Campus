"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/admin/account/change-password-form";
import { SignOutOthersCard } from "@/components/admin/account/sign-out-others-card";
import { accountCopy } from "@/content/admin";

/**
 * Holds "Password last changed" so a successful change updates it
 * without a reload (010 US2 sc.2). No password data ever reaches here.
 *
 * 011: the main admin controls every password (Constitution III), so only
 * a main admin gets the change-password form. A content manager sees a note
 * instead; the server refuses the action for them too, so hiding the form is
 * presentation, not the protection.
 */
export function AccountPanels({
  email,
  initialLastChangedAt,
  canChangePassword,
}: {
  email: string;
  initialLastChangedAt: string | null;
  canChangePassword: boolean;
}) {
  const [lastChangedAt, setLastChangedAt] = useState(initialLastChangedAt);
  return (
    <>
      {canChangePassword ? (
        <ChangePasswordForm email={email} onPasswordChanged={setLastChangedAt} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{accountCopy.passwordManagedByAdmin.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="password-managed-by-admin" className="font-body text-foreground text-sm">
              {accountCopy.passwordManagedByAdmin.body}
            </p>
          </CardContent>
        </Card>
      )}
      <SignOutOthersCard lastChangedAt={lastChangedAt} />
    </>
  );
}
