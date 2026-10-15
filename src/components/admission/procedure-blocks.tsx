import type { ProcedureBlock } from "@/lib/admission/schema";

const body = "font-body text-body text-text";
const bulletList = `${body} flex list-disc flex-col gap-2 ps-6`;
const numberList = `${body} flex list-decimal flex-col gap-3 ps-6`;

/**
 * The blocks of one procedure step (020 FR-007): paragraphs, sub-headings,
 * bulleted and numbered lists, and the Admission Formalities steps as one
 * ordered list, each step with its own list or the fee table.
 */
export function ProcedureBlocks({ sectionId, blocks }: { sectionId: string; blocks: ProcedureBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={index} className={body}>
                {block.text}
              </p>
            );
          case "subheading":
            return (
              <h4 key={index} className="font-bold font-heading text-(--color-home-dark-text) text-lg">
                {block.text}
              </h4>
            );
          case "bullets":
            return (
              <ul key={index} className={bulletList}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "numbered":
            return (
              <ol key={index} className={numberList}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );
          case "steps":
            return (
              <ol key={index} className={numberList} data-testid="procedure-steps">
                {block.steps.map((step) => {
                  const textId = `${sectionId}-${step.id}`;
                  return (
                    <li key={step.id} className="flex flex-col gap-2">
                      <span id={textId}>{step.text}</span>
                      {step.bullets && (
                        <ul className={bulletList}>
                          {step.bullets.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {step.fees && (
                        // No caption or column headers are invented: the step's own text labels the table.
                        <table aria-labelledby={textId} className="w-full max-w-md border-collapse" data-testid="fee-table">
                          <tbody>
                            {step.fees.map((fee) => (
                              <tr key={fee.letter} className="border-border border-b last:border-b-0">
                                <th scope="row" className="py-1 pe-3 text-start font-semibold">
                                  {fee.letter}
                                </th>
                                <td className="py-1 pe-3">{fee.name}</td>
                                <td className="py-1">{fee.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </li>
                  );
                })}
              </ol>
            );
        }
      })}
    </>
  );
}
