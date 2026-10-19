"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";
import { Group, Vector3 } from "three";
import type { DentalAnchor, Finding } from "@/features/consultations/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DentalTool = "select" | "comment";
export type PendingPin = { tooth: string; anchor: DentalAnchor };
export type AnnotationInteraction = {
  tool: DentalTool;
  canComment: boolean;
  onToolChange: (tool: DentalTool) => void;
  activeKey: string | null;
  pending: PendingPin | null;
  onPlace: (pin: PendingPin) => void;
  onOpen: (key: string | null) => void;
  renderContent: (finding: Finding | null) => ReactNode;
};

function ToothAnchor({
  mesh,
  point,
  children,
}: {
  mesh: Mesh;
  point: DentalAnchor["point"];
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame(() => {
    group.current?.position.copy(mesh.localToWorld(new Vector3(...point)));
  });
  return <group ref={group}>{children}</group>;
}

export function AnnotationPins({
  teeth,
  findings,
  asset,
  interaction,
}: {
  teeth: Mesh[];
  findings: Finding[];
  asset: DentalAnchor["asset"];
  interaction?: AnnotationInteraction;
}) {
  const pins: {
    key: string;
    tooth: string;
    anchor: DentalAnchor;
    finding: Finding | null;
    number: number;
  }[] = findings
    .filter((finding) => finding.anchor)
    .map((finding, index) => ({
      key: finding.key,
      tooth: finding.tooth,
      anchor: finding.anchor!,
      finding,
      number: index + 1,
    }));
  if (interaction?.pending)
    pins.push({ key: "pending", ...interaction.pending, finding: null, number: pins.length + 1 });
  return pins.map((pin) => {
    const mesh = teeth.find((tooth) => tooth.userData.tooth_id === pin.tooth);
    if (!mesh?.visible || pin.anchor.asset !== asset) return null;
    return (
      <ToothAnchor key={pin.key} mesh={mesh} point={pin.anchor.point}>
        <Html center zIndexRange={[10, 1]}>
          <Popover
            open={interaction ? interaction.activeKey === pin.key : undefined}
            onOpenChange={(open) => interaction?.onOpen(open ? pin.key : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`${pin.key === "pending" ? "New note" : `Note ${pin.number}`} on tooth ${pin.tooth}`}
                onPointerDown={(event) => event.stopPropagation()}
                className={`flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-sm font-semibold text-primary-foreground shadow-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary ${pin.finding?.status === "resolved" ? "opacity-60" : ""}`}
              >
                {pin.key === "pending" ? "+" : pin.number}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              collisionPadding={16}
              className="z-[70] w-[min(320px,calc(100vw-32px))] gap-3 p-4"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <p className="font-semibold">
                {pin.key === "pending" ? "New note" : `Note ${pin.number}`} · Tooth {pin.tooth}
              </p>
              {interaction ? (
                interaction.renderContent(pin.finding)
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">
                    {pin.finding?.notes || pin.finding?.condition}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pin.finding?.status} · Recorded note
                  </p>
                </>
              )}
            </PopoverContent>
          </Popover>
        </Html>
      </ToothAnchor>
    );
  });
}
