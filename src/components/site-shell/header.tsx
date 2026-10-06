import type { ContactInfo } from "@/content/site-shell";
import { Logo } from "./logo";
import { NavDesktop } from "./nav-desktop";
import { NavMobile } from "./nav-mobile";
import { TopBar } from "./top-bar";
import { HeaderFrame, HeaderTopBarCollapse } from "./header-scroll-collapse";
import { SearchBox } from "./search-box";

// Reference behavior, read from the <html> classes captured in every
// research/tokens/home-*.json sample: "fusion-sticky-header
// no-tablet-sticky-header no-mobile-sticky-header avada-sticky-shrinkage"
// — sticky positioning with a shrink-on-scroll header at desktop only; the
// header scrolls away normally below the lg breakpoint (FR-016). On scroll the
// yellow top bar slides away and the white bar slims down (smaller logo, the
// taglines under the main links fade out), continuously with the scroll.
export function Header({ contact }: { contact: ContactInfo }) {
  return (
    <HeaderFrame>
      <HeaderTopBarCollapse>
        <TopBar contact={contact} />
      </HeaderTopBarCollapse>
      <div className="relative mx-auto flex max-w-(--container-max-width) items-center justify-between gap-6 px-(--container-gutter-x) py-5 lg:py-[calc(1.25rem-0.75rem*var(--shrink,0))]">
        <Logo />
        <div className="flex flex-1 items-center justify-end gap-3">
          <NavDesktop />
          <div className="hidden lg:block">
            <SearchBox />
          </div>
        </div>
        <NavMobile />
      </div>
    </HeaderFrame>
  );
}
