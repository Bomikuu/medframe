"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { RemoteNotice } from "@/features/patients/feedback";
import { ServiceCatalogDocument } from "@/lib/graphql/generated";
import { catalogSchema, type Service } from "@/features/services/schema";
import { currency } from "./schema";

export function ServicePicker({
  branchId,
  onSelect,
}: {
  branchId: string;
  onSelect: (service: Service) => void;
}) {
  const { organizationId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const remote = useRemote(ServiceCatalogDocument, {
    organizationId,
    branchId,
    filters: { query },
    after,
  });
  const parsed = catalogSchema.safeParse(remote.data?.serviceCatalog);
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">Choose a clinic service</p>
      <div className="flex gap-2">
        <Input
          type="search"
          aria-label="Search services"
          placeholder="Search by name or category"
          value={search}
          maxLength={160}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery(search);
            setAfter(null);
          }}
        >
          Search
        </Button>
      </div>
      <FormSelect
        id="billing-service-picker"
        label="Service"
        value=""
        onChange={(id) => {
          const row = parsed.data?.items.find((x) => x.id === id);
          if (row) onSelect(row);
        }}
        options={(parsed.data?.items ?? []).map((row) => ({
          value: row.id,
          label: `${row.name}${row.price ? ` · ${currency(row.price)}` : ""}`,
        }))}
      />
      {!remote.loading && parsed.success && !parsed.data.items.length && (
        <p className="text-sm text-muted-foreground">
          No active services match. An administrator can add them in Services.
        </p>
      )}
      <RemoteNotice error={remote.error} retry={remote.reload} />
      <div className="flex gap-2">
        {after && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAfter(null)}>
            First page
          </Button>
        )}
        {parsed.data?.has_next_page && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAfter(parsed.data.end_cursor)}
          >
            More services
          </Button>
        )}
      </div>
    </div>
  );
}
