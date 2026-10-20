import type { AdmissionWindowState } from "@/lib/admission/window";
import { formatAdmissionDate } from "@/lib/admission/window";

/**
 * Above the procedure (020 FR-014, FR-015): while admissions are open, a
 * highlighted banner (navy on the brand yellow) with the admin's announcement
 * and the closing date; while closed (or not yet open), the closed message as
 * a quiet note, or nothing at all.
 */
export function AdmissionWindowNotice({
  state,
  announcement,
  closedMessage,
  closesOnLine,
}: {
  state: AdmissionWindowState;
  announcement: string;
  closedMessage: string;
  /** "Applications close on {date}" (content file). */
  closesOnLine: (date: string) => string;
}) {
  if (state.kind === "open") {
    return (
      <div role="status" data-testid="admission-banner" className="flex flex-col items-center gap-1 bg-topbar px-(--container-gutter-x) py-4 text-center">
        {announcement && <p className="font-bold font-heading text-lg text-primary">{announcement}</p>}
        <p className="font-body text-body text-primary">{closesOnLine(formatAdmissionDate(state.closesOn))}</p>
      </div>
    );
  }
  if (!closedMessage) return null;
  return (
    <p data-testid="admission-closed-note" className="text-center font-body text-body text-text-muted">
      {closedMessage}
    </p>
  );
}
