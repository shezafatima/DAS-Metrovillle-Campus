import Link from "next/link";
import { registrationCopy } from "@/content/registration";

/** The closed page body: the Settings message or the default line, and no form. */
export function RegistrationClosed({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p data-testid="registration-closed" className="font-body text-body text-foreground">
        {message || registrationCopy.closedDefault}
      </p>
      <Link href="/admission" className="font-body text-body text-primary underline underline-offset-4">
        {registrationCopy.closedLink}
      </Link>
    </div>
  );
}
