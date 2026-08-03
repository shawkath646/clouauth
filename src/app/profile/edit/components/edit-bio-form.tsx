"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateProfileBio } from "@/actions/profile/modify-profile";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditBioFormProps {
  initialData: {
    bio?: string | null;
  };
}

export function EditBioForm({ initialData }: EditBioFormProps) {
  const [bio, setBio] = useState(initialData.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfileBio({ bio: bio || null });
    setIsSaving(false);
    
    if (res.success) {
      toast.success("Profile updated", { description: "Your bio has been updated successfully." });
      router.push("/profile");
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Edit Bio</h2>
        <p className="text-muted-foreground text-sm">Write a short biography about yourself.</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea 
            id="bio" 
            rows={4}
            value={bio} 
            onChange={(e) => setBio(e.target.value)} 
            placeholder="Tell us a little bit about yourself"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
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
