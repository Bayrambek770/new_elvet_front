import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, PawPrint, FileText, User, Bell, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { PetsManager } from "@/components/client/PetsManager";
import { AppointmentsManager } from "@/components/client/AppointmentsManager";
import { HistoryCardsViewer } from "@/components/client/HistoryCardsViewer"; // Changed from MedicalCardsViewer and NurseCareCardsViewer
import { ProfileEditor } from "@/components/client/ProfileEditor";
import { useMe, useRevisitReminder } from "@/hooks/api";
import { tokenStore } from "@/lib/apiClient";
import elvetLogo from "@/assets/elvet_logo.jpg";

const DISMISSED_KEY = "dismissed_revisit_reminders";

const getDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = new URLSearchParams(location.search).get("public") === "1";
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: me, isLoading: loading } = useMe();
  const { data: revisitReminders = [] } = useRevisitReminder();

  // IDs of banners dismissed this session (backed by localStorage)
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  const dismissReminder = (id: number, revisitDate: string) => {
    const key = `${id}_${revisitDate}`;
    const next = [...dismissed, key];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  const activeReminders = revisitReminders.filter(
    (r) => !dismissed.includes(`${r.id}_${r.revisit_date}`)
  );

  const formatRevisitDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
  };

  useEffect(() => {
    if (!isPublic && !loading && !me) {
      // If unauthenticated, ProtectedRoute will redirect; this is a safeguard.
      navigate("/auth");
    }
  }, [isPublic]);

  const handleLogout = async () => {
    tokenStore.clear();
    toast({
      title: t("dashboard.logout"),
      description: t("client.logout.goodbye"),
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center animate-fade-in">
          <div className="inline-block p-4 bg-card rounded-2xl shadow-elegant mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary" />
          </div>
          <p className="text-muted-foreground font-medium">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Modern Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition hover:opacity-90 hover-scale animate-fade-in"
              aria-label={t("common.goHome")}
            >
              <img src={elvetLogo} alt="ELVET" className="w-12 h-12 rounded-xl object-cover shadow-glow border border-white/30" />
              <div className="text-left">
                <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
                <p className="text-xs text-muted-foreground">{t("dashboard.client")}</p>
              </div>
            </button>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="hover-scale shadow-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("dashboard.logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6 space-y-6">
        {/* Hero Welcome Card */}
        <Card className="overflow-hidden border-0 shadow-elegant animate-fade-in">
          <div className="bg-gradient-hero p-8 text-primary-foreground relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
            <div className="relative flex items-center gap-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/40 flex items-center justify-center">
                  {me?.image ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img src={me.image} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1">
                  {t("dashboard.welcome")}, {me?.first_name ? `${me.first_name}` : t("client.hero.fallbackRole")}! 👋
                </h2>
                <p className="text-primary-foreground/90 text-lg">
                  {t("client.dashboard.welcomeSubtitle")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Revisit Reminder Banners */}
        {activeReminders.map((reminder) => (
          <div
            key={`${reminder.id}_${reminder.revisit_date}`}
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm animate-fade-in"
          >
            <Bell className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="flex-1 text-sm text-amber-900 font-medium">
              {t("client.revisit.reminder", {
                petName: reminder.pet_name || t("client.medicalCards.petFallback"),
                date: formatRevisitDate(reminder.revisit_date),
              })}
            </p>
            <button
              type="button"
              onClick={() => dismissReminder(reminder.id, reminder.revisit_date)}
              aria-label={t("client.revisit.dismiss")}
              className="text-amber-500 hover:text-amber-700 flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Enhanced Tabs */}
        <Tabs defaultValue="pets" className="space-y-5">
          <TabsList className="bg-card/80 shadow-md border p-2 h-auto rounded-2xl backdrop-blur-sm inline-flex w-full overflow-x-auto gap-2 justify-start scrollbar-hide">
            <TabsTrigger 
              value="pets" 
              className="flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/40 data-[state=inactive]:hover:bg-muted/60 transition-all whitespace-nowrap"
            >
              <PawPrint className="w-4 h-4" />
              <span>{t("dashboard.myPets")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history-cards" 
              className="flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-sky-500/40 data-[state=inactive]:hover:bg-muted/60 transition-all whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t("client.tabs.historyCards")}</span>
              <span className="sm:hidden">{t("client.tabs.historyCardsShort")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-pink-500/40 data-[state=inactive]:hover:bg-muted/60 transition-all whitespace-nowrap"
            >
              <User className="w-4 h-4" />
              <span>{t("dashboard.profile")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pets" className="space-y-5 animate-fade-in">
            {me && <PetsManager userId={String(me.id)} role={me.role ?? "CLIENT"} />}
          </TabsContent>

          <TabsContent value="history-cards" className="space-y-5 animate-fade-in">
            {me && <HistoryCardsViewer userId={String(me.id)} />}
          </TabsContent>

          <TabsContent value="profile" className="space-y-5 animate-fade-in">
            <ProfileEditor user={me} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDashboard;
