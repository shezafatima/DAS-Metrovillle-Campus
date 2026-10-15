import type { UniformContent } from "@/lib/admission/schema";

// PENDING CLIENT CONFIRMATION (020 FR-031): categories, genders and items copied
// word for word from docs/content-source/admission/uniform.txt
// (https://das.edu.pk/admission/uniform/, published 2019). Checked by fidelity.test.ts.
// Photos: the reference's own files, matched to their groups and confirmed by the
// requester (spec "Findings"); the Hifz boys' photo was supplied by the requester. Alt texts describe what each
// photo shows, which differs from the text in places (e.g. the senior girls' qamiz is
// white with green-check trim).
// The Hifz girls' group is not shown, at the requester's request (2026-10-14); it stays in the
// source file, and fidelity.test.ts lists it as deliberately left out.
export const uniformContent: UniformContent = {
  source: "https://das.edu.pk/admission/uniform/",
  uniform: [
    {
      id: "kids-boys",
      category: "Kids Uniform",
      gender: "Boys",
      items: ["Green Check Shirt", "Light Green Pants", "Green Blazer", "Black Shoes", "Black Socks"],
      image: {
        src: "/images/admission/uniform/kids-boys.png",
        alt: "Kids boys' uniform: white shirt with green check collar, cuffs and pocket, grey-green trousers, green blazer, black shoes and black socks",
      },
    },
    {
      id: "kids-girls",
      category: "Kids Uniform",
      gender: "Girls",
      items: ["Green Check Frock", "White Shalwar", "White Scarf & Green Blazer", "Black Shoes", "Black Socks"],
      image: {
        src: "/images/admission/uniform/kids-girls.png",
        alt: "Kids girls' uniform: green check frock with white collar, white shalwar, white scarf with yellow edge, green blazer, black strap shoes and black socks",
      },
    },
    {
      id: "hifz-boys",
      category: "Hifz Students’ Uniform",
      gender: "Boys",
      items: ["White Shalwar Qamiz", "Black Waist Coat", "Green blazer", "Black Shoes", "Black Socks"],
      // Supplied by the requester (2026-10-14); not from the reference. It shows a white cap and white socks and
      // no waist coat or blazer, unlike the list above (client review list).
      image: {
        src: "/images/admission/uniform/hifz-boys.png",
        alt: "Hifz boys' uniform: white shalwar qamiz, white cap, black shoes and white socks",
      },
    },
    {
      id: "senior-boys",
      category: "Senior Students’ Uniform",
      gender: "Boys",
      items: ["Green Check Shirt", "Light Green Pants", "Green Blazer", "Black Shoes", "Black Socks"],
      image: {
        src: "/images/admission/uniform/senior-boys.png",
        alt: "Senior boys' uniform: white shirt with green check collar, cuffs and pocket, grey-green trousers, green blazer, black shoes and black socks",
      },
    },
    {
      id: "senior-girls",
      category: "Senior Students’ Uniform",
      gender: "Girls",
      items: ["Green Check Qamiz", "White Shalwar", "Green Blazer & White Scarf", "Black Shoes", "Black Socks"],
      image: {
        src: "/images/admission/uniform/senior-girls.png",
        alt: "Senior girls' uniform: white qamiz with green check collar, cuffs and trim, white shalwar, white scarf with yellow edge, green blazer, black strap shoes and black socks",
      },
    },
  ],
};

/** A card's full heading, e.g. "Kids Uniform – Boys" (spec FR-025). */
export const uniformTitle = (group: { category: string; gender: string }) => `${group.category} – ${group.gender}`;
