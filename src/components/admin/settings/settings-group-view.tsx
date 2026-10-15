import { settingsCopy } from "@/content/admin";
import type { AdminSettings } from "@/lib/settings/admin";
import { GROUPS } from "@/lib/settings/registry";
import type { GroupKey } from "@/lib/settings/types";
import { SettingsGroupForm } from "./settings-group-form";

/**
 * The body shared by the settings group pages: heading, description, an
 * optional status line (020: what the public sees now) and the generated
 * form. It is not an access gate; every page calls
 * `requireAdminPage("settings")` itself before loading the data it passes here.
 */
export function SettingsGroupView({ group, initial, status }: { group: GroupKey; initial: AdminSettings; status?: string }) {
  const copy = settingsCopy.groups[group];
  return (
    <section aria-labelledby="settings-group-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="settings-group-title" className="font-bold text-foreground text-xl">
          {copy.title}
        </h2>
        <p className="font-light text-muted-foreground text-sm">{copy.description}</p>
        {status && (
          <p role="status" data-testid="settings-status" className="font-semibold text-foreground text-sm">
            {status}
          </p>
        )}
      </div>
      <SettingsGroupForm key={initial.version} definition={GROUPS[group]} initial={initial} />
    </section>
  );
}
