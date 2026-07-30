import { Suspense } from "react";
import { WorkerHeader } from "@/components/WorkerHeader";
import { WorkerFooter } from "@/components/WorkerFooter";

export default function PersonalDefinitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-momo-trust">
      <Suspense fallback={null}>
        <WorkerHeader />
      </Suspense>
      <main className="pt-[60px] bg-worker-bg min-h-screen">{children}</main>
      <WorkerFooter />
    </div>
  );
}
