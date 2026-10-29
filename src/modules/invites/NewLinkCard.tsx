import { Button } from "#shared/ui/Button.js";
import { Input } from "#shared/ui/Input.js";
import { cardClass } from "#shared/ui/Card.js";
import { ErrorText } from "#shared/ui/Status.js";
import { inviteStrings as s } from "./strings.js";

interface NewLinkCardProps {
  url: string;
  copied: boolean;
  copyError: boolean;
  onCopy: () => void;
}

/** Highlighted card showing the freshly created invite link. */
export function NewLinkCard({
  url,
  copied,
  copyError,
  onCopy,
}: NewLinkCardProps) {
  return (
    <div className={cardClass({ highlight: true }, "flex flex-col gap-2 p-3")}>
      <p className="text-sm text-neutral-400">{s.newLink}</p>
      <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <Button variant="accent" onClick={onCopy}>
        {copied ? s.copied : s.copy}
      </Button>
      {copyError && <ErrorText>{s.copyFailed}</ErrorText>}
    </div>
  );
}
