import { AboutSection } from "./about-section";
import { Paragraphs } from "./paragraphs";
import { PersonPhoto } from "./person-photo";
import type { Messages } from "@/lib/about/schema";
import type { AboutBackground } from "@/lib/about/view";
import { isRtlScript } from "@/lib/rtl-text";

const rtl = (text: string) => (isRtlScript(text) ? ({ lang: "ur", dir: "rtl" } as const) : {});

/** Each message in full: no toggle. Below `lg` the photo sits above the text; from `lg` the photo side alternates. */
export function MessagesSection({ value, background }: { value: Messages; background: AboutBackground }) {
  return (
    <AboutSection id="messages" background={background} heading={value.heading} line={value.subheading}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        {value.messages.map((message, index) => {
          const side = index % 2 === 0 ? "start" : "end";
          const headingId = `message-${message.id}`;
          return (
            <article
              key={message.id}
              aria-labelledby={headingId}
              data-photo-side={side}
              className={`flex flex-col gap-6 lg:items-center ${side === "end" ? "lg:flex-row-reverse" : "lg:flex-row"}`}
            >
              <div data-testid="message-photo" className="w-full max-w-xs shrink-0 lg:w-1/4">
                <PersonPhoto photo={message.photo} name={message.name} onMuted={background === "muted"} />
              </div>
              <div data-testid="message-text" className="flex max-w-prose flex-col gap-2">
                <h3 id={headingId} {...rtl(message.name)} className="font-bold font-heading text-h3 text-primary">
                  {message.name}
                </h3>
                <p {...rtl(message.designation)} className="font-body text-body text-text">
                  {message.designation}
                </p>
                <blockquote className="mt-2 flex flex-col gap-4">
                  <Paragraphs text={message.body} />
                </blockquote>
              </div>
            </article>
          );
        })}
      </div>
    </AboutSection>
  );
}
