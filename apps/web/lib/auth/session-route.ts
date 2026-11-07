import { z } from "zod";

export const sessionRouteSchema = z.object({
  authenticated: z.boolean(),
  kind: z.enum(["anonymous", "staff", "station_staff", "patient", "doctor", "handoff", "device"]),
  destination: z.string().regex(/^\/(?:clinic|portal|login|station)(?:\/|\?|$)/),
});
