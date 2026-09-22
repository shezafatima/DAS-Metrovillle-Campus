import { ChevronDown } from "lucide-react";
import { cn } from "cn";

/**
 * A plain native `<select>`, styled to match `FormControl`'s input
 * chrome (src/components/ui/form.tsx) — no shadcn/Base UI Select
 * primitive exists yet in this codebase (only Field.Control, which
 * renders an `<input>`). Built once here so every admin control that
 * needs a dropdown (news language, category, status filter) shares one
 * look instead of each re-implementing it (Constitution VI).
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-background px-3 py-1 pr-8 font-light text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          "data-[invalid]:border-destructive data-[invalid]:ring-3 data-[invalid]:ring-destructive/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
