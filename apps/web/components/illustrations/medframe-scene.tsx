import Image from "next/image";
import waitingRoom from "@/public/illustrations/scenes/online-waiting-room.webp";
import stationPairing from "@/public/illustrations/scenes/station-pin-pairing.webp";
import { cn } from "@/lib/utils";

const scenes = {
  "online-waiting-room": waitingRoom,
  "station-pin-pairing": stationPairing,
};

/** Supplied raster scenes; embedded example labels are never functional UI. */
export function MedframeScene({
  name,
  className,
  imageClassName,
  captionClassName,
  sizes = "(min-width: 1024px) 400px, (min-width: 768px) 350px, 90vw",
}: {
  name: keyof typeof scenes;
  className?: string;
  imageClassName?: string;
  captionClassName?: string;
  sizes?: string;
}) {
  return (
    <figure className={cn("mx-auto w-full max-w-md", className)}>
      <Image
        src={scenes[name]}
        alt=""
        sizes={sizes}
        className={cn("h-auto w-full object-contain", imageClassName)}
      />
      <figcaption
        className={cn(
          "mt-1 text-center text-[11px] leading-5 text-muted-foreground",
          captionClassName,
        )}
      >
        {name === "station-pin-pairing"
          ? "Illustration only. Use the code provided by your clinic."
          : "Illustration only. Queue details shown are examples."}
      </figcaption>
    </figure>
  );
}
