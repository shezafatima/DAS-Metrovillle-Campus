import type { LucideIcon } from "lucide-react";
import { FORM_FIELD_ICON_CLASS } from "./public-form-styles";

/**
 * Puts a decorative icon on the left inside a field. The icon is `aria-hidden` and ignores the pointer, so it is
 * never a control and a click on it reaches the input. The input must use FORM_INPUT_ICON_CLASS so its text
 * starts after the icon.
 */
export function IconInput({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <Icon aria-hidden="true" focusable="false" className={FORM_FIELD_ICON_CLASS} />
    </div>
  );
}
