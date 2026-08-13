import { ApplicationForm } from "@/components/profile/applications/application-form";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AddApplicationPage() {
  const session = await getUserSession();
  
  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
        <ApplicationForm />
      </main>
    </div>
  );
}
