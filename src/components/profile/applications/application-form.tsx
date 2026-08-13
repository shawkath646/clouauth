"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApplicationValues, getApplicationSchema } from "@/schema/app.schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DeveloperApp, createAppAction, updateAppAction } from "@/actions/profile/apps.actions";
import { uploadAppIcon } from "@/actions/profile/upload-app-icon";
import { Loader2, Plus, Trash2, Upload, ImagePlus, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import getCroppedImg from "@/utils/crop-image";
import { handleError } from "@/utils/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "@/lib/i18n/hooks";

interface ApplicationFormProps {
  initialData?: DeveloperApp;
}

const AVAILABLE_SCOPES = [
  { id: "openid", label: "OpenID", description: "Required for OIDC" },
  { id: "profile", label: "Profile", description: "Access user profile data" },
  { id: "email", label: "Email", description: "Access email address" },
  { id: "address", label: "Address", description: "Access postal address" },
  { id: "phone", label: "Phone", description: "Access phone number" },
  { id: "offline_access", label: "Offline Access", description: "Request refresh tokens" },
];

export function ApplicationForm({ initialData }: ApplicationFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Icon upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  type Area = { x: number; y: number; width: number; height: number };
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // Secret modal state
  const [createdSecret, setCreatedSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [isSecretOpen, setIsSecretOpen] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const { t } = useTranslations("schema_app");
  const { t: tUI } = useTranslations("profile_apps");

  const form = useForm<ApplicationValues>({
    resolver: zodResolver(getApplicationSchema(t)),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      website: initialData?.website || "",
      redirect_uris: initialData?.oauth?.redirect_uris.map((uri) => ({ value: uri })) || [{ value: "" }],
      scopes: initialData?.oauth?.scopes || ["openid", "profile", "email"],
    },
  });

  const currentScopes = useWatch({ control: form.control, name: "scopes" }) || [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "redirect_uris",
  });

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

  const handleCopySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const onSubmit = async (data: ApplicationValues) => {
    setIsSaving(true);
    try {
      const uris = data.redirect_uris.map(item => item.value).filter(Boolean);
      let appId = initialData?.id;

      if (!appId) {
        // Create new app
        const res = await createAppAction({
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          redirect_uris: uris,
          scopes: data.scopes,
        });

        if (!res.success || !res.app) {
          throw new Error(res.error || "Failed to create application");
        }
        
        appId = res.app.id;

        if (res.clientId && res.clientSecret) {
          setCreatedSecret({
            clientId: res.clientId,
            clientSecret: res.clientSecret,
          });
        }
      } else {
        // Update existing app
        const res = await updateAppAction(appId, {
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          redirect_uris: uris,
          scopes: data.scopes,
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to update application");
        }
      }

      // Handle icon upload if present
      if (imageSrc && croppedAreaPixels && appId) {
        const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
        if (croppedFile) {
          const compressedFile = await imageCompression(croppedFile, {
            maxSizeMB: 1,
            maxWidthOrHeight: 512,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append("file", compressedFile);
          
          await uploadAppIcon(formData, appId);
        }
      }

      if (!initialData && createdSecret) {
        setIsSecretOpen(true); // show modal for new app, redirect on close
      } else {
        toast.success(initialData ? "Application updated" : "Application created");
        router.push("/profile");
      }

    } catch (e: unknown) {
      const em = handleError(e, true);
      toast.error("Error", { description: em });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <section>
        <header className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            {initialData ? tUI("form.titleEdit") : tUI("form.titleRegister")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {initialData 
              ? tUI("form.descEdit") 
              : tUI("form.descRegister")}
          </p>
        </header>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Basic Info */}
          <div className="space-y-4 border-b border-border/50 pb-8">
            <h3 className="text-lg font-medium">{tUI("form.basicInfo")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tUI("form.appName")} <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  {...form.register("name")} 
                  placeholder="My Cool App" 
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{tUI("form.appDesc")}</Label>
                <Input 
                  id="description" 
                  {...form.register("description")} 
                  placeholder="Optional description for your users..." 
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{tUI("form.website")}</Label>
                <Input 
                  id="website" 
                  {...form.register("website")} 
                  placeholder="https://example.com" 
                />
                {form.formState.errors.website && (
                  <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* App Icon */}
          <div className="space-y-4 border-b border-border/50 pb-8">
            <h3 className="text-lg font-medium">{tUI("form.iconTitle")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{tUI("form.iconDesc")}</p>
            
            <div className="flex flex-col items-center justify-center h-[300px] w-full max-w-sm bg-muted/30 rounded-xl border border-dashed relative overflow-hidden">
              {!imageSrc && !initialData?.icon ? (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <ImagePlus className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tUI("form.dragDrop")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tUI("form.fileSize")}</p>
                  </div>
                  <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="mt-2 rounded-full">
                    <Upload className="w-4 h-4 mr-2" />
                    {tUI("form.selectImg")}
                  </Button>
                </div>
              ) : !imageSrc && initialData?.icon ? (
                <div className="flex flex-col items-center w-full h-full relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={initialData.icon} alt="Current Icon" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button type="button" onClick={() => fileInputRef.current?.click()} variant="secondary">
                      {tUI("form.changeIcon")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full">
                  <Cropper
                    image={imageSrc!}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="rect"
                    showGrid={true}
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
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-32"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 rounded-full" 
                    onClick={() => setImageSrc(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
              />
            </div>
          </div>

          {/* OAuth Settings */}
          <div className="space-y-6 border-b border-border/50 pb-8">
            <h3 className="text-lg font-medium">{tUI("form.oauthTitle")}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{tUI("form.redirectUris")} <span className="text-destructive">*</span></Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ value: "" })}
                  className="gap-1 h-8"
                >
                  <Plus className="w-3.5 h-3.5" /> {tUI("form.addUri")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-0">{tUI("form.uriDesc")}</p>
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      {...form.register(`redirect_uris.${index}.value` as const)}
                      placeholder="https://example.com/api/auth/callback"
                    />
                    {form.formState.errors.redirect_uris?.[index]?.value && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.redirect_uris[index]?.value?.message}
                      </p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.redirect_uris && !Array.isArray(form.formState.errors.redirect_uris) && (
                  <p className="text-sm text-destructive">{form.formState.errors.redirect_uris.message}</p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Label>{tUI("form.scopes")} <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">{tUI("form.scopesDesc")}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(() => {
                  return AVAILABLE_SCOPES.map((scope) => {
                    const isChecked = currentScopes.includes(scope.id);
                  
                  return (
                    <div key={scope.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card/40 hover:bg-card/80 transition-colors">
                      <Checkbox
                        id={`scope-${scope.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const updated = checked 
                            ? [...currentScopes, scope.id]
                            : currentScopes.filter(s => s !== scope.id);
                          form.setValue("scopes", updated, { shouldValidate: true });
                        }}
                      />
                      <div className="space-y-1 leading-none mt-0.5">
                        <Label htmlFor={`scope-${scope.id}`} className="font-medium cursor-pointer">
                          {scope.label} <span className="text-xs font-normal text-muted-foreground ml-1 font-mono">({scope.id})</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  );
                  });
                })()}
              </div>
              {form.formState.errors.scopes && (
                <p className="text-sm text-destructive mt-2">{form.formState.errors.scopes.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/profile" className={buttonVariants({ variant: "ghost", className: "h-9" })}>
              {tUI("form.cancel")}
            </Link>
            <Button type="submit" disabled={isSaving} className={buttonVariants({ className: "h-9" })}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? tUI("form.saveEdit") : tUI("form.saveRegister")}
            </Button>
          </div>
        </form>
      </section>

      {/* Secret Modal */}
      <Dialog open={isSecretOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSecretOpen(false);
          router.push("/profile");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tUI("form.modalTitle")}</DialogTitle>
            <DialogDescription className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {tUI("form.modalWarning")}
            </DialogDescription>
          </DialogHeader>
          {createdSecret && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {tUI("form.clientId")}
                </label>
                <div className="p-2.5 rounded-lg border bg-muted/40 font-mono text-sm break-all">
                  {createdSecret.clientId}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {tUI("form.clientSecret")}
                </label>
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-lg border bg-muted/40 font-mono text-sm break-all flex-1">
                    {createdSecret.clientSecret}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySecret(createdSecret.clientSecret)}
                    className="shrink-0 gap-1"
                  >
                    {copiedSecret ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedSecret ? tUI("form.copied") : tUI("form.copy")}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setIsSecretOpen(false);
              router.push("/profile");
            }}>
              {tUI("form.modalClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
