"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeSlashIcon size={19} /> : <EyeIcon size={19} />}
      </button>
    </div>
  );
}
