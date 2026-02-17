import { useState, useEffect, useCallback } from "react";
import { Home, FileText, RefreshCw, Pill, ChevronLeft, Menu, ClipboardList, Calendar, Wallet, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SidebarView = "main" | "procedures" | "medical-cards" | "nurse-care" | "medicines" | "schedule" | "salary";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
}

interface NavItem {
  id: SidebarView;
  labelKey: string;
  icon: typeof Home;
  gradient?: string;
}

export const Sidebar = ({ isOpen, onToggle, activeView, onNavigate }: SidebarProps) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen && isMobile) {
      onToggle();
    }
  }, [isOpen, isMobile, onToggle]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const navItems: NavItem[] = [
    { id: "main", labelKey: "nurse.sidebar.main", icon: Home, gradient: "from-emerald-500 to-teal-500" },
    { id: "procedures", labelKey: "nurse.sidebar.procedures", icon: ClipboardList, gradient: "from-emerald-500 to-teal-500" },
    { id: "medical-cards", labelKey: "nurse.sidebar.medicalCards", icon: FileText, gradient: "from-blue-500 to-indigo-500" },
    { id: "nurse-care", labelKey: "nurse.sidebar.nurseCare", icon: Heart, gradient: "from-rose-500 to-red-500" },
    { id: "medicines", labelKey: "nurse.sidebar.medicines", icon: Pill, gradient: "from-sky-500 to-indigo-500" },
    { id: "schedule", labelKey: "nurse.sidebar.schedule", icon: Calendar, gradient: "from-amber-500 to-orange-500" },
    { id: "salary", labelKey: "nurse.sidebar.salary", icon: Wallet, gradient: "from-fuchsia-500 to-pink-500" },
  ];

  const handleNavClick = (view: SidebarView) => {
    onNavigate(view);
    // Auto-close sidebar on mobile after navigation
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  // Determine if sidebar should be expanded (open or hovered on desktop)
  const isExpanded = isOpen || (!isMobile && isHovered);

  return (
    <TooltipProvider delayDuration={100}>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen bg-gradient-to-b from-emerald-50 via-background to-teal-50 border-r border-primary/10 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-lg",
          isExpanded ? "w-64" : "w-16",
          isMobile && !isOpen && "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Toggle button */}
        <div className={cn("flex items-center justify-between p-4 border-b border-primary/10", !isExpanded && "justify-center")}>
          {isExpanded && (
            <h2 className="text-sm font-semibold text-muted-foreground animate-fade-in">
              {t("nurse.sidebar.navigation")}
            </h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hover-scale"
            aria-label={isOpen ? t("nurse.sidebar.collapse") : t("nurse.sidebar.expand")}
          >
            {isMobile ? (
              <Menu className="w-5 h-5" />
            ) : (
              <ChevronLeft
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  !isOpen && "rotate-180"
                )}
              />
            )}
          </Button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            const button = (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? `bg-gradient-to-r ${item.gradient || "from-emerald-500 to-teal-500"} text-white shadow-md`
                    : "text-muted-foreground hover:bg-muted/60 hover:scale-[1.02]",
                  !isExpanded && "justify-center px-2"
                )}
                title={!isExpanded ? t(item.labelKey) : undefined}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "animate-pulse")} />
                {isExpanded && (
                  <span className="text-sm font-medium truncate animate-fade-in">
                    {t(item.labelKey)}
                  </span>
                )}
              </button>
            );

            // Wrap in tooltip when collapsed
            if (!isExpanded && !isMobile) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {t(item.labelKey)}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Footer hint (only when expanded) */}
        {isExpanded && (
          <div className="p-4 border-t border-primary/10 animate-fade-in">
            <p className="text-xs text-muted-foreground text-center">
              {t("nurse.sidebar.hint")}
            </p>
          </div>
        )}
      </aside>

      {/* Mobile menu button (fixed, always visible) */}
      {isMobile && !isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="fixed bottom-4 left-4 z-40 md:hidden shadow-lg hover-scale bg-background"
          aria-label={t("nurse.sidebar.expand")}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}
    </TooltipProvider>
  );
};
