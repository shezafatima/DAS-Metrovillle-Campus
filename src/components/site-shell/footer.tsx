import Link from "next/link";
import { contactInfo, footerContent } from "@/content/site-shell";
import { SocialLinks } from "./social-links";

// The reference footer (confirmed directly by the user against the live
// site) is only this bottom bar — no columns, no quick-links row, no
// phone/email/address. See the comment on footerContent in
// src/content/site-shell.ts.
export function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-footer-bottom">
      <div className="mx-auto flex max-w-(--container-max-width) flex-wrap items-center justify-between gap-x-2 gap-y-2 px-(--container-gutter-x) py-4 font-body text-footer-link text-text">
        <p>
          © <Link href="/" className="text-primary hover:text-accent">{footerContent.bottomText}</Link>
          {" "}|{" "}
          All Rights Reserved{" "}|{" "}
          Crafted Excellence with <span aria-hidden="true">❤️</span> by{" "}
       
              <Link href="https://sheza-fatima.vercel.app/" className="text-primary hover:text-accent">
          <span className="text-primary">Sheza Fatima</span>    
              </Link>{" "}
          
        </p>

        <SocialLinks social={contactInfo.social} variant="dark" />
      </div>
    </footer>
  );
}
