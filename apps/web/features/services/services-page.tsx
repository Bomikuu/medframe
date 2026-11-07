"use client";

import { AccessRequired } from "@/components/application/access-required";

import { useCursorHistory } from "@/components/application/use-cursor-history";
import { useState } from "react";
import { SearchField, useDebouncedSearch } from "@/components/application/search-field";
import { useUrlState } from "@/features/workspace/use-url-state";
import { Button } from "@/components/ui/button";
import { EntrySheet } from "@/components/application/entry-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect } from "@/features/patients/form-controls";
import { PageHeading, LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useRemote } from "@/features/patients/use-remote";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { ServiceCatalogDocument } from "@/lib/graphql/generated";
import { Money, PageNavigation } from "@/features/billing/controls";
import { catalogSchema } from "./schema";
import { ServiceForm } from "./service-form";
import { PatientServices, NewPatientService } from "./patient-services";

export function ServicesPage() {
  const { workspace, can, organizationId, branchId: branch } = useWorkspace();
  const [tab, setTab] = useUrlState("serviceTab", "catalog", ["catalog", "patients"]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useUrlState("serviceStatus", "active", ["active", "archived", "all"]);
  const [composing, setComposing] = useState(false);
  const [settledQuery, submitSearch] = useDebouncedSearch(query, composing);
  const [cursors, setCursors] = useCursorHistory(
    JSON.stringify({ organizationId, branch, status, settledQuery }),
  );
  const after = cursors.at(-1) ?? null;
  const setAfter = (value: string | null) => setCursors(value ? [null, value] : [null]);
  const remote = useRemote(
    ServiceCatalogDocument,
    { organizationId, branchId: branch, filters: { query: settledQuery, status }, after },
    { enabled: !!branch && can("services.read") },
  );
  const parsed = catalogSchema.safeParse(remote.data?.serviceCatalog);
  if (!can("services.read"))
    return (
      <AccessRequired
        title="Services access required"
        description="Your membership does not have Services access."
      />
    );
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        title="Services"
        description="Manage service prices, care workflows and payment plans."
      />

      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-6">
        <TabsList variant="line">
          <TabsTrigger value="catalog">Service catalog</TabsTrigger>
          <TabsTrigger value="patients">Patient services</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="grid min-w-0 gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Prices and workflow presets for new patient agreements.
            </p>
            {can("organization.manage") && (
              <EntrySheet
                title="Add service"
                description="Set the service price, workflow and payment preset."
                triggerVariant="default"
              >
                <ServiceForm
                  branches={workspace.branches}
                  branchId={branch}
                  saved={remote.reload}
                />
              </EntrySheet>
            )}
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <SearchField
              label="Search service catalog"
              placeholder="Search services or categories"
              value={query}
              onSubmit={submitSearch}
              onCompositionChange={setComposing}
              onChange={(value) => {
                setQuery(value);
                setAfter(null);
              }}
            />
            <FormSelect
              id="catalog-state"
              label="Availability"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setAfter(null);
              }}
              options={[
                { value: "active", label: "Active services" },
                { value: "archived", label: "Archived services" },
                { value: "all", label: "All services" },
              ]}
            />
          </div>
          <RemoteNotice error={remote.error} retry={remote.reload} />
          {!parsed.success ? (
            <LoadState error={remote.error} retry={remote.reload} />
          ) : (
            <>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {!parsed.data.items.length && (
                  <div className="p-8">
                    <h3 className="font-semibold">
                      {query || status !== "active"
                        ? "No matching services"
                        : "Build your service catalog"}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                      {query || status !== "active"
                        ? "Try another search or availability filter."
                        : "Add your first service, such as a consultation or braces package. Each patient keeps their own agreed price and workflow."}
                    </p>
                    {(query || status !== "active") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setQuery("");
                          setStatus("active");
                          setAfter(null);
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
                {parsed.data.items.map((row) => (
                  <article
                    key={row.id}
                    className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center"
                  >
                    <div>
                      <h3 className="font-semibold">{row.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.category || "Uncategorized"} · {row.workflow.length} workflow steps ·{" "}
                        {row.active ? "Available" : "Archived"}
                      </p>
                      {row.description && (
                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                          {row.description}
                        </p>
                      )}
                    </div>
                    <div className="text-sm">
                      {row.price ? (
                        <>
                          <p className="text-lg font-semibold tabular-nums">
                            <Money value={row.price} />
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {row.payment_mode === "monthly"
                              ? `${row.months} monthly installments`
                              : "Full payment"}
                          </p>
                          {row.payment_mode === "monthly" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <Money value={row.deposit ?? "0"} /> down payment
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">Workflow access</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {can("organization.manage") && (
                        <EntrySheet
                          title="Manage service"
                          trigger="Edit"
                          description="Changes apply to new selections; existing patient agreements are preserved."
                        >
                          <ServiceForm
                            service={row}
                            branches={workspace.branches}
                            branchId={branch}
                            saved={remote.reload}
                          />
                        </EntrySheet>
                      )}
                      {row.active && can("services.work") && (
                        <EntrySheet
                          title="Start patient service"
                          trigger="Use service"
                          description="Choose a patient and copy this service's workflow."
                        >
                          <NewPatientService
                            service={row}
                            branchId={branch}
                            saved={() => setTab("patients")}
                          />
                        </EntrySheet>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <PageNavigation after={after} next={parsed.data.end_cursor} change={setAfter} />
            </>
          )}
        </TabsContent>
        <TabsContent value="patients">
          {tab === "patients" && <PatientServices key={branch} branchId={branch} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
