import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Image as ImageIcon, Phone, MapPin, PhoneCall } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { MeResponse, ClientProfile } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export const ProfileEditor = ({ user }: { user: MeResponse }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const profile = (user?.profile as ClientProfile | undefined) || {};
  const [formData, setFormData] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    address: profile.address ?? "",
    extra_number1: profile.extra_number1 ?? "",
    extra_number2: profile.extra_number2 ?? "",
  });
  const phoneRegex = useMemo(() => /^\+?\d{8,15}$/, []);
  const normalizePhone = (val: string) => val.replace(/[\s()-]/g, "");
  const [extra1Error, setExtra1Error] = useState<string | null>(null);
  const [extra2Error, setExtra2Error] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(user?.image ?? null);
  const extra1InputRef = useRef<HTMLInputElement>(null);
  const extra2InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = (user?.profile as ClientProfile | undefined) || {};
    setFormData({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      address: p.address ?? "",
      extra_number1: p.extra_number1 ?? "",
      extra_number2: p.extra_number2 ?? "",
    });
    setImageUrl(user?.image ?? null);
  }, [user]);

  //
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
      };
      if (user.role === "CLIENT") {
        const n1 = formData.extra_number1 ? normalizePhone(formData.extra_number1) : "";
        const n2 = formData.extra_number2 ? normalizePhone(formData.extra_number2) : "";
        payload.address = formData.address;
        payload.extra_number1 = n1 || "";
        payload.extra_number2 = n2 || "";
      }
      const { data } = await api.patch(`me/`, payload);
      qc.setQueryData(["me"], (prev: any) => ({
        ...(prev || {}),
        first_name: payload.first_name ?? prev?.first_name,
        last_name: payload.last_name ?? prev?.last_name,
        image: prev?.image ?? null,
        profile:
          user.role === "CLIENT"
            ? {
                ...(prev?.profile || {}),
                address: (payload as any).address ?? prev?.profile?.address,
                extra_number1: (payload as any).extra_number1 ?? prev?.profile?.extra_number1,
                extra_number2: (payload as any).extra_number2 ?? prev?.profile?.extra_number2,
              }
            : prev?.profile,
      }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
      toast({ 
        title: t("client.profile.toast.updateSuccess"),
        duration: 3000, // Auto-dismiss after 3 seconds
      });
    } catch (error: any) {
      // Parse error to show specific messages
      let errorMessage = error.message || t("auth.error");
      let errorTitle = t("auth.error");
      
      // Check if it's a duplicate phone number error
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Backend may return errors in different formats:
        // 1. Direct: { extra_number1: "message" }
        // 2. Nested: { errors: { extra_number1: "message" } }
        const errorsObj = errorData.errors || errorData;
        
        // Check for duplicate phone in extra_number1
        if (errorsObj.extra_number1) {
          const msg = Array.isArray(errorsObj.extra_number1) 
            ? errorsObj.extra_number1[0] 
            : errorsObj.extra_number1;
          
          if (typeof msg === 'string' && (
            msg.toLowerCase().includes('already') || 
            msg.toLowerCase().includes('in use') ||
            msg.toLowerCase().includes('exist') ||
            msg.toLowerCase().includes('duplicate') ||
            msg.toLowerCase().includes('использует') ||
            msg.toLowerCase().includes('mavjud')
          )) {
            errorTitle = t("client.profile.error.duplicatePhone");
            errorMessage = t("client.profile.error.phoneAlreadyInUse", { phone: formData.extra_number1 });
          } else {
            errorMessage = msg;
          }
        }
        
        // Check for duplicate phone in extra_number2
        if (errorsObj.extra_number2) {
          const msg = Array.isArray(errorsObj.extra_number2) 
            ? errorsObj.extra_number2[0] 
            : errorsObj.extra_number2;
          
          if (typeof msg === 'string' && (
            msg.toLowerCase().includes('already') || 
            msg.toLowerCase().includes('in use') ||
            msg.toLowerCase().includes('exist') ||
            msg.toLowerCase().includes('duplicate') ||
            msg.toLowerCase().includes('использует') ||
            msg.toLowerCase().includes('mavjud')
          )) {
            errorTitle = t("client.profile.error.duplicatePhone");
            errorMessage = t("client.profile.error.phoneAlreadyInUse", { phone: formData.extra_number2 });
          } else {
            errorMessage = msg;
          }
        }
        
        // Check for general non_field_errors
        if (errorsObj.non_field_errors) {
          const msg = Array.isArray(errorsObj.non_field_errors) 
            ? errorsObj.non_field_errors[0] 
            : errorsObj.non_field_errors;
          errorMessage = msg;
        }
        
        // Check for detail field
        if (errorData.detail && typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      }
      
      toast({ 
        title: errorTitle,
        description: errorMessage, 
        variant: "destructive",
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (file?: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.patch(`me/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.image) setImageUrl(data.image as string);
      qc.setQueryData(["me"], (prev: any) => ({ ...(prev || {}), image: data?.image ?? prev?.image ?? null }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast({ 
        title: t("client.profile.toast.photoUpdateSuccess"),
        duration: 3000, // Auto-dismiss after 3 seconds
      });
    } catch (error: any) {
      let errorMessage = error.message || t("auth.error");
      
      // Better error parsing for avatar upload
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.image) {
          errorMessage = Array.isArray(errorData.image) ? errorData.image[0] : errorData.image;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      }
      
      toast({ 
        title: t("auth.error"), 
        description: errorMessage, 
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Validate phone number format
  const validatePhone = (value: string): boolean => {
    if (!value) return true; // Optional field
    const normalized = normalizePhone(value);
    return phoneRegex.test(normalized);
  };

  // Handle invalid event for Safari compatibility
  const handleExtra1Invalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;
    
    if (value && !validatePhone(value)) {
      input.setCustomValidity(t("client.profile.phoneInvalid") || "Please enter a valid phone number");
    } else {
      input.setCustomValidity("");
    }
  };

  const handleExtra2Invalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = input.value;
    
    if (value && !validatePhone(value)) {
      input.setCustomValidity(t("client.profile.phoneInvalid") || "Please enter a valid phone number");
    } else {
      input.setCustomValidity("");
    }
  };

  return (
    <Card className="border-0 shadow-elegant overflow-hidden hover:shadow-glow transition-all">
      <div className="bg-gradient-card border-b p-6">
        <CardHeader className="p-0">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-hero rounded-lg shadow-md">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            {t("client.profile.title")}
          </CardTitle>
          <CardDescription className="text-base mt-2">{t("client.profile.subtitleExtended")}</CardDescription>
        </CardHeader>
      </div>
      <CardContent className="p-6">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={imageUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="avatar" className="text-sm font-medium">{t("client.profile.photo")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input id="avatar" type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files?.[0])} />
                  <Button type="button" variant="outline" disabled={avatarUploading}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {avatarUploading ? t("client.profile.photo.uploading") : t("client.profile.photo.change")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-base font-medium">{t("client.profile.firstName")}</Label>
              <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-base font-medium">{t("client.profile.lastName")}</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="h-12" />
            </div>

            {user.role === "CLIENT" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-base font-medium">{t("client.profile.address")}</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_number1" className="text-base font-medium">{t("client.profile.extraPhone1")}</Label>
                  <Input
                    ref={extra1InputRef}
                    id="extra_number1"
                    type="tel"
                    inputMode="tel"
                    pattern="^\+?[0-9]{8,15}$"
                    placeholder={t("client.profile.phonePlaceholder")}
                    value={formData.extra_number1}
                    onChange={(e) => {
                      const val = e.target.value;
                      const v = val;
                      setFormData({ ...formData, extra_number1: v });
                      
                      // Clear custom validity when user types
                      if (extra1InputRef.current) {
                        extra1InputRef.current.setCustomValidity("");
                      }
                      
                      if (!v) {
                        setExtra1Error(null);
                      } else if (!phoneRegex.test(normalizePhone(v))) {
                        setExtra1Error(t("client.profile.phoneInvalid"));
                      } else if (formData.extra_number2 && normalizePhone(v) === normalizePhone(formData.extra_number2)) {
                        setExtra1Error(t("client.profile.phonesMustDiffer"));
                      } else {
                        setExtra1Error(null);
                      }
                    }}
                    onInvalid={handleExtra1Invalid}
                    className="h-12"
                  />
                  <p className={`text-xs ${extra1Error ? "text-destructive" : "text-muted-foreground"}`}>{extra1Error || t("client.profile.phone.helper")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_number2" className="text-base font-medium">{t("client.profile.extraPhone2")}</Label>
                  <Input
                    ref={extra2InputRef}
                    id="extra_number2"
                    type="tel"
                    inputMode="tel"
                    pattern="^\+?[0-9]{8,15}$"
                    placeholder={t("client.profile.phonePlaceholder")}
                    value={formData.extra_number2}
                    onChange={(e) => {
                      const val = e.target.value;
                      const v = val;
                      setFormData({ ...formData, extra_number2: v });
                      
                      // Clear custom validity when user types
                      if (extra2InputRef.current) {
                        extra2InputRef.current.setCustomValidity("");
                      }
                      
                      if (!v) {
                        setExtra2Error(null);
                      } else if (!phoneRegex.test(normalizePhone(v))) {
                        setExtra2Error(t("client.profile.phoneInvalid"));
                      } else if (formData.extra_number1 && normalizePhone(v) === normalizePhone(formData.extra_number1)) {
                        setExtra2Error(t("client.profile.phonesMustDiffer"));
                      } else {
                        setExtra2Error(null);
                      }
                    }}
                    onInvalid={handleExtra2Invalid}
                    className="h-12"
                  />
                  <p className={`text-xs ${extra2Error ? "text-destructive" : "text-muted-foreground"}`}>{extra2Error || t("client.profile.phone.helper")}</p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading || !!extra1Error || !!extra2Error} className="flex-1 h-12 hover-scale shadow-md">
                <Save className="w-5 h-5 mr-2" />
                {loading ? t("client.profile.saving") : t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  const p = (user?.profile as ClientProfile | undefined) || {};
                  setFormData({
                    first_name: user?.first_name ?? "",
                    last_name: user?.last_name ?? "",
                    address: p.address ?? "",
                    extra_number1: p.extra_number1 ?? "",
                    extra_number2: p.extra_number2 ?? "",
                  });
                }}
                className="h-12 px-6"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Header: Avatar + Name inline */}
            <div className="p-5 rounded-xl bg-gradient-card border hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {user?.image ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img src={user.image} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-1">{t("client.profile.firstName")}</div>
                  <div className="text-lg sm:text-xl font-semibold">{user?.first_name || "—"} {user?.last_name || ""}</div>
                </div>
              </div>
            </div>

            {/* Details list */}
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Phone className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-1">{t("client.profile.phonePrimary")}</div>
                  <div className="text-base font-semibold">{user?.phone_number || "—"}</div>
                </div>
              </div>

              {user.role === "CLIENT" && (
                <>
                  {(() => {
                    const profile = (user?.profile as ClientProfile | undefined) || {};
                    const address = profile.address ?? (user as any)?.address ?? "";
                    const extra1 = profile.extra_number1 ?? (user as any)?.extra_number1 ?? "";
                    const extra2 = profile.extra_number2 ?? (user as any)?.extra_number2 ?? "";
                    return (
                      <>
                        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                          <div className="p-2 bg-secondary/10 rounded-lg">
                            <MapPin className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-muted-foreground mb-1">{t("client.profile.address")}</div>
                            <div className="text-base font-semibold">{address || "—"}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                          <div className="p-2 bg-secondary/10 rounded-lg">
                            <PhoneCall className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-muted-foreground mb-1">{t("client.profile.extraPhone1")}</div>
                            <div className="text-base font-semibold">{extra1 || "—"}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                          <div className="p-2 bg-secondary/10 rounded-lg">
                            <PhoneCall className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-muted-foreground mb-1">{t("client.profile.extraPhone2")}</div>
                            <div className="text-base font-semibold">{extra2 || "—"}</div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <Button onClick={() => setEditing(true)} className="w-full h-12 text-base hover-scale shadow-md">
              {t("client.profile.edit")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
 