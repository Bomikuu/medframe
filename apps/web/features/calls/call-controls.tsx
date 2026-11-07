"use client";

import {
  Headphones,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Settings2,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CallMedia } from "./use-call-media";
import type { CallState } from "./client";

export function CallControls({
  state,
  media,
  busy,
  chatOpen,
  toggleChat,
  settings,
  start,
  end,
  children,
  presentationControls,
}: {
  state: CallState;
  media: CallMedia;
  busy: boolean;
  chatOpen: boolean;
  toggleChat: () => void;
  settings: () => void;
  start: () => void;
  end: () => void;
  children: React.ReactNode;
  presentationControls?: React.ReactNode;
}) {
  const connected = ["connected", "reconnecting"].includes(media.phase);
  return (
    <footer
      className="z-20 shrink-0 border-t border-border bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5"
      aria-label="Call controls"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            {
              label: media.microphone ? "Mute microphone" : "Unmute microphone",
              on: media.microphone,
              Icon: media.microphone ? Mic : MicOff,
              click: media.toggleMicrophone,
            },
            {
              label: media.camera ? "Turn camera off" : "Turn camera on",
              on: media.camera,
              Icon: media.camera ? Video : VideoOff,
              click: media.toggleCamera,
            },
            {
              label: media.speaker ? "Mute speaker" : "Enable speaker",
              on: media.speaker,
              Icon: media.speaker ? Volume2 : VolumeX,
              click: media.toggleSpeaker,
            },
          ].map(({ label, on, Icon, click }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={media.busy}
                  aria-label={label}
                  aria-pressed={on}
                  className={cn(
                    "size-11",
                    !on && "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
                  )}
                  onClick={() => void click()}
                >
                  <Icon aria-hidden className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
          <Button
            size="icon"
            variant="ghost"
            className="size-11"
            aria-label="Device settings"
            title="Device settings"
            onClick={settings}
          >
            <Settings2 aria-hidden className="size-5" />
          </Button>
          <Button
            size="icon"
            className="size-11"
            variant={chatOpen ? "secondary" : "ghost"}
            aria-label={chatOpen ? "Hide conversation" : "Open chat and files"}
            title="Chat and files"
            aria-expanded={chatOpen}
            aria-controls="call-conversation-panel"
            onClick={toggleChat}
          >
            <MessageSquare aria-hidden className="size-5" />
          </Button>
          {presentationControls}
        </div>
        <div className="flex items-center gap-2">
          {state.role === "doctor" && !state.started && (
            <Button disabled={busy || !state.media_ready} onClick={start}>
              <Play aria-hidden className="size-4" />
              <span>Start appointment</span>
            </Button>
          )}
          {state.started && !connected && (
            <Button
              disabled={media.busy || !state.media_ready}
              onClick={() => void media.connect()}
            >
              <Video aria-hidden className="size-4" />
              {media.busy
                ? "Connecting…"
                : media.phase === "disconnected"
                  ? "Rejoin call"
                  : "Join call"}
            </Button>
          )}
          {state.started && !connected && (
            <Button
              size="icon"
              variant="outline"
              disabled={media.busy || !state.media_ready}
              aria-label="Join audio only"
              title="Join audio only"
              onClick={() => void media.connect(true)}
            >
              <Headphones aria-hidden className="size-4" />
            </Button>
          )}
          {children}
          {state.role === "doctor" && (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={end}
              aria-label="End appointment for everyone"
            >
              <PhoneOff aria-hidden className="size-4" />
              <span className="hidden sm:inline">End call</span>
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
