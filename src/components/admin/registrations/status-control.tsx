"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { registrationsAdminCopy } from "@/content/admin";
import { registrationCopy } from "@/content/registration";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/registration/rules";

/** The status select and its Save button. The parent keys it by status so a server-side change remounts it. */
export function RegistrationStatusControl({ id, status }: { id: string; status: RegistrationStatus }) {
  const router = useRouter();
  const [selected, setSelected] = useState<RegistrationStatus>(status);
  const [pending, setPending] = useState(false);
  const copy = registrationsAdminCopy.statusControl;

  async function save() {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: selected }),
      });
      if (response.ok) {
        toast({ title: copy.saved, type: "success" });
        router.refresh();
      } else {
        toast({ title: copy.failed, type: "error" });
      }
    } catch {
      toast({ title: copy.failed, type: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label={copy.label} value={selected} disabled={pending} onChange={(event) => setSelected(event.target.value as RegistrationStatus)} className="w-auto">
        {REGISTRATION_STATUSES.map((key) => (
          <option key={key} value={key}>
            {registrationCopy.statusLabels[key]}
          </option>
        ))}
      </Select>
      <Button type="button" disabled={pending || selected === status} onClick={save}>
        {copy.save}
      </Button>
    </div>
  );
}
