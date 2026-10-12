import { Logo } from "./logo";
import { NavDesktop } from "./nav-desktop";
import { NavMobile } from "./nav-mobile";
import { HeaderFrame } from "./header-frame";
import { SearchBox } from "./search-box";
import { navigationItems } from "@/content/site-shell";
import { resolveAboutView } from "@/lib/about/resolve-view";
import { aboutNavChildren } from "@/lib/about/view";
import { buildSearchIndex } from "@/lib/site-search";

// Sticky at every width, one fixed height, transparent over the home hero
// and solid elsewhere — see HeaderFrame. The nav sits in the middle column of
// a 1fr/auto/1fr grid so it is centred on the page, not between the logo and
// the search icon.
// The About entries come from the same view as the About page (017), so the
// menu, the search and the page always agree on which sections exist.
export async function Header() {
  const view = await resolveAboutView();
  const items = navigationItems.map((item) =>
    item.href === "/about" ? { ...item, children: aboutNavChildren(view) } : item,
  );
  const index = buildSearchIndex(items);
  return (
    <HeaderFrame>
      <div className="relative mx-auto flex h-full max-w-(--container-max-width) items-center justify-between gap-6 px-(--container-gutter-x) lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <NavDesktop items={items} />
        <div className="hidden justify-self-end lg:block">
          <SearchBox index={index} />
        </div>
        <NavMobile items={items} searchIndex={index} />
      </div>
    </HeaderFrame>
  );
}
