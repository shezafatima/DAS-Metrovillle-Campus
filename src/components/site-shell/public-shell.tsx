import { SkipLink } from "@/components/site-shell/skip-link";
import { Header } from "@/components/site-shell/header";
import { Footer } from "@/components/site-shell/footer";
import { getContactDetails } from "@/lib/contact-details";
import { getPublicSettings } from "@/lib/settings/public";

/**
 * The public site's chrome — skip link, header (nav), the
 * shared <main>, and footer. Extracted out of the root layout
 * (specs/002-foundation/research.md §3) so the admin area, which has no
 * das.edu.pk counterpart and none of this chrome, can share the same
 * root layout without inheriting it.
 *
 * Since 005 it reads the contact details (the social links shown in the top
 * bar and footer) from Settings once, and hands them down. Since 014b it also
 * reads the footer's Portal Links. Both reads are cached and never throw, so
 * the shell always renders.
 */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const [contact, portal] = await Promise.all([getContactDetails(), getPublicSettings("portalLinks")]);
  // Header is async since 017 (its About entries come from the About view); awaiting it here keeps the shell testable.
  const header = await Header();
  return (
    <>
      <SkipLink />
      {header}
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer contact={contact} portalLinks={portal.links} />
    </>
  );
}
