import type { ContactInfo } from "@/content/site-shell";
import { Logo } from "./logo";
import { NavDesktop } from "./nav-desktop";
import { NavMobile } from "./nav-mobile";
import { TopBar } from "./top-bar";
import { HeaderScrollCollapse } from "./header-scroll-collapse";
import { SearchBox } from "./search-box";

// Reference behavior, read from the <html> classes captured in every
// research/tokens/home-*.json sample: "fusion-sticky-header
// no-tablet-sticky-header no-mobile-sticky-header avada-sticky-shrinkage"
// — sticky positioning with a shrink-on-scroll top bar at desktop only; the
// header scrolls away normally below the lg breakpoint (FR-016).
export function Header({ contact }: { contact: ContactInfo }) {
  return (
    <header className="z-30 border-b border-neutral-100 bg-surface lg:sticky lg:top-0">
      <HeaderScrollCollapse>
        <TopBar contact={contact} />
      </HeaderScrollCollapse>
      <div className="relative mx-auto flex max-w-(--container-max-width) items-center justify-between gap-6 px-(--container-gutter-x) py-5">
        <Logo />
        <div className="flex flex-1 items-center justify-end gap-3">
          <NavDesktop />
          <div className="hidden lg:block">
            <SearchBox />
          </div>
        </div>
        <NavMobile />
      </div>
    </header>
  );
}
