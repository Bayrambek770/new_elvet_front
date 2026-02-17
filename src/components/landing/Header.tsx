import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import elvetLogo from "@/assets/elvet_logo.jpg";
import { getRoleFromAccessToken, tokenStore } from "@/lib/apiClient";

const Header = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: "nav.services", href: "#services" },
    { label: "nav.about", href: "#about" },
    { label: "nav.team", href: "#team" },
    { label: "nav.gallery", href: "#gallery" },
    { label: "nav.reviews", href: "#reviews" },
    { label: "nav.contacts", href: "#contacts" },
  ];

  const access = tokenStore.access;
  const isAuthenticated = Boolean(access);
  const storedRole = tokenStore.role;
  const decodedRole = isAuthenticated ? getRoleFromAccessToken() : undefined;
  const role = (storedRole ?? decodedRole)?.toString().toUpperCase();
  const roleToPath: Record<string, string> = {
    ADMIN: "/dashboard/admin",
    MODERATOR: "/dashboard/moderator",
    DOCTOR: "/dashboard/doctor",
    NURSE: "/dashboard/nurse",
    CLIENT: "/dashboard/client",
  };
  const dashboardPath = role && roleToPath[role] ? roleToPath[role] : "/dashboard/client";

  const handlePrimaryCta = () => {
    navigate(isAuthenticated ? dashboardPath : "/auth");
  };

  const scrollToSection = (href: string) => {
    // Defer to next frame to avoid forced layout before CSS loads
    requestAnimationFrame(() => {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b animate-fade-in">
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer hover-scale" onClick={() => navigate("/")}>
            <img src={elvetLogo} alt="ELVET" className="w-12 h-12 rounded-xl object-cover shadow-glow border border-white/30" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
              <p className="text-xs text-muted-foreground">{t("hero.badge")}</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-sm font-medium hover:text-primary transition-colors story-link"
              >
                {t(item.label)}
              </button>
            ))}
            <LanguageSwitcher />
            <Button className="bg-gradient-hero hover:shadow-glow transition-all" onClick={handlePrimaryCta}>
              {isAuthenticated ? t("nav.dashboard") : t("nav.login")}
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t mt-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.href)}
                  className="text-sm font-medium hover:text-primary transition-colors text-left"
                >
                  {t(item.label)}
                </button>
              ))}
              <Button
                onClick={() => {
                  handlePrimaryCta();
                  setIsMenuOpen(false);
                }}
                className="w-full bg-gradient-hero"
              >
                {isAuthenticated ? t("nav.dashboard") : t("nav.login")}
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
