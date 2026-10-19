"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { toggleThumb, toggleTrack } from "./toggle-styles";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn(toggleTrack, className)} {...props}>
      <span data-slot="checkbox-thumb" aria-hidden="true" className={toggleThumb}>
        <span className="hidden h-0.5 w-2 rounded-full bg-current group-data-[state=indeterminate]/toggle:block" />
      </span>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
