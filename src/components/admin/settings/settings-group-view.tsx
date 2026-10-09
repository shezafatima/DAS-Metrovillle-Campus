import { settingsCopy } from "@/content/admin";
import type { AdminSettings } from "@/lib/settings/admin";
import { GROUPS } from "@/lib/settings/registry";
import type { GroupKey } from "@/lib/settings/types";
import { SettingsGroupForm } from "./settings-group-form";

/**
 * The body shared by the five group pages: heading, description and the
 * generated form. It is not an access gate; every page calls
 * `requireAdminPage("settings")` itself before loading the data it passes here.
 */
export function SettingsGroupView({ group, initial }: { group: GroupKey; initial: AdminSettings }) {
  const copy = settingsCopy.groups[group];
  return (
    <section aria-labelledby="settings-group-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="settings-group-title" className="font-bold text-foreground text-xl">
          {copy.title}
        </h2>
        <p className="font-light text-muted-foreground text-sm">{copy.description}</p>
      </div>
      <SettingsGroupForm key={initial.version} definition={GROUPS[group]} initial={initial} />
    </section>
  );
}
