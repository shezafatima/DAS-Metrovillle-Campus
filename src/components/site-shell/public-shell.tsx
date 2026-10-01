import { SkipLink } from "@/components/site-shell/skip-link";
import { Header } from "@/components/site-shell/header";
import { Footer } from "@/components/site-shell/footer";
import { getContactDetails } from "@/lib/contact-details";

/**
 * The public site's chrome — skip link, header (top bar + nav), the
 * shared <main>, and footer. Extracted out of the root layout
 * (specs/002-foundation/research.md §3) so the admin area, which has no
 * das.edu.pk counterpart and none of this chrome, can share the same
 * root layout without inheriting it.
 *
 * Since 005 it reads the contact details (the social links shown in the top
 * bar and footer) from Settings once, and hands them down. That read is
 * cached and never throws, so the shell always renders.
 */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const contact = await getContactDetails();
  return (
    <>
      <SkipLink />
      <Header contact={contact} />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer contact={contact} />
    </>
  );
}
