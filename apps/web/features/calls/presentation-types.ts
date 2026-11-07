import { z } from "zod";
import type { SharedCameraPose } from "@/lib/three/shared-camera";

const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const camera = z
  .object({
    position: vector,
    target: vector,
    up: vector,
    fov: z.number().min(10).max(100),
    aspect: z.number().min(0.1).max(10),
  })
  .strict();
const part = z.object({ id: z.string().max(100), surface: z.string().max(20).nullable() }).strict();
export const presentationSchema = z
  .object({
    protocol_version: z.literal(1),
    generation: z.number().int(),
    epoch: z.string().uuid().nullable(),
    revision: z.number().int().nonnegative(),
    active: z.boolean(),
    model: z.enum(["dental", "body", "skeleton"]).nullable(),
    asset_version: z.string().max(80).nullable(),
    presenter: z.string().uuid().nullable(),
    camera: camera.nullable(),
    scene_revision: z.number().int().nonnegative(),
    scene: z
      .object({
        view: z.enum(["front", "back", "left", "right", "upper", "lower"]),
        jaw: z.enum(["both", "upper", "lower"]),
        isolate: z.boolean(),
      })
      .strict(),
    doctor_focus: part.nullable(),
    patient_pointer: part.nullable(),
    allow_patient_selection: z.boolean(),
    selection_epoch: z.number().int().nonnegative(),
    actor: z.enum(["doctor", "patient"]),
  })
  .strict();
export type PresentationState = z.infer<typeof presentationSchema>;
export type ModelPart = z.infer<typeof part>;
export type PresentationModel = "dental" | "body" | "skeleton";
export type PresentationScene = PresentationState["scene"];
export type CameraUpdate = { pose: SharedCameraPose | null; sceneRevision: number };
export const PRESENTATION_ASSETS = {
  dental: "dundee-permanent-v1",
  body: "anatomy-body-v1",
  skeleton: "anatomy-skeleton-v1",
} as const;
