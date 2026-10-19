"use client";
import { SecureImage } from "@/features/documents/secure-image";

import {
  Select as OrganizationSelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrganizationSwitcher({
  organizations,
  value,
  onChange,
  branch,
  logoId,
}: {
  organizations: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  branch?: string;
  logoId?: string;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-xl bg-muted/80 p-3">
      <label id="organization-label" className="sr-only">
        Organization
      </label>
      <OrganizationSelectRoot value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-labelledby="organization-label"
          className="h-auto min-h-11 w-full max-w-full min-w-0 border-0 bg-transparent px-0 font-semibold shadow-none data-[size=default]:h-auto [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-xs text-teal-ink"
          >
            {logoId ? (
              <SecureImage id={logoId} alt="Clinic logo" className="size-7 object-contain" />
            ) : (
              organizations
                .find((org) => org.id === value)
                ?.name.trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
            )}
          </span>
          <SelectValue placeholder="Choose your organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </OrganizationSelectRoot>
      {branch && <p className="truncate pl-10 text-xs text-muted-foreground">{branch}</p>}
    </div>
  );
}
