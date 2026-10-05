import Link from "next/link";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { careersAdminCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { isRtlScript } from "@/lib/rtl-text";
import { DeleteApplicationButton } from "@/components/admin/careers/delete-application-button";
import type { CareerApplicationRow } from "@/lib/careers/admin-queries";

export interface ApplicationDetailProps {
  application: CareerApplicationRow;
  /** Only the main admin may delete (the route enforces it too); a content manager never sees the control. */
  canDelete: boolean;
}

/**
 * One application. The CV is offered only as a download link to the checked
 * route: it is never previewed or embedded here, so there is deliberately
 * no iframe, embed, object or image element anywhere in this component.
 */
export function ApplicationDetail({ application, canDelete }: ApplicationDetailProps) {
  const copy = careersAdminCopy.detail;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Link href="/admin/careers" className="text-primary text-sm hover:underline">
        {copy.back}
      </Link>

      <h1 dir="auto" className={`font-bold text-2xl text-foreground ${isRtlScript(application.name) ? "font-body-urdu" : ""}`}>
        {application.name}
      </h1>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.email}</dt>
          <dd>
            <a href={`mailto:${application.email}`} className="text-primary hover:underline">
              {application.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.phone}</dt>
          <dd>
            <a href={`tel:${application.phone}`} className="text-primary hover:underline">
              {application.phoneDisplay}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.qualification}</dt>
          <dd dir="auto" className={isRtlScript(application.qualification) ? "font-body-urdu" : ""}>
            {application.qualification}
          </dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.applied}</dt>
          <dd>{formatAdminDateTime(new Date(application.appliedAt))}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-light text-muted-foreground text-sm">{copy.cv}</dt>
          <dd className="flex flex-col gap-1">
            <a
              href={`/api/admin/careers/${application.id}/cv`}
              download
              className={buttonVariants({ variant: "outline", className: "w-fit" })}
            >
              <Download aria-hidden="true" />
              {copy.download}
            </a>
            <span className="font-light text-muted-foreground text-xs">{copy.downloadHint}</span>
          </dd>
        </div>
      </dl>

      {canDelete && (
        <div className="flex gap-2">
          <DeleteApplicationButton id={application.id} name={application.name} />
        </div>
      )}
    </div>
  );
}
