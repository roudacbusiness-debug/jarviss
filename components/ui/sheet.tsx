"use client";

import { Dialog as RadixDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

/** Panneau latéral à droite sur desktop, feuille montante sur mobile. */
export function SheetContent({
  children,
  className,
  title,
  description,
  header,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
  description?: string;
  header?: React.ReactNode;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] animate-fade-in" />
      <RadixDialog.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-xl bg-surface shadow-lg animate-slide-up",
          "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-xl sm:animate-slide-right",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 pt-4 pb-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            {header ?? (
              <RadixDialog.Title className="font-display text-lg font-bold tracking-tight">{title}</RadixDialog.Title>
            )}
            {header ? <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title> : null}
            <RadixDialog.Description className={description ? "mt-0.5 text-sm text-muted" : "sr-only"}>
              {description ?? title}
            </RadixDialog.Description>
          </div>
          <RadixDialog.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </RadixDialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 safe-bottom" data-scroll>
          {children}
        </div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
