"use client";

import { Field } from "@base-ui/react/field";
import { Form as FormPrimitive } from "@base-ui/react/form";
import { cn } from "cn";

/**
 * Thin, shadcn-shaped wrapper over Base UI's Field/Form primitives —
 * native HTML5 validation (required, type, pattern, ValidityState),
 * no react-hook-form/zod-resolver dependency needed (Constitution II).
 */
const Form = FormPrimitive;

function FormField({ className, ...props }: React.ComponentProps<typeof Field.Root>) {
  return <Field.Root data-slot="form-field" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Field.Label>) {
  return (
    <Field.Label
      data-slot="form-label"
      className={cn("font-bold text-sm text-foreground data-[disabled]:opacity-50", className)}
      {...props}
    />
  );
}

function FormControl({ className, ...props }: React.ComponentProps<typeof Field.Control>) {
  return (
    <Field.Control
      data-slot="form-control"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 font-light text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow]",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        "data-[invalid]:border-destructive data-[invalid]:ring-3 data-[invalid]:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<typeof Field.Description>) {
  return (
    <Field.Description
      data-slot="form-description"
      className={cn("font-light text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<typeof Field.Error>) {
  return (
    <Field.Error
      data-slot="form-message"
      className={cn("font-light text-xs text-destructive", className)}
      {...props}
    />
  );
}

export { Form, FormField, FormLabel, FormControl, FormDescription, FormMessage };
