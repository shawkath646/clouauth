"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAddress } from "@/actions/profile/modify-profile";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DBAddress } from "@/types/user.types";

interface EditAddressFormProps {
  initialData: {
    addresses?: DBAddress[];
  };
}

export function EditAddressForm({ initialData }: EditAddressFormProps) {
  const defaultAddress = initialData.addresses?.find(a => a.is_default) || initialData.addresses?.[0];

  const [address1, setAddress1] = useState(defaultAddress?.address_1 || "");
  const [address2, setAddress2] = useState(defaultAddress?.address_2 || "");
  const [city, setCity] = useState(defaultAddress?.city || "");
  const [state, setState] = useState(defaultAddress?.state || "");
  const [zipCode, setZipCode] = useState(defaultAddress?.zip_code || "");
  const [country, setCountry] = useState(defaultAddress?.country || "");
  
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateProfileAddress({ 
      address_1: address1,
      address_2: address2,
      city,
      state,
      zip_code: zipCode,
      country
    });
    setIsSaving(false);
    
    if (res.success) {
      toast.success("Profile updated", { description: "Your address has been updated successfully." });
      router.push("/profile");
    } else {
      toast.error("Error", { description: res.error || "Failed to update profile" });
    }
  };

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Edit Address</h2>
        <p className="text-muted-foreground text-sm">Update your primary billing/shipping address.</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address_1">Address Line 1</Label>
            <Input 
              id="address_1" 
              value={address1} 
              onChange={(e) => setAddress1(e.target.value)} 
              required 
              autoComplete="address-line1"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address_2">Address Line 2 (Optional)</Label>
            <Input 
              id="address_2" 
              value={address2} 
              onChange={(e) => setAddress2(e.target.value)} 
              autoComplete="address-line2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input 
                id="city" 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                required 
                autoComplete="address-level2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input 
                id="state" 
                value={state} 
                onChange={(e) => setState(e.target.value)} 
                autoComplete="address-level1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP / Postal Code</Label>
              <Input 
                id="zip_code" 
                value={zipCode} 
                onChange={(e) => setZipCode(e.target.value)} 
                required 
                autoComplete="postal-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input 
                id="country" 
                value={country} 
                onChange={(e) => setCountry(e.target.value)} 
                required 
                autoComplete="country-name"
              />
            </div>
          </div>
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
