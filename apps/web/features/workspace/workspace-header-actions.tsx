"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PatientSearchDialog } from "@/features/patients/patient-search-dialog";
import { Notifications } from "./notifications";
import { useWorkspace } from "./workspace-provider";
import { useSafety } from "./safety-provider";

export function WorkspaceHeaderActions({
  actionRef,
  onActions,
}: {
  actionRef: RefObject<HTMLButtonElement | null>;
  onActions: (query?: string) => void;
}) {
  const { can, branchId, href } = useWorkspace();
  const { guard } = useSafety();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const patients = can("patients.demographics.read");
  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);
  function collapseSearch() {
    setExpanded(false);
    setSearch("");
    searchButton.current?.focus();
  }
  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none">
      <Notifications />
      <form
        role="search"
        aria-label="Workspace search"
        className={cn(
          "flex h-11 min-w-0 shrink items-center rounded-xl transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          expanded
            ? "w-[min(16rem,calc(100vw-12rem))] bg-muted/40 ring-1 ring-input focus-within:ring-2 focus-within:ring-ring sm:w-64 xl:w-72"
            : "w-11",
        )}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && expanded) {
            event.preventDefault();
            event.stopPropagation();
            collapseSearch();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (patients) setOpen(true);
          else onActions(search);
        }}
      >
        <Button
          ref={searchButton}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={expanded ? "Submit workspace search" : "Open search"}
          aria-expanded={expanded}
          onClick={(event) => {
            if (expanded) event.currentTarget.form?.requestSubmit();
            else setExpanded(true);
          }}
          className="size-11 shrink-0 rounded-xl"
        >
          <Search aria-hidden className="size-4 text-muted-foreground" />
        </Button>
        <Input
          ref={input}
          disabled={!expanded}
          aria-hidden={!expanded}
          type="search"
          maxLength={160}
          aria-label={patients ? "Search patients" : "Search workspace actions"}
          placeholder={patients ? "Search patients…" : "Search actions…"}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={cn(
            "h-10 w-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-1 text-sm shadow-none transition-opacity duration-200 focus-visible:ring-0 motion-reduce:transition-none dark:bg-transparent [&::-webkit-search-cancel-button]:appearance-none",
            expanded ? "opacity-100" : "pointer-events-none invisible opacity-0 disabled:opacity-0",
          )}
        />
        {expanded && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close search"
            className="mr-1 size-8 shrink-0"
            onClick={collapseSearch}
          >
            <X aria-hidden className="size-4 text-muted-foreground" />
          </Button>
        )}
      </form>
      <Button
        ref={actionRef}
        type="button"
        aria-label="Open workspace actions"
        className="size-11 gap-2 px-0 sm:w-auto sm:px-4"
        onClick={() => onActions()}
      >
        <LayoutGrid aria-hidden className="size-4" />
        <span className="hidden sm:inline">Actions</span>
      </Button>
      {patients && (
        <PatientSearchDialog
          open={open}
          onOpenChange={setOpen}
          branchId={branchId}
          initialSearch={search}
          select={(patient) =>
            void guard(() => {
              setSearch("");
              router.push(href(`/clinic/patients/${patient.id}`));
            })
          }
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (expanded) input.current?.focus();
            else searchButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
