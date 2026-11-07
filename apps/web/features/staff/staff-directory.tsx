"use client";

import { EmptyState } from "@/components/application/empty-state";
import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { Input } from "@/components/ui/input";
import { StaffAvatar } from "./staff-photo";
import { roleLabel, type StaffSnapshot, type StaffMember } from "./client";

export function StaffDirectory({
  data,
  onEdit,
}: {
  data: StaffSnapshot;
  onEdit: (member: StaffMember) => void;
}) {
  const { href, can } = useWorkspace();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const members = data.members.filter(
    (member) =>
      `${member.name} ${member.email} ${member.specialty} ${member.roles.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "active" ? member.active : member.workspace_mode === "station")),
  );
  const active = data.members.filter((member) => member.active).length;
  return (
    <section className="grid gap-5" aria-labelledby="staff-directory">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="staff-directory" className="text-xl font-semibold">
            Clinic team
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {active} active ·{" "}
            {
              data.members.filter((m) => m.roles.some((r) => ["doctor", "dentist"].includes(r)))
                .length
            }{" "}
            doctors & dentists · {data.invitations.filter((i) => i.state === "pending").length}{" "}
            pending invitations
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden />
          <Input
            className="pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff, email or specialization"
            aria-label="Search staff"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All staff" },
          { id: "active", label: "Active" },
          { id: "station", label: "Station only" },
        ].map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={filter === item.id ? "secondary" : "ghost"}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <article
            key={member.id}
            className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <StaffAvatar name={member.name} photoId={member.photo_id} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold wrap-anywhere">{member.name || "Staff member"}</h3>
                <p className="mt-1 text-xs leading-5 break-all text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${member.active && member.account_active ? "bg-teal-soft text-teal-ink" : "bg-muted text-muted-foreground"}`}
              >
                {member.active && member.account_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-medium">
                {member.roles.map(roleLabel).join(" · ") || "Other clinic role"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {member.professional_title ||
                  member.specialty.replaceAll("_", " ") ||
                  "Team member"}
              </p>
            </div>
            <dl className="grid gap-2 border-t border-border pt-4 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="text-right">{member.branch}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Workspace</dt>
                <dd>
                  {member.workspace_mode === "station"
                    ? "Approved Stations only"
                    : "All permitted tools"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Billing</dt>
                <dd className="text-right">
                  {member.billing_access === "inherit"
                    ? member.permissions.includes("billing.read")
                      ? "From role defaults"
                      : "No access"
                    : {
                        none: "No access",
                        view: "View only",
                        record: "Record payments",
                        manage: "Manage billing",
                      }[member.billing_access]}
                </dd>
              </div>
            </dl>
            {member.roles.some((role) => ["doctor", "dentist"].includes(role)) &&
              member.provider_readiness && (
                <div className="grid gap-2 border-t border-border pt-4 text-xs">
                  <h4 className="font-semibold">Provider setup</h4>
                  {[
                    ["Provider profile", member.provider_readiness.profile],
                    ["Specialization", member.provider_readiness.specialty],
                    ["Current or future weekly hours", member.provider_readiness.scheduled],
                  ].map(([label, ready]) => (
                    <p key={String(label)} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{label}</span>
                      <span
                        className={
                          ready ? "text-teal-ink" : "font-medium text-amber-800 dark:text-amber-200"
                        }
                      >
                        {ready ? "Set" : "Needs setup"}
                      </span>
                    </p>
                  ))}
                  <p className="leading-5 text-muted-foreground">
                    Weekly hours may be changed by date overrides. Patient grants and active
                    membership still govern care access.
                  </p>
                  {can("operations.read") && (
                    <ButtonLink
                      variant="link"
                      className="h-auto justify-start px-0 text-xs"
                      href={href("/clinic/settings/schedules")}
                    >
                      Review provider schedules
                      <ArrowUpRight aria-hidden className="size-3" />
                    </ButtonLink>
                  )}
                </div>
              )}
            <Button variant="outline" className="mt-auto" onClick={() => onEdit(member)}>
              Manage staff
              <ArrowUpRight className="size-4" />
            </Button>
          </article>
        ))}
      </div>
      {!members.length && (
        <EmptyState
          illustration="doctor-profile"
          title="No staff match this view"
          description="Adjust your search or invite a team member."
        />
      )}
      {data.members.length >= data.limit && (
        <p className="text-xs text-muted-foreground">
          Showing the first {data.limit} permitted staff members.
        </p>
      )}
    </section>
  );
}
