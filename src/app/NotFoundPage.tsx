import { Link } from "react-router";
import { strings } from "#shared/strings.js";
import { buttonClass } from "#shared/ui/Button.js";
import { PageTitle } from "#shared/ui/Status.js";

/** Catch-all route. Public, so it works for signed-in and signed-out visitors. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <PageTitle className="text-2xl">{strings.notFound.title}</PageTitle>
      <Link to="/" className={buttonClass({ variant: "link" })}>
        {strings.notFound.home}
      </Link>
    </div>
  );
}
