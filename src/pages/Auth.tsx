import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLogin } from "@/hooks/api";
import { Me, Users, type MeResponse } from "@/lib/api";
import { getRoleFromAccessToken, getUserIdFromAccessToken, tokenStore } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [apiLogin, setApiLogin] = useState({ phone_number: "", password: "" });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { mutateAsync: apiLoginMutate, isPending: apiAuthLoading } = useLogin();

  const normalizePhone = (val: string) => {
    const digits = (val || "").replace(/\D/g, "");
    let rest = digits;
    if (rest.startsWith("998")) rest = rest.slice(3);
    rest = rest.slice(0, 9);
    return rest.length ? `+998${rest}` : "";
  };

  const formatUzPhoneMasked = (val: string) => {
    const digits = (val || "").replace(/\D/g, "");
    let rest = digits;
    if (rest.startsWith("998")) rest = rest.slice(3);
    const s1 = rest.slice(0, 2);
    const s2 = rest.slice(2, 5);
    const s3 = rest.slice(5, 7);
    const s4 = rest.slice(7, 9);
    if (!s1 && !s2 && !s3 && !s4) return "";
    let out = "+998";
    if (s1) out += `-${s1}`;
    if (s2) out += `-${s2}`;
    if (s3) out += `-${s3}`;
    if (s4) out += `-${s4}`;
    return out;
  };

  const phoneRegex = /^\+998\d{9}$/;

  const handleApiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(apiLogin.phone_number);
    if (!phoneRegex.test(normalized)) {
      setPhoneError(t("auth.invalidPhone"));
      return;
    }
    try {
      await apiLoginMutate({ phone_number: normalized, password: apiLogin.password });
      // Ensure cache is cleared and invalidated (useLogin hook handles this, but double-check)
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["me"] });
      
      let role: string | undefined = undefined;
      try {
        const me: MeResponse = await Me.get();
        role = (me?.role as unknown as string | undefined) ?? undefined;
      } catch {
        role = getRoleFromAccessToken();
        if (!role) {
          const uid = getUserIdFromAccessToken();
          if (uid !== undefined) {
            try {
              const user = await Users.get(uid);
              role = (user as unknown as { role?: string })?.role;
            } catch {}
          }
        }
      }
      const norm = String(role ?? "CLIENT").toUpperCase();
      tokenStore.setRole(norm);
      const roleToPath: Record<string, string> = {
        CLIENT: "/dashboard/client",
        DOCTOR: "/dashboard/doctor",
        ADMIN: "/dashboard/admin",
        NURSE: "/dashboard/nurse",
        MODERATOR: "/dashboard/moderator",
      };
      const destination = roleToPath[norm] ?? "/dashboard/client";
      toast({ title: t("auth.loginSuccess"), description: t("auth.welcome") });
      navigate(destination);
    } catch (error: any) {
      toast({ title: t("auth.loginError"), description: error?.message ?? "Login failed", variant: "destructive" });
    }
  };

  const handleTelegramRegistration = () => {
    window.open('https://t.me/elvet_clinic_bot?start=signup', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 animate-fade-in">
      <div className="w-full max-w-6xl">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8 animate-scale-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center shadow-glow">
              <Heart className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">{t("auth.title")}</h1>
          <p className="text-muted-foreground text-lg">{t("auth.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-[1fr,400px] gap-8">
          <Card className="border-2 hover:shadow-glow transition-all">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">{t("auth.login")}</CardTitle>
              <CardDescription className="text-center text-base">{t("auth.loginByMethod")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="api-login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="api-login">{t("auth.login")}</TabsTrigger>
                  <TabsTrigger value="registration">{t("auth.registration")}</TabsTrigger>
                </TabsList>

                <TabsContent value="api-login">
                  <form onSubmit={handleApiLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-phone" className="text-base">{t("auth.phone")}</Label>
                      <Input
                        id="api-phone"
                        type="tel"
                        placeholder={"+998-XX-XXX-XX-XX"}
                        value={apiLogin.phone_number}
                        onChange={(e) => {
                          const masked = formatUzPhoneMasked(e.target.value);
                          setApiLogin({ ...apiLogin, phone_number: masked });
                          if (masked.length === 0) setPhoneError(null);
                          else {
                            const n = normalizePhone(masked);
                            setPhoneError(phoneRegex.test(n) ? null : t("auth.invalidPhone"));
                          }
                        }}
                        required
                        className="h-12 text-lg"
                      />
                      <p className={`text-xs mt-1 ${phoneError ? "text-destructive" : "text-muted-foreground"}`}>{phoneError ? phoneError : t("auth.phoneHelper")}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-password" className="text-base">{t("auth.password")}</Label>
                      <div className="relative">
                        <Input
                          id="api-password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.passwordPlaceholder")}
                          value={apiLogin.password}
                          onChange={(e) => setApiLogin({ ...apiLogin, password: e.target.value })}
                          required
                          className="h-12 pr-12"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-12 text-base" disabled={apiAuthLoading}>
                      {apiAuthLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      {t("auth.loginButton")}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="registration">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border-2 border-primary/20 text-center space-y-4">
                      <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center mx-auto shadow-glow">
                        <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.098.155.23.171.324.016.094.036.308.02.475z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{t("auth.registerViaTelegram")}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t("auth.telegramRegisterDesc")}</p>
                      </div>
                      <Button type="button" onClick={handleTelegramRegistration} className="w-full h-12 text-base gap-2" size="lg">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.098.155.23.171.324.016.094.036.308.02.475z"/>
                        </svg>
                        {t("auth.registerViaTelegram")}
                      </Button>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center">{t("auth.telegramNote")}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex flex-col justify-center items-center gap-6 p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-primary/20">
            <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center shadow-glow">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">{t("auth.visitClinic")}</h2>
              <p className="text-muted-foreground text-lg">{t("auth.professionalCare")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-8">
          <Button variant="outline" onClick={() => window.open('https://t.me/Ahmad_Abdukayumov', '_blank')} className="h-12 px-6 text-base gap-2 border-2 hover:bg-primary/5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.098.155.23.171.324.016.094.036.308.02.475z"/>
            </svg>
            {t("auth.contactTelegram")}
          </Button>
          
          <Button variant="link" onClick={() => navigate("/")} className="text-base gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("auth.backToHome")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
