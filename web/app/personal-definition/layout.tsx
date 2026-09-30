/**
 * Headerless by design (spec §3): the route is "just the personality test".
 * Unlike sibling CareerPath there is no WorkerHeader/WorkerFooter, so no link
 * back to the job board — a deliberate deviation noted for the PR.
 */
export default function PersonalDefinitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-momo-trust">
      <main className="bg-worker-bg min-h-screen">{children}</main>
    </div>
  );
}
