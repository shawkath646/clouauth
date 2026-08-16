"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Upload, Loader2, ImagePlus } from "lucide-react";
import { uploadCustomAvatar } from "@/actions/profile/upload-avatar";
import { toast } from "sonner";
import getCroppedImg from "@/utils/crop-image";
import { handleError } from "@/utils/error";

export function EditAvatarForm() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  type Area = { x: number; y: number; width: number; height: number };
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedFile) throw new Error("Failed to crop image");

      const compressedFile = await imageCompression(croppedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("file", compressedFile);
      
      const result = await uploadCustomAvatar(formData);
      
      if (result.success && result.data) {
        toast.success("Avatar updated", { description: "Your new avatar has been saved." });
        router.push("/profile");
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute EditAvatarForm");
        toast.error("Error", { description: em });
      } finally {
      setIsUploading(false);
    }
  };

  return (
    <section>
      <header className="mb-15">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Update Profile Picture</h2>
        <p className="text-muted-foreground text-sm">Choose a new image to represent your account.</p>
      </header>

      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-muted/30 rounded-xl border border-dashed relative overflow-hidden mb-6">
        {!imageSrc ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ImagePlus className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium">Drag and drop or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG or WebP up to 5MB</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="mt-2 rounded-full">
              <Upload className="w-4 h-4 mr-2" />
              Select Image
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-sm border">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 mt-10">
        {imageSrc && (
          <Button type="button" variant="ghost" onClick={() => setImageSrc(null)} disabled={isUploading} className="h-9">
            Choose Different
          </Button>
        )}
        <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
          Cancel
        </Link>
        {imageSrc && (
          <Button type="button" onClick={handleSave} disabled={isUploading} className="h-9">
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Avatar
          </Button>
        )}
      </div>
    </section>
  );
}
