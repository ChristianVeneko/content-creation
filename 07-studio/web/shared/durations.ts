// Video length choices, shared by the wizard, the channel editor and the server (max 3 minutes).
export const DURATION_CHOICES = [15, 30, 45, 60, 90, 120, 150, 180] as const;
export type DurationSec = (typeof DURATION_CHOICES)[number];
export const MAX_DURATION_SEC = 180;

export const isDurationSec = (v: unknown): v is DurationSec => (DURATION_CHOICES as readonly unknown[]).includes(v);

/** "15 s", "45 s", "1 min", "1,5 min", "3 min" (decimal comma, as in the UI language). */
export function durationLabel(sec: number): string {
  if (sec < 60) return `${sec} s`;
  return `${String(sec / 60).replace(".", ",")} min`;
}
