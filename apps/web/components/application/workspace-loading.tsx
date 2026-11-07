import { LoadingInformation } from "./loading-information";

/** Startup gates share one visual state while each keeps its own authorization. */
export function WorkspaceLoading({
  title = "Opening your workspace",
  detail = "Preparing your clinic, preferences and available tools.",
  retry,
}: {
  title?: string;
  detail?: string;
  retry?: () => void;
}) {
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-background px-6 py-10">
      <LoadingInformation title={title} detail={detail} retry={retry} />
    </main>
  );
}
