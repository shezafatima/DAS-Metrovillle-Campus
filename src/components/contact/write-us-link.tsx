"use client";

import { contactCopy } from "@/content/contact";

/**
 * Jumps to the form band and focuses the Name input, without preventing
 * the default hash navigation (contracts/contact-page.md "WriteUsLink").
 */
export function WriteUsLink() {
  return (
    <a
      href="#contact-form"
      className="text-primary underline underline-offset-4"
      onClick={() => {
        requestAnimationFrame(() => {
          document.getElementById("contact-name")?.focus();
        });
      }}
    >
      {contactCopy.columns.write.writeLink}
    </a>
  );
}
