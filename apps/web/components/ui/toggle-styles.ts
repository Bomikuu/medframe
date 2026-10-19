// Shared toggle appearance. Checkbox retains its native selection/indeterminate contract.
export const toggleTrack =
  "peer group/toggle relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent bg-input p-0.5 transition-colors duration-150 outline-none after:absolute after:-inset-x-1 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary/70 dark:bg-input/80 motion-reduce:transition-none";

export const toggleThumb =
  "pointer-events-none flex size-[18px] items-center justify-center rounded-full bg-white text-primary shadow-xs transition-transform duration-150 group-data-[state=unchecked]/toggle:translate-x-0 group-data-[state=checked]/toggle:translate-x-4 group-data-[state=indeterminate]/toggle:translate-x-2 motion-reduce:transition-none";
