import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { tokenStore } from "@/lib/apiClient";
import elvetLogo from "@/assets/elvet_logo.jpg";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const env = import.meta.env as Record<string, string | undefined>;
  const adminRedirectUrl =
    env.VITE_ADMIN_SHOULD_BE_REDIRECTED ??
    env.admin_should_be_redirected ??
    env.VITE_ADMIN_REDIRECT ??
    env.ADMIN_REDIRECT;

  const handleLogout = () => {
    tokenStore.clear();
    navigate("/");
  };

  const handleOpenAdminPanel = () => {
    if (!adminRedirectUrl) return;
    if (typeof window !== "undefined") {
      window.location.href = adminRedirectUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition hover:opacity-90"
            aria-label={t("admin.banner.goHome")}
          >
            <img src={elvetLogo} alt="ELVET" className="w-12 h-12 rounded-xl object-cover border border-white/30" />
            <div className="text-left">
              <h1 className="text-xl font-bold">ELVET</h1>
              <p className="text-xs text-muted-foreground">{t("dashboard.admin")}</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* <Button onClick={handleOpenAdminPanel} disabled={!adminRedirectUrl} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              ELVET Admin
            </Button> */}
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              {t("dashboard.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-24 flex flex-col items-center justify-center text-center gap-6">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold text-foreground">{t("dashboard.admin")}</h2>
          <p className="text-muted-foreground">
            {adminRedirectUrl
              ? t("admin.message.useAdminPanel")
              : t("admin.message.urlNotConfigured")}
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 px-8 py-6 text-lg"
          onClick={handleOpenAdminPanel}
          disabled={!adminRedirectUrl}
        >
          <ExternalLink className="w-5 h-5" />
          {t("admin.button.openAdmin")}
        </Button>
      </main>
    </div>
  );
};

export default AdminDashboard;
