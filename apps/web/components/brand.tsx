import { cn } from "@/lib/utils";
import Image from "next/image";
import logo from "@/public/brand/medframe-logo.webp";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      sizes="48px"
      className={cn("size-11 shrink-0 object-contain", className)}
    />
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-heading text-[23px] font-bold tracking-tight text-primary",
        className,
      )}
    >
      <BrandMark />
      <span>
        Medframe<span className="text-teal-ink">.</span>
      </span>
    </span>
  );
}
