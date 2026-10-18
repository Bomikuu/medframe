"use client";

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
}: {
  organizations: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <label id="organization-label" className="text-xs font-medium text-muted-foreground">
        Organization
      </label>
      <OrganizationSelectRoot value={value} onValueChange={onChange}>
        <SelectTrigger aria-labelledby="organization-label" className="w-full">
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
    </div>
  );
}
