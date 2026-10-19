import { SecureImage } from "@/features/documents/secure-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
export function PatientAvatar({
  name,
  imageId,
  className,
}: {
  name: string;
  imageId?: string;
  className?: string;
}) {
  if (imageId)
    return (
      <span
        className={cn(
          "inline-flex size-11 shrink-0 overflow-hidden rounded-full border border-border bg-secondary",
          className,
        )}
      >
        <SecureImage
          id={imageId}
          avatar
          alt={`Photo of ${name}`}
          className="h-full w-full object-cover"
        />
      </span>
    );
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Avatar className={cn("size-11 shrink-0 border border-border", className)} aria-hidden="true">
      <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
