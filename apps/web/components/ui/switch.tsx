"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { toggleThumb, toggleTrack } from "./toggle-styles";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(toggleTrack, size === "sm" && "h-5 w-8", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          toggleThumb,
          size === "sm" && "size-3.5 group-data-[state=checked]/toggle:translate-x-3",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
