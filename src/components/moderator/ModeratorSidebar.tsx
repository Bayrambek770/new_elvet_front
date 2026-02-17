import { useState, useEffect, useCallback } from "react";
import {
  Home,
  ClipboardList,
  Calendar,
  Inbox,
  Users,
  UserPlus,
  Heart,
  ShoppingCart,
  Package,
  DollarSign,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ModeratorSidebarView =
  | "main"
  | "medical-cards"
  | "visits"
  | "requests"
  | "clients"
  | "add-client"
  | "nurse-care"
  | "feed-sales"
  | "feed-inventory"
  | "staff-income";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeView: ModeratorSidebarView;
  onNavigate: (view: ModeratorSidebarView) => void;
}

interface NavItem {
  id: ModeratorSidebarView;
  labelKey: string;
  icon: typeof Home;
  gradient: string;
}

const navItems: NavItem[] = [
  { id: "main", labelKey: "moderator.sidebar.main", icon: Home, gradient: "from-purple-500 to-violet-500" },
  { id: "medical-cards", labelKey: "moderator.sidebar.medicalCards", icon: ClipboardList, gradient: "from-blue-500 to-indigo-500" },
  { id: "visits", labelKey: "moderator.sidebar.visits", icon: Calendar, gradient: "from-sky-500 to-cyan-500" },
  { id: "requests", labelKey: "moderator.sidebar.requests", icon: Inbox, gradient: "from-amber-500 to-orange-500" },
  { id: "clients", labelKey: "moderator.sidebar.clients", icon: Users, gradient: "from-teal-500 to-emerald-500" },
  { id: "add-client", labelKey: "moderator.sidebar.addClient", icon: UserPlus, gradient: "from-green-500 to-emerald-500" },
  { id: "nurse-care", labelKey: "moderator.sidebar.nurseCare", icon: Heart, gradient: "from-rose-500 to-red-500" },
  { id: "feed-sales", labelKey: "moderator.sidebar.feedSales", icon: ShoppingCart, gradient: "from-orange-500 to-amber-500" },
  { id: "feed-inventory", labelKey: "moderator.sidebar.feedInventory", icon: Package, gradient: "from-slate-500 to-gray-500" },
  { id: "staff-income", labelKey: "moderator.sidebar.staffIncome", icon: DollarSign, gradient: "from-fuchsia-500 to-pink-500" },
];

export const ModeratorSidebar = ({ isOpen, onToggle, activeView, onNavigate }: SidebarProps) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && isMobile) {
        onToggle();
      }
    },
    [isOpen, isMobile, onToggle]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleNavClick = (view: ModeratorSidebarView) => {
    onNavigate(view);
    if (isMobile && isOpen) {
      onToggle();
    }
  };

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
          "fixed md:sticky top-0 left-0 h-screen bg-gradient-to-b from-purple-50 via-background to-violet-50 border-r border-primary/10 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-lg",
          isExpanded ? "w-64" : "w-16",
          isMobile && !isOpen && "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Toggle button */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b border-primary/10",
            !isExpanded && "justify-center"
          )}
        >
          {isExpanded && (
            <h2 className="text-sm font-semibold text-muted-foreground animate-fade-in">
              {t("moderator.sidebar.navigation", "Navigation")}
            </h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hover-scale"
            aria-label={isOpen ? t("moderator.sidebar.collapse", "Collapse") : t("moderator.sidebar.expand", "Expand")}
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
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                    : "text-muted-foreground hover:bg-muted/60 hover:scale-[1.02]",
                  !isExpanded && "justify-center px-2"
                )}
                title={!isExpanded ? t(item.labelKey, item.id) : undefined}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "animate-pulse")} />
                {isExpanded && (
                  <span className="text-sm font-medium truncate animate-fade-in">
                    {t(item.labelKey, item.id)}
                  </span>
                )}
              </button>
            );

            if (!isExpanded && !isMobile) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {t(item.labelKey, item.id)}
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
              {t("moderator.sidebar.hint", "Reception Dashboard")}
            </p>
          </div>
        )}
      </aside>

      {/* Mobile floating menu button */}
      {isMobile && !isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="fixed bottom-4 left-4 z-40 md:hidden shadow-lg hover-scale bg-background"
          aria-label={t("moderator.sidebar.expand", "Expand")}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}
    </TooltipProvider>
  );
};
