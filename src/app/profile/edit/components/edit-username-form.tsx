"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileUsername } from "@/actions/profile/modify-profile";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditUsernameFormProps {
  initialData: {
    username: string;
    username_last_changed?: Date | null;
  };
}

export function EditUsernameForm({ initialData }: EditUsernameFormProps) {
  const [username, setUsername] = useState(initialData.username);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const daysSinceChange = initialData.username_last_changed 
    ? Math.floor((new Date().getTime() - new Date(initialData.username_last_changed).getTime()) / (1000 * 60 * 60 * 24))
    : 60;
  
  const isLocked = daysSinceChange < 60;
  const daysRemaining = 60 - daysSinceChange;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfileUsername({ username });
    setIsSaving(false);
    
    if (res.success) {
      toast.success("Profile updated", { description: "Your username has been updated successfully." });
      router.push("/profile");
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Edit Username</h2>
        <p className="text-muted-foreground text-sm">Change your unique username. This is how you appear publicly.</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {isLocked ? (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl text-sm">
            You recently changed your username. You must wait <strong>{daysRemaining} more days</strong> before you can change it again.
          </div>
        ) : (
          <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm">
            <strong>Please note:</strong> Once you change your username, you will not be able to change it again for <strong>60 days</strong>.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
            <Input 
              id="username" 
              className="pl-8"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              autoComplete="username"
              disabled={isLocked}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-10">
          <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={isSaving || isLocked} className={buttonVariants({ className: "h-9" })}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </section>
  );
}
