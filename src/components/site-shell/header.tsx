import { Logo } from "./logo";
import { NavDesktop } from "./nav-desktop";
import { NavMobile } from "./nav-mobile";
import { HeaderFrame } from "./header-frame";
import { SearchBox } from "./search-box";

// Sticky at every width, one fixed height, transparent over the home hero
// and solid elsewhere — see HeaderFrame. The nav sits in the middle column of
// a 1fr/auto/1fr grid so it is centred on the page, not between the logo and
// the search icon.
export function Header() {
  return (
    <HeaderFrame>
      <div className="relative mx-auto flex h-full max-w-(--container-max-width) items-center justify-between gap-6 px-(--container-gutter-x) lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <NavDesktop />
        <div className="hidden justify-self-end lg:block">
          <SearchBox />
        </div>
        <NavMobile />
      </div>
    </HeaderFrame>
  );
}
