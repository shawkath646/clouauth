import { Suspense } from "react";
import { ApplicationForm } from "@/components/profile/applications/application-form";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const instant = false;

async function AddApplicationContent() {
  const session = await getUserSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
      <ApplicationForm />
    </main>
  );
}

export default function AddApplicationPage() {
  return (
    <div className="space-y-6 w-full">
      <Suspense
        fallback={
          <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <AddApplicationContent />
      </Suspense>
    </div>
  );
}
