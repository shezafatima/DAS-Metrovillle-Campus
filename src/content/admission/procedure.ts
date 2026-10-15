import type { AdmissionProcedure } from "@/lib/admission/schema";

// PENDING CLIENT CONFIRMATION (020 FR-031): copied word for word, including the
// reference's own grammar, from docs/content-source/admission/procedure.txt
// (https://das.edu.pk/admission/, sections 1–4). Checked by fidelity.test.ts.
export const admissionProcedure: AdmissionProcedure = {
  source: "https://das.edu.pk/admission/",
  sections: [
    {
      id: "eligibility",
      heading: "1. Eligibility",
      intro: "Interested for your child admission in Dar-e-Arqam School, please check age for required level",
      blocks: [],
    },
    {
      id: "register-for-admission-test",
      heading: "2. Register for Admission Test",
      intro: "Parents wishing to admit a child should first register for admission test",
      blocks: [
        {
          type: "bullets",
          items: [
            "Register for an admission test by completing the admission form at the school office and taking an appointment card for the test and interview.",
            "Registration does not in any way confirm or guarantee admission. It is subject to getting through an admission test/ interview and availability of the seat.",
            "The class for which a child is tested is determined according to the child’s age as of 31st July (28th/29th February in case of Balochistan).",
          ],
        },
      ],
    },
    {
      id: "admission-test",
      heading: "3. Admission Test",
      intro: "Our assessment process is combined with tests in written by child and interview of parents",
      blocks: [
        { type: "subheading", text: "Nursery – PREP" },
        {
          type: "paragraph",
          text: "An informal individual assessment test is taken combined with an interview with both the parents. Generally, the reading level of a child, the vocabulary and concepts of colours and numbers are assessed. In addition, the confidence of the child, the level of spoken English and motor skills are taken into consideration.",
        },
        { type: "subheading", text: "Class-I Onward" },
        {
          type: "bullets",
          items: [
            "Application for Grade-1 onward are tested in three subjects – English, Urdu and Mathematics.",
            "The passing percentage is 50%. Duration of each paper is approximately 30 minutes.",
            "For the written test, the child should come properly equipped with a pencil, eraser, sharpener and ruler.",
            "The papers are not set from any specific textbooks or syllabus but are of a general nature designed to test the aptitude of the child in the basic subjects.",
            "The test paper is not shown to anyone and only marks are communicated to the parents / guardians.",
            "A candidate caught cheating during the admission test will be rejected.",
          ],
        },
        {
          type: "paragraph",
          text: "The list displaying names of selected candidates will be put up on the notice board of the concerned branch on the date given by the school.",
        },
        {
          type: "paragraph",
          text: "In all cases, merit is the sole criterion for admission. The decision of the school cannot be challenged in any way and will be final.",
        },
      ],
    },
    {
      id: "admission-formalities",
      heading: "4. Admission Formalities",
      intro: "Parents are bound to fulfill all admission formalities.",
      blocks: [
        {
          type: "steps",
          steps: [
            {
              id: "registration",
              text: "Parents fill in the admission form and pay the registration fees after which they receive:",
              bullets: [
                "Relevant Fee structure slip",
                "Appointment card with testing date & time on it",
                "Registration receipt",
                "Prospectus purchase cash receipt",
                "Admission and fee payment information",
                "Prospectus & newsletter (if any)",
              ],
            },
            {
              id: "documents",
              text: "The documents to be attached with the Admission Form include:",
              bullets: [
                "A photocopy of Provisional Certificate and Character Certificate from last institution attended",
                "2 recent passport size photographs",
                "Attested photocopy of Birth Certificate",
                "Report card from last school",
              ],
            },
            { id: "test-and-interview", text: "Test and interview with both the parents on the specified date" },
            {
              id: "result",
              text: "Result is finalised within a week of the test & displayed on the notice board. Parents are informed about further formalities.",
            },
            {
              id: "fee-bill",
              text: "Parents are given the admission fee bill, payable by a certain due date in a specific bank as mentioned on the fee bill",
            },
            {
              id: "fees",
              text: "The following fees are payable:",
              fees: [
                { letter: "A", name: "Registration Fee", note: "Non-refundable" },
                { letter: "B", name: "Admission Fee", note: "Non-refundable" },
                { letter: "C", name: "Security Fee", note: "Refundable" },
                { letter: "D", name: "Tuition Fee", note: "Payable every two months" },
                { letter: "E", name: "Computer Fee", note: "Payable every two months" },
              ],
            },
            {
              id: "after-payment",
              text: "On receipt of paid fee bill, parents are given:",
              bullets: ["Admission Order (original)", "Book List", "Uniform List"],
            },
          ],
        },
        { type: "subheading", text: "Note" },
        {
          type: "bullets",
          items: [
            "Fee is subject to annual review.",
            "Family packages are available in selected schools.",
            "Application forms are available at the school office and should be filled in the school.",
          ],
        },
        { type: "subheading", text: "Rules of Payment" },
        {
          type: "numbered",
          items: [
            "Fees are charged for all twelve months of the year and are payable every month.",
            "Parents have the option to pay the fee for the whole year as a lump sum.",
            "The fees payable for the period of the summer vacation are paid in advance and prior to closure.",
            "Once the fee bill has been issued, payment is made directly to the bank where the school operates its account. Parents must pay the fees by the date specified on the fee bill.",
            "Fees paid after the due date is subject to a flat surcharge as specified on the fee bill.",
            "If the tuition fee has not been paid by the end of the second month, the student is automatically withdrawn.",
          ],
        },
      ],
    },
  ],
};
