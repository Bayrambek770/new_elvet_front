import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { tokenStore, api } from "@/lib/apiClient";
import { useMe } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, LogOut, User, Image as ImageIcon, Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import cashImg from "@/assets/cost.png";
import clickImg from "@/assets/click-logo.png";
import paymeImg from "@/assets/payme-logo.png";
import otherImg from "@/assets/other.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { MedicalCards, Medicines, Services, Pets, Visits, Requests as RequestsApi, ServiceUsages, MedicineUsages, Clients, Doctors, Utils, PaymentTransactions } from "@/lib/api";
import { FeedSalesManager } from "@/components/moderator/FeedSalesManager";
import FeedInventory from "@/components/moderator/FeedInventory";
import { ModeratorNurseCareCardsManager } from "@/components/moderator/NurseCareCardsManager";
import elvetLogo from "@/assets/elvet_logo.jpg";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ModeratorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = new URLSearchParams(location.search).get("public") === "1";
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [kpis, setKpis] = useState({ medicinesAvailable: 0, servicesCount: 0, visitsCount: 0 });

  // Medical cards (waiting for payment)
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [waitingCards, setWaitingCards] = useState<any[]>([]);
  const [partlyCards, setPartlyCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cardServices, setCardServices] = useState<any[]>([]);
  const [cardMedicines, setCardMedicines] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CLICK" | "PAYME" | "OTHER" | "">("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Clients state (for list tab)
  const [clientsPage, setClientsPage] = useState<{ count?: number; next?: string | null; previous?: string | null; results: any[] }>({ results: [] });
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientFilterId, setClientFilterId] = useState<string>("");
  const [clientFilterName, setClientFilterName] = useState<string>("");
  const [clientFilterPhone, setClientFilterPhone] = useState<string>("");

  // Visits state
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsPage, setVisitsPage] = useState<{ count?: number; next?: string | null; previous?: string | null; results: any[] }>({ results: [] });

  // Visit creation state
  const [visitClientId, setVisitClientId] = useState<string>("");
  const [visitDoctorId, setVisitDoctorId] = useState<string>("");
  const [visitPetId, setVisitPetId] = useState<string>("");
  const [visitCreating, setVisitCreating] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [petsList, setPetsList] = useState<any[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  // Name caches for visits rendering
  const [clientNames, setClientNames] = useState<Record<string | number, string>>({});
  const [doctorNames, setDoctorNames] = useState<Record<string | number, string>>({});
  const [petNames, setPetNames] = useState<Record<string | number, string>>({});

  // Password reset removed per requirement (no longer used)

  // Requests inbox (simplified listing)
  const [rqLoading, setRqLoading] = useState(false);
  const [rqPage, setRqPage] = useState<{ count?: number; next?: string | null; previous?: string | null; results: any[] }>({ results: [] });

  useEffect(() => {
    setLoading(false);
    void fetchKpis();
  }, [isPublic]);

  const fetchKpis = async () => {
    try {
      const [meds, serv, visits] = await Promise.all([
        Medicines.availableCount<{ count: number }>(),
        Services.count<{ count: number }>(),
        // Visits list used to derive total count (fallback to array length if not paginated)
        Visits.list<{ count?: number; results?: any[] }>().catch(() => ({ count: 0 })),
      ]);
      const visitsCount = (visits as any)?.count ?? (Array.isArray(visits) ? (visits as any).length : (visits as any)?.results?.length ?? 0);
      setKpis({ medicinesAvailable: meds.count || 0, servicesCount: serv.count || 0, visitsCount });
    } catch (e) {
      // ignore KPI errors for now, keep zeroes
    }
  };

  const loadWaitingCards = async () => {
    setWaitingLoading(true);
    try {
      // Try request with filters first (if backend supports); fallback to client-side filtering
      const data = await MedicalCards.list<any>({ payment_confirmed: false, is_paid: false, status: "WAITING_FOR_PAYMENT" } as any).catch(async () => await MedicalCards.list<any>());
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      const filtered = arr.filter((c: any) => {
        const paid = c.payment_confirmed ?? c.is_paid ?? false;
        const status = (c.status || "").toString().toUpperCase();
        return !paid || status.includes("WAITING") || status.includes("ОЖИДАЕТ");
      });
      setWaitingCards(filtered);
      // Also load partly-paid cards (best-effort)
      try {
        const partly = await MedicalCards.partlyPaid<any>();
        const pArr = Array.isArray(partly) ? partly : (partly as any)?.results || [];
        setPartlyCards(pArr);
      } catch {
        setPartlyCards([]);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить карты" });
    } finally {
      setWaitingLoading(false);
    }
  };

  useEffect(() => {
    void loadWaitingCards();
  }, []);

  // Auto-load client requests on initial mount
  useEffect(() => {
    void handleLoadRequests();
  }, []);

  // Load services and medicines for selected card
  useEffect(() => {
    const loadItems = async (cardId?: number) => {
      if (!cardId) return;
      setItemsLoading(true);
      try {
        const [servicesRes, medsRes] = await Promise.all([
          ServiceUsages.list<any>({ medical_card: cardId }).catch(() => ServiceUsages.list<any>({ card: cardId })),
          MedicineUsages.list<any>({ medical_card: cardId }).catch(() => MedicineUsages.list<any>({ card: cardId })),
        ]);
        const toArray = (d: any) => (Array.isArray(d) ? d : d?.results || []);
        setCardServices(toArray(servicesRes));
        setCardMedicines(toArray(medsRes));
      } catch (e: any) {
        toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить позиции карты" });
        setCardServices([]);
        setCardMedicines([]);
      } finally {
        setItemsLoading(false);
      }
    };
    if (selectedCard?.id) {
      void loadItems(Number(selectedCard.id));
      void loadPayments(Number(selectedCard.id));
    } else {
      setCardServices([]);
      setCardMedicines([]);
      setItemsLoading(false);
      setPayments([]);
    }
  }, [selectedCard, toast]);

  const loadPayments = async (cardId: number) => {
    setPaymentsLoading(true);
    try {
      const data = await PaymentTransactions.list<any>({ medical_card: cardId });
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      setPayments(arr);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить платежи" });
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleSearchVisits = async () => {
    setVisitsLoading(true);
    try {
      const data = await Visits.list<{ count?: number; next?: string; previous?: string; results?: any[] }>();
      setVisitsPage({ count: (data as any).count, next: (data as any).next, previous: (data as any).previous, results: (data as any).results || (Array.isArray(data) ? (data as any) : []) });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить визиты" });
    } finally {
      setVisitsLoading(false);
    }
  };

  useEffect(() => {
    void handleSearchVisits();
  }, []);

  // Auto-load clients once on mount so the list is ready when the tab is opened
  useEffect(() => {
    void handleLoadClients();
  }, []);

  // Re-load clients when any filter changes (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      void handleLoadClients();
    }, 400);
    return () => clearTimeout(handler);
  }, [clientFilterId, clientFilterName, clientFilterPhone]);

  const handleLoadClients = async () => {
    setClientsLoading(true);
    try {
      const params: Record<string, any> = {};
      if (clientFilterId.trim()) params.id = clientFilterId.trim();
      if (clientFilterName.trim()) params.name = clientFilterName.trim();
      if (clientFilterPhone.trim()) params.phone_number = clientFilterPhone.trim();

      const data = await Clients.list<{ count?: number; next?: string | null; previous?: string | null; results?: any[] }>(params as any);

      // Normalize to array
      const rawResults: any[] = Array.isArray(data) ? (data as any[]) : ((data as any)?.results || []);

      // Apply strict client-side filtering so wrong input always hides rows
      const idQuery = clientFilterId.trim();
      const nameQuery = clientFilterName.trim().toLowerCase();
      const phoneQuery = clientFilterPhone.trim().toLowerCase();

      const filteredResults = rawResults.filter((c: any) => {
        const idStr = c?.id != null ? String(c.id) : "";
        const nameStr = [
          c?.full_name,
          c?.name,
          c?.username,
          c?.first_name,
          c?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const phoneStr = [
          c?.phone_number,
          c?.phone,
          c?.extra_number1,
          c?.extra_number2,
          c?.profile?.extra_number1,
          c?.profile?.extra_number2,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const idOk = idQuery ? idStr.includes(idQuery) : true;
        const nameOk = nameQuery ? nameStr.includes(nameQuery) : true;
        const phoneOk = phoneQuery ? phoneStr.includes(phoneQuery) : true;

        return idOk && nameOk && phoneOk;
      });

      setClientsPage({
        count: filteredResults.length,
        next: null,
        previous: null,
        results: filteredResults,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить клиентов" });
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchClientsPageByUrl = async (url?: string | null) => {
    if (!url) return;
    setClientsLoading(true);
    try {
      // Preserve current search term when navigating between pages if backend supports it via query params on next/previous URLs
      const data = await api.get(url).then((r) => r.data);
      setClientsPage({
        count: data?.count,
        next: data?.next ?? null,
        previous: data?.previous ?? null,
        results: data?.results || [],
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить клиентов" });
    } finally {
      setClientsLoading(false);
    }
  };

  const loadLists = async (clientIdForPets?: string) => {
    setListsLoading(true);
    try {
      const [clients, doctors, pets] = await Promise.all([
        Clients.list<any>().catch(() => []),
        Doctors.list<any>().catch(() => []),
        Pets.list<any>(clientIdForPets ? { client: clientIdForPets } as any : undefined).catch(() => []),
      ]);
      setClientsList(Array.isArray(clients) ? clients : (clients as any)?.results || []);
      setDoctorsList(Array.isArray(doctors) ? doctors : (doctors as any)?.results || []);
      setPetsList(Array.isArray(pets) ? pets : (pets as any)?.results || []);
      // Seed name maps from fetched lists (best-effort)
      const cMap: Record<string | number, string> = {};
      (Array.isArray(clients) ? clients : (clients as any)?.results || []).forEach((c: any) => {
        const candidate = c.full_name ?? c.name ?? c.username ?? [c.first_name, c.last_name].filter(Boolean).join(" ");
        if (candidate) cMap[c.id] = candidate;
      });
      const dMap: Record<string | number, string> = {};
      (Array.isArray(doctors) ? doctors : (doctors as any)?.results || []).forEach((d: any) => {
        const candidate = d.full_name ?? d.name ?? d.username ?? d.user?.full_name ?? [d.first_name, d.last_name].filter(Boolean).join(" ");
        if (candidate) dMap[d.id] = candidate;
      });
      const pMap: Record<string | number, string> = {};
      (Array.isArray(pets) ? pets : (pets as any)?.results || []).forEach((p: any) => {
        const candidate = p.name ?? p.nickname;
        if (candidate) pMap[p.id] = candidate;
      });
      setClientNames((prev) => ({ ...prev, ...cMap }));
      setDoctorNames((prev) => ({ ...prev, ...dMap }));
      setPetNames((prev) => ({ ...prev, ...pMap }));
    } finally {
      setListsLoading(false);
    }
  };

  useEffect(() => {
    void loadLists();
  }, []);

  useEffect(() => {
    // Reload pets for selected client in creation form
    if (visitClientId) {
      void loadLists(visitClientId);
    }
  }, [visitClientId]);

  const handleCreateVisit = async () => {
    if (!visitClientId || !visitDoctorId || !visitPetId) {
      toast({ variant: "destructive", title: "Проверьте поля", description: "Выберите клиента, врача и питомца" });
      return;
    }
    setVisitCreating(true);
    try {
      await Visits.create({ client: Number(visitClientId), doctor: Number(visitDoctorId), pet: Number(visitPetId) });
      toast({ title: "Визит создан" });
      setVisitClientId("");
      setVisitDoctorId("");
      setVisitPetId("");
      await handleSearchVisits();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось создать визит" });
    } finally {
      setVisitCreating(false);
    }
  };

  // After visits load, resolve missing names by fetching individually (cached)
  useEffect(() => {
    const resolve = async () => {
      const missingClients = new Set<string | number>();
      const missingDoctors = new Set<string | number>();
      const missingPets = new Set<string | number>();
      for (const v of visitsPage.results) {
        if ((typeof v.client === 'number' || typeof v.client === 'string') && !clientNames[v.client]) missingClients.add(v.client);
        if ((typeof v.doctor === 'number' || typeof v.doctor === 'string') && !doctorNames[v.doctor]) missingDoctors.add(v.doctor);
        if ((typeof v.pet === 'number' || typeof v.pet === 'string') && !petNames[v.pet]) missingPets.add(v.pet);
      }
      try {
        await Promise.all([
          ...Array.from(missingClients).map(async (id) => {
            try {
              const c = await Clients.get<any>(id);
              const candidate = c?.full_name ?? c?.name ?? c?.username ?? [c?.first_name, c?.last_name].filter(Boolean).join(' ');
              if (candidate) setClientNames((prev) => ({ ...prev, [id]: candidate }));
            } catch {}
          }),
          ...Array.from(missingDoctors).map(async (id) => {
            try {
              const d = await Doctors.get<any>(id);
              const candidate = d?.full_name ?? d?.name ?? d?.username ?? d?.user?.full_name ?? [d?.first_name, d?.last_name].filter(Boolean).join(' ');
              if (candidate) setDoctorNames((prev) => ({ ...prev, [id]: candidate }));
            } catch {}
          }),
          ...Array.from(missingPets).map(async (id) => {
            try {
              const p = await Pets.get<any>(id);
              const candidate = p?.name ?? p?.nickname;
              if (candidate) setPetNames((prev) => ({ ...prev, [id]: candidate }));
            } catch {}
          }),
        ]);
      } catch {
        // ignore name resolution errors
      }
    };
    if (visitsPage.results?.length) void resolve();
  }, [visitsPage.results, clientNames, doctorNames, petNames]);

  const fetchPageByUrl = async (url?: string | null) => {
    if (!url) return null;
    const { data } = await api.get(url);
    return data;
  };

  const handleVisitsPageNav = async (dir: "next" | "previous") => {
    const url = dir === "next" ? visitsPage.next : visitsPage.previous;
    if (!url) return;
    setVisitsLoading(true);
    try {
      const data = await fetchPageByUrl(url);
      setVisitsPage({ count: data?.count, next: data?.next, previous: data?.previous, results: data?.results || [] });
    } finally {
      setVisitsLoading(false);
    }
  };

  // handlePasswordReset removed

  const handleLoadRequests = async (url?: string) => {
    setRqLoading(true);
    try {
      const raw = url ? (await fetchPageByUrl(url)) : await RequestsApi.list<any>();
      // Normalize various possible backend shapes:
      // 1) Paginated: { count, next, previous, results: [...] }
      // 2) Plain array: [...]
      // 3) Wrapped with data/results alternative naming
      let results: any[] = [];
      let count: number | undefined = undefined;
      let next: string | null | undefined = undefined;
      let previous: string | null | undefined = undefined;
      if (Array.isArray(raw)) {
        results = raw;
        count = raw.length;
      } else if (raw && typeof raw === 'object') {
        const maybeResults = (raw.results || raw.items || raw.data || raw.list);
        if (Array.isArray(maybeResults)) {
          results = maybeResults;
          count = raw.count ?? maybeResults.length;
          next = raw.next ?? null;
          previous = raw.previous ?? null;
        } else {
          // Single object? wrap it for display
          results = [raw];
          count = 1;
        }
      }
      setRqPage({ count, next, previous, results });
      // Fallback: if empty but no error and not loading a specific page, attempt alternative endpoint without trailing slash
      if (!url && results.length === 0) {
        try {
          const alt = await api.get('requests').then(r => r.data);
          if (Array.isArray(alt) && alt.length) {
            setRqPage({ count: alt.length, next: null, previous: null, results: alt });
          } else if (alt?.results && Array.isArray(alt.results) && alt.results.length) {
            setRqPage({ count: alt.count ?? alt.results.length, next: alt.next ?? null, previous: alt.previous ?? null, results: alt.results });
          }
        } catch {}
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e?.message || "Не удалось загрузить запросы" });
    } finally {
      setRqLoading(false);
    }
  };

  const handleLogout = async () => {
    tokenStore.clear();
    toast({
      title: t("dashboard.logout"),
      description: "До свидания!",
    });
    navigate("/");
  };

  const handleBannerImageChange = async (file?: File | null) => {
    if (!file) return;
    setBannerUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.patch(`me/`, form, { headers: { "Content-Type": "multipart/form-data" } });
      qc.setQueryData(["me"], (prev: any) => ({ ...(prev || {}), image: data?.image ?? prev?.image ?? null }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Фото обновлено" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось обновить фото", variant: "destructive" });
    } finally {
      setBannerUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="animate-pulse">
          <Heart className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
        <div className="container px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition hover:opacity-90 hover-scale"
            aria-label="Вернуться на главную"
          >
            <img src={elvetLogo} alt="ELVET" className="w-12 h-12 rounded-xl object-cover shadow-glow border border-white/30" />
            <div className="text-left">
              <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
              <p className="text-xs text-muted-foreground">{t("dashboard.moderator")}</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="outline" onClick={handleLogout} className="gap-2 hover-scale">
              <LogOut className="w-4 h-4" />
              {t("dashboard.logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-8">
        {/* Hero Welcome Card with inline avatar change */}
        <Card className="overflow-hidden border-0 shadow-elegant animate-fade-in mb-8">
          <div className="bg-gradient-hero p-8 text-primary-foreground relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
            <div className="relative flex items-center gap-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/40 flex items-center justify-center relative group">
                  {me?.image ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img src={me.image} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" />
                  )}
                  <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBannerImageChange(e.target.files?.[0])} />
                    <span className="inline-flex items-center gap-2 text-xs font-medium bg-white/90 text-black px-3 py-1 rounded-full shadow">
                      <ImageIcon className="w-4 h-4" /> {bannerUploading ? 'Загрузка…' : 'Изменить'}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1">
                  {t("dashboard.welcome")}, {me?.first_name ? `${me.first_name}` : "Модератор"}! 👤
                </h2>
                <p className="text-primary-foreground/90 text-lg">Панель модератора клиники</p>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-emerald-50 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">💊 {t("moderator.kpi.medicinesAvailable")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{kpis.medicinesAvailable}</div>
              <p className="text-xs text-muted-foreground mt-1">quantity &gt; 0</p>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-sky-50 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">🛠️ {t("moderator.kpi.servicesCount")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{kpis.servicesCount}</div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-fuchsia-50 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">📅 {t("moderator.kpi.visitsCount")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{kpis.visitsCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="medicalCards" className="w-full">
          <TabsList className="w-full mb-8 h-auto p-1 rounded-xl border bg-muted/40 grid grid-cols-1 sm:grid-cols-4 gap-2">
            {/* First row */}
            <TabsTrigger
              value="medicalCards"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted"
            >
              <span className="flex-shrink-0">🧾</span>
              <span className="truncate">{t("dashboard.medicalCards")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="visits"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">📅</span>
              <span className="truncate">{t("moderator.tabs.visits")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">📥</span>
              <span className="truncate">{t("moderator.tabs.requests")}</span>
            </TabsTrigger>

            {/* Second row */}
            <TabsTrigger
              value="clients"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">👥</span>
              <span className="truncate">Клиенты</span>
            </TabsTrigger>
            <TabsTrigger
              value="addUser"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-fuchsia-100 data-[state=active]:text-fuchsia-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">➕</span>
              <span className="truncate">Добавить пользователя</span>
            </TabsTrigger>
            <TabsTrigger
              value="nurseCare"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">🩺</span>
              <span className="truncate">Nurse Care</span>
            </TabsTrigger>
            <TabsTrigger
              value="feedSales"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-lime-100 data-[state=active]:text-lime-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">🍽️</span>
              <span className="truncate">Продажа кормов</span>
            </TabsTrigger>
            <TabsTrigger
              value="feedInventory"
              className="gap-2 py-3 rounded-lg transition flex items-center justify-center flex-shrink-0 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 hover:bg-muted"
            >
              <span className="flex-shrink-0">📦</span>
              <span className="truncate">Склад кормов</span>
            </TabsTrigger>
          </TabsList>

          {/* Medical Cards: Waiting for Payment */}
          <TabsContent value="medicalCards" className="space-y-6 animate-fade-in">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>{t("moderator.medicalCards.title")}</CardTitle>
                <CardDescription>{t("moderator.medicalCards.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Button variant="outline" onClick={loadWaitingCards} disabled={waitingLoading} className="gap-2">
                    {waitingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {t("moderator.medicalCards.refresh")}
                  </Button>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Питомец</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitingLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
                      ) : waitingCards.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>
                      ) : (
                        waitingCards.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.id}</TableCell>
                            <TableCell>{c.client?.full_name ?? c.client_name ?? c.client ?? "—"}</TableCell>
                            <TableCell>{c.pet?.name ?? c.pet_name ?? c.pet ?? "—"}</TableCell>
                            <TableCell>{c.total_amount ?? c.total ?? "—"}</TableCell>
                            <TableCell>{c.status ?? (c.payment_confirmed ? t("client.medicalCards.status.paid") : t("client.medicalCards.status.pending"))}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedCard(c)}>{t("common.view")}</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Partly-paid cards */}
                <div className="rounded-lg border mt-6 overflow-x-auto">
                  <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
                    <p className="font-semibold text-sm">Карты с частичной оплатой ({partlyCards.length})</p>
                    <span className="text-xs text-muted-foreground">Статус: PARTLY_PAID</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Питомец</TableHead>
                        <TableHead>Всего</TableHead>
                        <TableHead>Оплачено</TableHead>
                        <TableHead>Остаток</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitingLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            {t("common.loading")}
                          </TableCell>
                        </TableRow>
                      ) : partlyCards.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            {t("common.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        partlyCards.map((c: any) => (
                          <TableRow key={`partly-${c.id}`}>
                            <TableCell>{c.id}</TableCell>
                            <TableCell>{c.client?.full_name ?? c.client_name ?? c.client ?? "—"}</TableCell>
                            <TableCell>{c.pet?.name ?? c.pet_name ?? c.pet ?? "—"}</TableCell>
                            <TableCell>{c.total_fee ?? c.total_amount ?? c.total ?? "—"}</TableCell>
                            <TableCell>{c.amount_paid ?? "0"}</TableCell>
                            <TableCell>{c.outstanding_fee ?? "0"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => setSelectedCard(c)}
                              >
                                {t("common.view")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nurseCare" className="space-y-6 animate-fade-in">
            <ModeratorNurseCareCardsManager />
          </TabsContent>

          <TabsContent value="feedSales" className="space-y-6 animate-fade-in">
            <FeedSalesManager />
          </TabsContent>

          <TabsContent value="feedInventory" className="space-y-6 animate-fade-in">
            <FeedInventory />
          </TabsContent>

          {/* Clients list */}
          <TabsContent value="clients" className="space-y-6 animate-fade-in">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Клиенты</CardTitle>
                <CardDescription>Список всех клиентов клиники</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="clientFilterId">ID клиента</Label>
                    <Input
                      id="clientFilterId"
                      value={clientFilterId}
                      onChange={(e) => setClientFilterId(e.target.value)}
                      placeholder="Например: 123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientFilterName">Имя или фамилия</Label>
                    <Input
                      id="clientFilterName"
                      value={clientFilterName}
                      onChange={(e) => setClientFilterName(e.target.value)}
                      placeholder="Имя или фамилия клиента"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientFilterPhone">Телефон</Label>
                    <Input
                      id="clientFilterPhone"
                      value={clientFilterPhone}
                      onChange={(e) => setClientFilterPhone(e.target.value)}
                      placeholder="Поиск по телефону"
                    />
                  </div>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Имя</TableHead>
                        <TableHead>Фамилия</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Доп. телефон 1</TableHead>
                        <TableHead>Доп. телефон 2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            {t("common.loading")}
                          </TableCell>
                        </TableRow>
                      ) : clientsPage.results.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Нет клиентов для отображения
                          </TableCell>
                        </TableRow>
                      ) : (
                        clientsPage.results.map((c: any) => {
                          const firstName = c.first_name || "---";
                          const lastName = c.last_name || "---";
                          const phone = c.phone_number || c.phone || "---";
                          const extra1 = c.extra_phone_number1 || c.extra_number1 || "---";
                          const extra2 = c.extra_phone_number2 || c.extra_number2 || "---";
                          return (
                            <TableRow key={c.id}>
                              <TableCell>{c.id}</TableCell>
                              <TableCell>{firstName}</TableCell>
                              <TableCell>{lastName}</TableCell>
                              <TableCell>{phone}</TableCell>
                              <TableCell>{extra1}</TableCell>
                              <TableCell>{extra2}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    disabled={!clientsPage.previous || clientsLoading}
                    onClick={() => fetchClientsPageByUrl(clientsPage.previous)}
                  >
                    {t("common.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!clientsPage.next || clientsLoading}
                    onClick={() => fetchClientsPageByUrl(clientsPage.next)}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add user (client) */}
          <TabsContent value="addUser" className="space-y-6 animate-fade-in">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Регистрация нового клиента</CardTitle>
                <CardDescription>Создайте клиента, указав телефон и пароль. Имя и фамилия — необязательно.</CardDescription>
              </CardHeader>
              <AddClientForm />
            </Card>
          </TabsContent>

          {/* Visits */}
          <TabsContent value="visits" className="space-y-6 animate-fade-in">
            {/* Create Visit */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>{t("moderator.visits.create.title")}</CardTitle>
                <CardDescription>{t("moderator.visits.create.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Клиент</Label>
                    <Select value={visitClientId} onValueChange={(v) => setVisitClientId(v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={listsLoading ? "Загрузка…" : "Выберите клиента"} /></SelectTrigger>
                      <SelectContent>
                        {clientsList.map((c: any) => {
                          const candidate = c.full_name ?? c.name ?? c.username ?? [c.first_name, c.last_name].filter(Boolean).join(" ");
                          const label = candidate && candidate.length > 0 ? candidate : `#${c.id}`;
                          return (
                            <SelectItem key={`client-${c.id}`} value={String(c.id)}>{label}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Врач</Label>
                    <Select value={visitDoctorId} onValueChange={(v) => setVisitDoctorId(v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={listsLoading ? "Загрузка…" : "Выберите врача"} /></SelectTrigger>
                      <SelectContent>
                        {doctorsList.map((d: any) => {
                          const candidate = d.full_name ?? d.name ?? d.username ?? d.user?.full_name ?? [d.first_name, d.last_name].filter(Boolean).join(" ");
                          const label = candidate && candidate.length > 0 ? candidate : `#${d.id}`;
                          return (
                            <SelectItem key={`doctor-${d.id}`} value={String(d.id)}>{label}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Питомец</Label>
                    <Select value={visitPetId} onValueChange={(v) => setVisitPetId(v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={listsLoading ? "Загрузка…" : "Выберите питомца"} /></SelectTrigger>
                      <SelectContent>
                        {petsList.map((p: any) => (
                          <SelectItem key={`pet-${p.id}`} value={String(p.id)}>{p.name ?? p.nickname ?? `#${p.id}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Button onClick={handleCreateVisit} disabled={visitCreating} className="gap-2">
                    {visitCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {t("common.create")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>{t("moderator.visits.history.title")}</CardTitle>
                <CardDescription>{t("moderator.visits.history.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Button onClick={handleSearchVisits} disabled={visitsLoading} variant="outline" className="gap-2">
                    {visitsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {t("moderator.visits.refresh")}
                  </Button>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Врач</TableHead>
                        <TableHead>Питомец</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitsPage.results.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>
                      ) : (
                        visitsPage.results.map((v: any, idx: number) => (
                          <TableRow key={v.id ?? idx}>
                            <TableCell>{v.created_at ? new Date(v.created_at).toLocaleString("ru-RU") : "—"}</TableCell>
                            <TableCell>{v.client?.full_name ?? clientNames[v.client] ?? "—"}</TableCell>
                            <TableCell>{v.doctor?.full_name ?? doctorNames[v.doctor] ?? "—"}</TableCell>
                            <TableCell>{v.pet?.name ?? petNames[v.pet] ?? "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" disabled={!visitsPage.previous} onClick={() => handleVisitsPageNav("previous")}>{t("common.prev")}</Button>
                  <Button variant="outline" disabled={!visitsPage.next} onClick={() => handleVisitsPageNav("next")}>{t("common.next")}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests inbox */}
          <TabsContent value="requests" className="space-y-6 animate-fade-in">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>{t("moderator.requests.title")} {typeof rqPage.count === 'number' ? `(${rqPage.count})` : ''}</CardTitle>
                <CardDescription>{t("moderator.requests.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Button onClick={() => handleLoadRequests()} disabled={rqLoading} variant="outline" className="gap-2">
                    {rqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {t("moderator.requests.refresh")}
                  </Button>
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Имя</TableHead>
                        <TableHead>Фамилия</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Создано</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rqPage.results.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>
                      ) : (
                        rqPage.results.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.id}</TableCell>
                            <TableCell>{r.first_name || "—"}</TableCell>
                            <TableCell>{r.last_name || "—"}</TableCell>
                            <TableCell>{r.phone_number ?? r.phone ?? "—"}</TableCell>
                            <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString("ru-RU") : "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" disabled={!rqPage.previous} onClick={() => handleLoadRequests(rqPage.previous || undefined)}>{t("common.prev")}</Button>
                  <Button variant="outline" disabled={!rqPage.next} onClick={() => handleLoadRequests(rqPage.next || undefined)}>{t("common.next")}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modal: Medical card details and confirm payment */}
          {selectedCard && (
            <Dialog open={!!selectedCard} onOpenChange={(open) => { if (!open) setSelectedCard(null); }}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{t("moderator.card.modal.title", { id: selectedCard?.id })}</DialogTitle>
                  <DialogDescription>{t("moderator.card.modal.subtitle")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("moderator.card.modal.client")}</p>
                      <p className="font-medium">{selectedCard?.client?.full_name ?? selectedCard?.client_name ?? selectedCard?.client ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("moderator.card.modal.pet")}</p>
                      <p className="font-medium">{selectedCard?.pet?.name ?? selectedCard?.pet_name ?? selectedCard?.pet ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("moderator.card.modal.status")}</p>
                      <p className="font-medium">{selectedCard?.status ?? (selectedCard?.payment_confirmed ? t("client.medicalCards.status.paid") : t("client.medicalCards.status.pending"))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("moderator.card.modal.total")}</p>
                      <p className="font-semibold">{selectedCard?.total_fee ?? selectedCard?.total_amount ?? selectedCard?.total ?? "—"}</p>
                    </div>
                  </div>

                  {/* Payment summary */}
                  {typeof selectedCard?.total_fee !== "undefined" && (
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="p-3 border rounded-lg bg-background">
                        <p className="text-xs text-muted-foreground">Оплачено</p>
                        <p className="font-semibold">{selectedCard?.amount_paid ?? "0"}</p>
                      </div>
                      <div className="p-3 border rounded-lg bg-background">
                        <p className="text-xs text-muted-foreground">Остаток к оплате</p>
                        <p className="font-semibold">{selectedCard?.outstanding_fee ?? "0"}</p>
                      </div>
                      <div className="p-3 border rounded-lg bg-background flex flex-col justify-between">
                        <p className="text-xs text-muted-foreground mb-1">Прогресс оплаты</p>
                        {(() => {
                          const total = Number(selectedCard?.total_fee || selectedCard?.total_amount || 0);
                          const paid = Number(selectedCard?.amount_paid || 0);
                          const pct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
                          return (
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                              <div
                                className="h-2 bg-green-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedCard?.anamnesis && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Анамнез</p>
                      <div className="border rounded p-2 bg-muted/30 whitespace-pre-wrap text-sm">{selectedCard.anamnesis}</div>
                    </div>
                  )}

                  {selectedCard?.recommended_feed_text && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Рекомендованный корм врача</p>
                      <div className="border rounded p-2 bg-muted/30 whitespace-pre-wrap text-sm">
                        {selectedCard.recommended_feed_text}
                      </div>
                    </div>
                  )}

                  {/* Fee breakdown */}
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 border rounded-lg bg-background">
                      <p className="text-xs text-muted-foreground">Всего (total_fee)</p>
                      <p className="font-semibold">{selectedCard?.total_fee ?? selectedCard?.total_amount ?? selectedCard?.total ?? "—"}</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-background">
                      <p className="text-xs text-muted-foreground">Стационар (stationary_fee)</p>
                      <p className="font-semibold">{selectedCard?.stationary_fee ?? selectedCard?.stationary_total ?? "—"}</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-background">
                      <p className="text-xs text-muted-foreground">Препараты (medicines_fee)</p>
                      <p className="font-semibold">{selectedCard?.medicines_fee ?? selectedCard?.medicines_total ?? "—"}</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-background">
                      <p className="text-xs text-muted-foreground">Услуги (services_fee)</p>
                      <p className="font-semibold">{selectedCard?.services_fee ?? selectedCard?.services_total ?? "—"}</p>
                    </div>
                  </div>

                  {/* Used services */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Использованные услуги ({cardServices.length})</p>
                    {itemsLoading ? (
                      <p className="text-sm text-muted-foreground">Загрузка…</p>
                    ) : cardServices.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет услуг</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Услуга</TableHead>
                              <TableHead>Кол-во</TableHead>
                              <TableHead>Цена</TableHead>
                              <TableHead>Сумма</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cardServices.map((s: any, idx: number) => {
                              const name = s?.service?.name ?? s?.services?.name ?? s?.service_name ?? s?.name ?? `#${s?.id ?? idx}`;
                              const qty = s?.quantity ?? s?.qty ?? 1;
                              const price = s?.price ?? s?.unit_price ?? 0;
                              const total = Number(qty) * Number(price);
                              return (
                                <TableRow key={`svc-${s?.id ?? idx}`}>
                                  <TableCell>{name}</TableCell>
                                  <TableCell>{qty}</TableCell>
                                  <TableCell>{price} сум</TableCell>
                                  <TableCell className="font-semibold">{total} сум</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Used medicines */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Использованные препараты ({cardMedicines.length})</p>
                    {itemsLoading ? (
                      <p className="text-sm text-muted-foreground">Загрузка…</p>
                    ) : cardMedicines.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Нет препаратов</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Препарат</TableHead>
                              <TableHead>Кол-во</TableHead>
                              <TableHead>Цена</TableHead>
                              <TableHead>Сумма</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cardMedicines.map((m: any, idx: number) => {
                              const name = m?.medicine?.name ?? m?.medicines?.name ?? m?.medicine_name ?? m?.name ?? `#${m?.id ?? idx}`;
                              const qty = m?.quantity ?? m?.qty ?? 1;
                              const price = m?.price ?? m?.unit_price ?? 0;
                              const total = Number(qty) * Number(price);
                              return (
                                <TableRow key={`med-${m?.id ?? idx}`}>
                                  <TableCell>{name}</TableCell>
                                  <TableCell>{qty}</TableCell>
                                  <TableCell>{price} сум</TableCell>
                                  <TableCell className="font-semibold">{total} сум</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Payments list */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Платежи ({payments.length})</p>
                    {paymentsLoading ? (
                      <p className="text-sm text-muted-foreground">Загрузка…</p>
                    ) : payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Платежей пока нет</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Дата</TableHead>
                              <TableHead>Метод</TableHead>
                              <TableHead>Сумма</TableHead>
                              <TableHead>Комментарий</TableHead>
                              <TableHead>Кем принят</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((p: any, idx: number) => (
                              <TableRow key={p.id ?? idx}>
                                <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString("ru-RU") : "—"}</TableCell>
                                <TableCell>{p.method ?? "—"}</TableCell>
                                <TableCell>{p.amount ?? "—"}</TableCell>
                                <TableCell>{p.note ?? "—"}</TableCell>
                                <TableCell>{p.recorded_by ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment actions */}
                <div className="space-y-4 pt-4 border-t mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount">Сумма платежа</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={selectedCard?.outstanding_fee ?? "0"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Метод оплаты</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {["CASH", "CLICK", "PAYME", "OTHER"].map((m) => {
                          const isActive = paymentMethod === m;
                          const label =
                            m === "CASH" ? "Наличные" : m === "CLICK" ? "Click" : m === "PAYME" ? "Payme" : "Другое";
                          const imgSrc =
                            m === "CASH"
                              ? cashImg
                              : m === "CLICK"
                              ? clickImg
                              : m === "PAYME"
                              ? paymeImg
                              : otherImg;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPaymentMethod(m as any)}
                              className={`flex flex-col items-center justify-center rounded-xl border p-3 transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                              }`}
                            >
                              <img
                                src={imgSrc}
                                alt={label}
                                className={`${m === "OTHER" ? "h-12 w-12" : "h-13 w-13"} object-contain`}
                              />
                              {m === "OTHER" && (
                                <span className="mt-1 text-xs font-medium">{label}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentNote">Комментарий (необязательно)</Label>
                      <Input
                        id="paymentNote"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Например: первая часть платежа"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 flex-wrap">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedCard(null)}
                      >
                        {t("common.close")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={confirmLoading || !selectedCard?.id}
                        onClick={async () => {
                          if (!selectedCard?.id) return;
                          setConfirmLoading(true);
                          try {
                            await MedicalCards.confirmPayment(selectedCard.id, {
                              method: paymentMethod || undefined,
                              note: paymentNote || undefined,
                            });
                            toast({ title: t("common.confirmed") });
                            await loadWaitingCards();
                            if (selectedCard?.id) {
                              const updated = await MedicalCards.get<any>(selectedCard.id);
                              setSelectedCard(updated);
                              await loadPayments(Number(updated.id));
                            }
                          } catch (e: any) {
                            const msg = e?.response?.data || e?.message || t("common.error");
                            toast({ variant: "destructive", title: t("common.error"), description: JSON.stringify(msg) });
                          } finally {
                            setConfirmLoading(false);
                          }
                        }}
                        className="gap-2"
                      >
                        {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Полностью оплачен
                      </Button>
                      <Button
                        type="button"
                        disabled={paymentSubmitting || !selectedCard?.id}
                        className="gap-2"
                        onClick={async () => {
                          if (!selectedCard?.id) return;
                          const amountNum = Number(paymentAmount);
                          const outstanding = Number(selectedCard?.outstanding_fee ?? selectedCard?.total_fee ?? 0) - Number(selectedCard?.amount_paid ?? 0);
                          if (!paymentAmount || isNaN(amountNum) || amountNum <= 0) {
                            toast({ variant: "destructive", title: "Некорректная сумма", description: "Введите сумму больше нуля" });
                            return;
                          }
                          if (amountNum > outstanding && outstanding > 0) {
                            toast({ variant: "destructive", title: "Сумма больше остатка", description: `Максимум: ${outstanding}` });
                            return;
                          }
                          if (!paymentMethod) {
                            toast({ variant: "destructive", title: "Метод оплаты", description: "Выберите метод оплаты" });
                            return;
                          }
                          setPaymentSubmitting(true);
                          try {
                            const updated = await MedicalCards.receivePayment<any>(selectedCard.id, {
                              amount: amountNum.toFixed(2),
                              method: paymentMethod,
                              note: paymentNote || undefined,
                            });
                            setSelectedCard(updated);
                            await loadWaitingCards();
                            await loadPayments(Number(updated.id));
                            setPaymentAmount("");
                            toast({ title: "Платеж принят" });
                          } catch (e: any) {
                            const data = e?.response?.data;
                            let msg = e?.message || t("common.error");
                            if (data && typeof data === "object") {
                              msg = Object.values(data as any).flat().join("; ");
                            }
                            toast({ variant: "destructive", title: "Ошибка оплаты", description: msg });
                          } finally {
                            setPaymentSubmitting(false);
                          }
                        }}
                      >
                        {paymentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Принять частичный платеж
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default ModeratorDashboard;

// --- Local AddClientForm component ---

const AddClientForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    phone_number: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [usedPhones, setUsedPhones] = useState<Set<string> | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Basic regex for +998 XX XXX XX XX style numbers (at least country code + digits)
  const phoneRegex = /^\+?\d{9,15}$/;

  // Load used phones once (and refreshable if needed) when form mounts
  useEffect(() => {
    let cancelled = false;
    const loadUsed = async () => {
      try {
        setCheckingPhone(true);
        const data = await Utils.usedPhones();
        if (!cancelled) {
          setUsedPhones(new Set(data.results || []));
        }
      } catch {
        // If this fails, we still allow registration; just skip uniqueness check
      } finally {
        if (!cancelled) setCheckingPhone(false);
      }
    };
    void loadUsed();
    return () => {
      cancelled = true;
    };
  }, []);

  const validatePhone = (value: string) => {
    if (!phoneRegex.test(value)) {
      setPhoneError("Неверный формат телефона");
      return false;
    }
    if (usedPhones && usedPhones.has(value)) {
      setPhoneError("Этот номер уже используется");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.phone_number || !form.password) {
      toast({ variant: "destructive", title: "Проверьте поля", description: "Телефон и пароль обязательны" });
      return;
    }
    if (!validatePhone(form.phone_number)) {
      toast({ variant: "destructive", title: "Телефон некорректен", description: phoneError ?? "Проверьте номер телефона" });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        phone_number: form.phone_number,
        password: form.password,
        role: "CLIENT",
      };
      if (form.first_name) payload.first_name = form.first_name;
      if (form.last_name) payload.last_name = form.last_name;
      const created = await Clients.create<any>(payload);
      toast({ title: "Клиент создан", description: `ID: ${created?.id ?? "—"}` });
  setForm({ phone_number: "", password: "", first_name: "", last_name: "" });
  setPhoneError(null);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Не удалось создать клиента";
      toast({ variant: "destructive", title: "Ошибка", description: String(msg) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CardContent>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Телефон</Label>
            <Input
              id="phone_number"
              placeholder="+998901234567"
              value={form.phone_number}
              onChange={(e) => {
                const value = e.target.value;
                setForm((s) => ({ ...s, phone_number: value }));
                if (value) validatePhone(value);
              }}
              className={phoneError ? "border-red-500 focus-visible:ring-red-500" : undefined}
              required
            />
            {checkingPhone && !usedPhones && (
              <p className="text-xs text-muted-foreground">Проверка номера…</p>
            )}
            {phoneError && (
              <p className="text-xs text-red-500">{phoneError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Имя (необязательно)</Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Фамилия (необязательно)</Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Создать клиента
          </Button>
        </div>
      </form>
    </CardContent>
  );
};
