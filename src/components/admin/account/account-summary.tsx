import { Card, CardContent } from "@/components/ui/card";
import { accountCopy } from "@/content/admin";

/** The login email, read-only (010 FR-005) — it can only be changed with the setup command. */
export function AccountSummary({ email }: { email: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="font-body text-muted-foreground text-sm">{accountCopy.signedInAs}</span>
        <span className="break-all font-bold text-base text-foreground">{email}</span>
      </CardContent>
    </Card>
  );
}
