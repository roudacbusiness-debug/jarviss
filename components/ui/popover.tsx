"use client";

import { Popover as RadixPopover } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: RadixPopover.PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-50 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg animate-scale-in outline-none",
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
