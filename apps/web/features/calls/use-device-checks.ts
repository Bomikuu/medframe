"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Local-only preflight. Analysis is never connected to the speaker or uploaded. */
export function useDeviceChecks() {
  const [level, setLevel] = useState(0);
  const [microphoneDetected, setMicrophoneDetected] = useState(false);
  const [speakerPlaying, setSpeakerPlaying] = useState(false);
  const [speakerPlayed, setSpeakerPlayed] = useState(false);
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<AudioContext | null>(null);
  const output = useRef<AudioContext | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = useRef(true);
  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    void input.current?.close();
    input.current = null;
    void output.current?.close();
    output.current = null;
    if (live.current) {
      setLevel(0);
      setSpeakerPlaying(false);
    }
  }, []);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      stop();
    };
  }, [stop]);
  async function analyze(stream: MediaStream) {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    void input.current?.close();
    input.current = null;
    setLevel(0);
    setMicrophoneDetected(false);
    if (!stream.getAudioTracks().length) return;
    try {
      const context = new AudioContext();
      input.current = context;
      await context.resume();
      if (!live.current || input.current !== context) {
        if (context.state !== "closed") await context.close();
        return;
      }
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.fftSize);
      interval.current = setInterval(() => {
        if (!live.current || input.current !== context) return;
        analyser.getByteTimeDomainData(values);
        const rms = Math.sqrt(
          values.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / values.length,
        );
        setLevel(Math.min(100, Math.round(rms * 500)));
        if (rms > 0.015) setMicrophoneDetected(true);
      }, 120);
    } catch {
      if (live.current)
        setError("Microphone metering is unavailable. Check browser permissions and try again.");
    }
  }
  async function testSpeaker() {
    if (speakerPlaying) return;
    setError("");
    setSpeakerConfirmed(false);
    setSpeakerPlayed(false);
    setSpeakerPlaying(true);
    try {
      const context = new AudioContext();
      output.current = context;
      await context.resume();
      if (!live.current || output.current !== context) {
        if (context.state !== "closed") await context.close();
        return;
      }
      const tone = context.createOscillator();
      const gain = context.createGain();
      tone.frequency.value = 440;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, context.currentTime + 0.04);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.65);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.onended = () => {
        if (live.current && output.current === context) {
          setSpeakerPlaying(false);
          setSpeakerPlayed(true);
          output.current = null;
        }
        if (context.state !== "closed") void context.close();
      };
      tone.start();
      tone.stop(context.currentTime + 0.7);
    } catch {
      if (live.current) {
        setSpeakerPlaying(false);
        setError("The test sound could not play. Check your volume and browser audio permission.");
      }
    }
  }
  return {
    level,
    microphoneDetected,
    speakerPlaying,
    speakerPlayed,
    speakerConfirmed,
    error,
    analyze,
    stop,
    testSpeaker,
    confirmSpeaker: () => {
      if (speakerPlayed) setSpeakerConfirmed(true);
    },
  };
}
