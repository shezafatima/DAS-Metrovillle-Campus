import Image from "next/image";
import type { ReactNode } from "react";

export interface ContactDetailColumnProps {
  icon: { src: string; alt: string };
  heading: string;
  subtitle: ReactNode;
  children: ReactNode;
}

export function ContactDetailColumn({ icon, heading, subtitle, children }: ContactDetailColumnProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Image
        src={icon.src}
        alt={icon.alt}
        width={200}
        height={200}
        className="size-(--spacing-contact-icon) object-contain"
      />
      <h3 className="font-heading text-h3 text-foreground uppercase">{heading}</h3>
      {subtitle && (
        <p className="font-heading text-(length:--text-contact-column-subtitle) font-(--text-contact-column-subtitle--font-weight) text-foreground tracking-(--text-contact-column-subtitle--letter-spacing)">
          {subtitle}
        </p>
      )}
      <div className="font-body text-body text-foreground">{children}</div>
    </div>
  );
}
