"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileName } from "@/actions/profile/modify-profile";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditNameFormProps {
  initialData: {
    first_name: string;
    last_name: string;
  };
}

export function EditNameForm({ initialData }: EditNameFormProps) {
  const [firstName, setFirstName] = useState(initialData.first_name);
  const [lastName, setLastName] = useState(initialData.last_name);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfileName({ first_name: firstName, last_name: lastName });
    setIsSaving(false);

    if (res.success) {
      toast.success("Profile updated", { description: "Your name has been updated successfully." });
      router.push("/profile");
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Edit Name</h2>
        <p className="text-muted-foreground text-sm">Update your first and last name.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            autoComplete="family-name"
          />
        </div>
        <div className="flex items-center justify-end gap-3 mt-10">
          <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </section>
  );
}
