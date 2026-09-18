import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Roboto_Condensed, Open_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// research/design-tokens.md's site-shell fonts: Poppins (headings), Roboto
// Condensed (nav), Open Sans (buttons) are real, self-hosted @font-face
// families on the reference site and are also standard Google Fonts, so
// they're loaded for real here (Constitution II — no new dependency, just
// next/font/google already used above for Geist). "softLINKS Regular" (body)
// has no public equivalent and is not self-hosted in this repo, so
// font-body keeps its Arial/Helvetica fallback per the token declaration.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "700"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Dar-e-Arqam School — Metroville Campus",
  description:
    "Dar-e-Arqam School, Metroville Campus — admissions, academics, campuses, and news.",
};

// Fonts, globals.css, and the bare <html>/<body> shell only — no header,
// footer, or <main> here. The public site's chrome moved to
// src/app/(public)/layout.tsx (PublicShell) so the admin area
// (src/app/admin/**), which has no das.edu.pk counterpart, can share
// this one root layout without inheriting public-site chrome
// (specs/002-foundation/research.md §3).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${robotoCondensed.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
