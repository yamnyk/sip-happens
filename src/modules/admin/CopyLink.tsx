import { useState } from "react";
import { Button } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { adminStrings as t } from "./strings.js";

/** Read-only reset link with a copy button. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-950 p-3">
      <p className="text-sm text-neutral-300">{t.linkReady}</p>
      <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <Button
        variant="primary"
        onClick={() => {
          navigator.clipboard
            .writeText(url)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        {copied ? t.copied : t.copy}
      </Button>
    </div>
  );
}
