import Link from "next/link";
import { RegistrationStatusControl } from "@/components/admin/registrations/status-control";
import { DeleteRegistrationButton } from "@/components/admin/registrations/delete-registration-button";
import { registrationsAdminCopy } from "@/content/admin";
import { registrationCopy } from "@/content/registration";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { formatPhoneLocal } from "@/lib/phone";
import type { RegistrationDetail as Detail } from "@/lib/registration/admin-queries";
import { isRtlScript } from "@/lib/rtl-text";

const copy = registrationsAdminCopy.detail;
const labels = copy.labels;

/** Free text as the person typed it: line breaks kept, shown as text, Urdu in its own font. */
function Text({ value }: { value: string }) {
  return (
    <span dir="auto" className={`whitespace-pre-wrap break-words ${isRtlScript(value) ? "font-body-urdu" : ""}`}>
      {value}
    </span>
  );
}

function Item({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="font-light text-muted-foreground text-sm">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Phone({ e164 }: { e164: string | null }) {
  if (!e164) return <span className="text-muted-foreground">{copy.none}</span>;
  return (
    <a href={`tel:${e164}`} className="text-primary hover:underline">
      {formatPhoneLocal(e164)}
    </a>
  );
}

function Section({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="mb-3 font-bold text-foreground text-lg">
        {title}
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function historyLine(entry: Detail["history"][number]): string {
  const status = (key: string | null) => (key ? registrationCopy.statusLabels[key as keyof typeof registrationCopy.statusLabels] : "");
  if (entry.action === "status") return copy.historyStatus(status(entry.from), status(entry.to), entry.byEmail);
  if (entry.action === "deleted") return copy.historyDeleted(entry.byEmail);
  return copy.historyRestored(entry.byEmail);
}

/**
 * One registration, every field. Health information is its own headed,
 * visibly distinct block (FR-036). Everything is rendered as text, never as
 * markup. Only the main admin reaches this page.
 */
export function RegistrationDetail({ registration: r }: { registration: Detail }) {
  const sections = copy.sections;
  const tongue =
    r.motherTongue === "other" && r.motherTongueOther
      ? `${registrationCopy.motherTongueOptions.other}: ${r.motherTongueOther}`
      : registrationCopy.motherTongueOptions[r.motherTongue];

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/admin/registrations" className="text-primary text-sm hover:underline">
        {copy.back}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 dir="auto" className={`font-bold text-2xl text-foreground ${isRtlScript(r.studentName) ? "font-body-urdu" : ""}`}>
          {r.studentName}
        </h1>
        <span className="font-mono text-muted-foreground text-sm">{r.reference}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RegistrationStatusControl key={r.status} id={r.id} status={r.status} />
        <DeleteRegistrationButton id={r.id} reference={r.reference} />
      </div>

      <Section id="reg-student" title={sections.student}>
        <Item label={labels.studentName}>
          <Text value={r.studentName} />
        </Item>
        <Item label={labels.dateOfBirth}>{r.dateOfBirth}</Item>
        <Item label={labels.className}>
          <Text value={r.className} />
        </Item>
        <Item label={labels.motherTongue}>
          <Text value={tongue} />
        </Item>
      </Section>

      <Section id="reg-parents" title={sections.parents}>
        <Item label={labels.fatherName}>
          <Text value={r.fatherName} />
        </Item>
        <Item label={labels.motherName}>
          <Text value={r.motherName} />
        </Item>
        <Item label={labels.fatherMobile}>
          <Phone e164={r.fatherMobile} />
        </Item>
        <Item label={labels.motherMobile}>
          <Phone e164={r.motherMobile} />
        </Item>
      </Section>

      <Section id="reg-contact" title={sections.contact}>
        <Item label={labels.email}>
          <a href={`mailto:${r.email}`} className="text-primary hover:underline">
            {r.email}
          </a>
        </Item>
        <Item label={labels.emergencyPhone}>
          <Phone e164={r.emergencyPhone} />
        </Item>
        {r.emergencyLegacyName && (
          <Item label={labels.emergencyLegacyName}>
            <Text value={r.emergencyLegacyName} />
          </Item>
        )}
        <Item label={labels.address} wide>
          <Text value={r.address} />
        </Item>
      </Section>

      <Section id="reg-health" title={sections.health} className="rounded-lg border-2 border-primary bg-card p-4">
        <Item label={labels.vaccinated}>{r.vaccinated ? copy.yes : copy.no}</Item>
        <Item label={labels.medicalHistory} wide>
          {r.medicalHistory ? <Text value={r.medicalHistory} /> : <span className="text-muted-foreground">{copy.none}</span>}
        </Item>
      </Section>

      <Section id="reg-reference" title={sections.reference}>
        {r.referenceStudent ? (
          <>
            <Item label={labels.referenceName}>
              <Text value={r.referenceStudent.name} />
            </Item>
            <Item label={labels.referenceClass}>
              <Text value={r.referenceStudent.className} />
            </Item>
            <Item label={labels.referenceRelation}>
              <Text value={r.referenceStudent.relation} />
            </Item>
          </>
        ) : (
          <Item label={labels.referenceName}>
            <span className="text-muted-foreground">{copy.none}</span>
          </Item>
        )}
      </Section>

      <Section id="reg-remarks" title={sections.remarks}>
        <Item label={labels.remarks} wide>
          {r.remarks ? <Text value={r.remarks} /> : <span className="text-muted-foreground">{copy.none}</span>}
        </Item>
      </Section>

      <Section id="reg-record" title={sections.record}>
        <Item label={labels.reference}>
          <span className="font-mono">{r.reference}</span>
        </Item>
        <Item label={labels.status}>{registrationCopy.statusLabels[r.status]}</Item>
        <Item label={labels.submittedAt}>{formatAdminDateTime(new Date(r.submittedAt))}</Item>
        <Item label={labels.consentAt}>{formatAdminDateTime(new Date(r.consentAt))}</Item>
        <Item label={labels.duplicate} wide>
          {r.likelyDuplicate ? copy.duplicateYes : copy.duplicateNo}
        </Item>
      </Section>

      <section aria-labelledby="reg-history">
        <h2 id="reg-history" className="mb-3 font-bold text-foreground text-lg">
          {sections.history}
        </h2>
        {r.history.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.noHistory}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm" data-testid="registration-history">
            {r.history.map((entry, index) => (
              <li key={index}>
                <span className="text-muted-foreground">{formatAdminDateTime(new Date(entry.at))}</span> · {historyLine(entry)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
