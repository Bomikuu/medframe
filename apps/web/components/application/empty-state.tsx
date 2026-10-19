import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="min-h-0 gap-4 rounded-xl bg-muted/50 px-5 py-7">
      <span className="grid size-10 place-items-center rounded-xl bg-card text-muted-foreground">
        <Inbox className="size-5" aria-hidden />
      </span>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
