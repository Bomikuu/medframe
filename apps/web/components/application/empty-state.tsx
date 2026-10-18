import type { ReactNode } from "react";
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
    <Empty className="min-h-44 rounded-lg border border-dashed border-border py-9">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
