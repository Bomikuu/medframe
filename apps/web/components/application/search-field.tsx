"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Search input with separate icon/text slots, immediate clearing and composition-safe submission. */
export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onClear,
  onCompositionChange,
  className,
  onSubmit,
}: {
  id?: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  onCompositionChange?: (composing: boolean) => void;
  className?: string;
  onSubmit?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  return (
    <div
      className={cn(
        "flex h-11 min-w-0 items-center rounded-lg border border-input bg-card focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <Search aria-hidden className="mx-3 size-4 shrink-0 text-muted-foreground" />
      <Input
        ref={input}
        id={id}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={160}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onCompositionStart={() => {
          composing.current = true;
          onCompositionChange?.(true);
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          onCompositionChange?.(false);
          onChange(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing))
            event.preventDefault();
          else if (event.key === "Enter") onSubmit?.();
        }}
        className="w-0 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Clear ${label.toLowerCase()}`}
          className="mx-1 size-8 shrink-0"
          onClick={() => {
            onChange("");
            onClear?.();
            input.current?.focus();
          }}
        >
          <X aria-hidden className="size-4" />
        </Button>
      )}
    </div>
  );
}

/** Empty queries clear immediately; superseded and composing queries never dispatch a timer. */
export function useDebouncedSearch(value: string, composing: boolean, delay = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (composing) return;
    const timer = window.setTimeout(() => setSettled(value), value ? delay : 0);
    return () => window.clearTimeout(timer);
  }, [value, composing, delay]);
  return [value ? settled : "", () => setSettled(value)] as const;
}
