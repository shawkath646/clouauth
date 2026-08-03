"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfilePronouns } from "@/actions/profile/modify-profile";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditPronounsFormProps {
  initialData: {
    pronouns?: string | null;
  };
}

const PRONOUN_OPTIONS = [
  "He/Him",
  "She/Her",
  "They/Them",
  "He/They",
  "She/They",
  "Any/All",
  "Prefer not to say",
  "Other"
];

export function EditPronounsForm({ initialData }: EditPronounsFormProps) {
  const [pronouns, setPronouns] = useState(initialData.pronouns || "");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfilePronouns({ pronouns: pronouns || null });
    setIsSaving(false);
    
    if (res.success) {
      toast.success("Profile updated", { description: "Your pronouns have been updated successfully." });
      router.push("/profile");
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Edit Pronouns</h2>
        <p className="text-muted-foreground text-sm">Let others know how to refer to you.</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pronouns">Pronouns</Label>
          <Select 
            value={pronouns} 
            onValueChange={(val) => setPronouns(val || "")}
          >
            <SelectTrigger id="pronouns" className="w-full">
              <SelectValue placeholder="Select your pronouns" />
            </SelectTrigger>
            <SelectContent>
              {PRONOUN_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
