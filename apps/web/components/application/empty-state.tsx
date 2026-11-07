import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import {
  MedframeIllustration,
  type IllustrationName,
} from "@/components/illustrations/medframe-illustration";
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
  illustration,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  illustration?: IllustrationName;
}) {
  return (
    <Empty className="min-h-0 gap-3 bg-transparent px-5 py-8">
      {illustration ? (
        <MedframeIllustration name={illustration} className="mb-1 h-32 w-40" />
      ) : (
        <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-5" aria-hidden />
        </span>
      )}
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
