import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut,
  Calendar,
  ClipboardList,
  User,
  Image as ImageIcon,
  Wallet,
  CheckCircle2,
  Clock4,
  Pill,
  PawPrint,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { HospitalizationTasks } from "@/components/nurse/HospitalizationTasks";
import { NurseCareCardsManager } from "@/components/nurse/NurseCareCardsManager";
import { tokenStore, api } from "@/lib/apiClient";
import { useMe } from "@/hooks/api";
import elvetLogo from "@/assets/elvet_logo.jpg";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NurseDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = new URLSearchParams(location.search).get("public") === "1";
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: me, isLoading: meLoading, refetch: refetchMe } = useMe();
  const qc = useQueryClient();
  const [bannerUploading, setBannerUploading] = useState(false);
  const [dailySalary, setDailySalary] = useState<number | null>(null);
  const [nurseId, setNurseId] = useState<number | null>(null);
  const [nurseIdAttempted, setNurseIdAttempted] = useState(false);
  const [metrics, setMetrics] = useState({
    todo: 0,
    done: 0,
    doneToday: 0,
    medicines: 0,
    pets: 0,
  });
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [doneTasks, setDoneTasks] = useState<any[]>([]);
  const [doneTodayTasks, setDoneTodayTasks] = useState<any[]>([]);
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryWeekly, setSalaryWeekly] = useState<any[]>([]);
  const [salaryMonthly, setSalaryMonthly] = useState<any[]>([]);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  const parseNumeric = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseId = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const numeric = Number.parseInt(String(value), 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  };

  useEffect(() => {
    if (!me || isPublic) return;
    const profile = (me as any)?.profile ?? {};
    const salaryCandidates = [
      profile?.daily_salary,
      profile?.dailySalary,
      profile?.daily_rate,
      profile?.dailyRate,
      profile?.salary_per_day,
    ];
    for (const candidate of salaryCandidates) {
      const parsed = parseNumeric(candidate);
      if (parsed !== null) {
        setDailySalary(parsed);
        return;
      }
    }
    setDailySalary(null);
  }, [me]);

  useEffect(() => {
    if (isPublic) return;
    if (!me || nurseIdAttempted) return;

    const profile = (me as any)?.profile ?? {};
    const directCandidates = [
      profile?.nurse_id,
      profile?.id,
      profile?.nurse?.id,
      profile?.nurse?.pk,
      profile?.profile_id,
      (me as any)?.nurse_id,
    ];

    for (const candidate of directCandidates) {
      const parsed = parseId(candidate);
      if (parsed) {
        setNurseId(parsed);
        setNurseIdAttempted(true);
        return;
      }
    }

    let cancelled = false;
    let resolved = false;

    const trySet = (data: any) => {
      const possibleValues = [
        data?.id,
        data?.nurse?.id,
        data?.nurse_id,
        data?.profile?.id,
        data?.profile?.nurse_id,
      ];
      for (const value of possibleValues) {
        const parsed = parseId(value);
        if (parsed && !cancelled) {
          setNurseId(parsed);
          resolved = true;
          return true;
        }
      }
      return false;
    };

    const resolve = async () => {
      try {
        const endpoints = [`nurses/me/`, `nurses/by-user/${me.id}/`, `nurses/${me.id}/`];
        for (const endpoint of endpoints) {
          if (cancelled || resolved) break;
          try {
            const { data } = await api.get(endpoint);
            if (trySet(data)) break;
          } catch {
            // continue to next endpoint
          }
        }
        if (!cancelled) {
          setNurseIdAttempted(true);
          if (!resolved) {
            toast({
              title: t("nurse.profileNotFound.title"),
              description: t("nurse.profileNotFound.description"),
              variant: "destructive",
            });
            setInitialFetchComplete(true);
          }
        }
      } finally {
        if (cancelled && !nurseIdAttempted) {
          setNurseIdAttempted(true);
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [me, nurseIdAttempted, toast]);

  const fetchDashboardData = useCallback(async () => {
    if (!nurseId || isPublic) return;
    setMetricsLoading(true);
    setTasksLoading(true);
    setSalaryLoading(true);
    try {
      const [todoData, doneData, todayData, medicinesData, takenRoomsData, weeklySalaryData, monthlySalaryData] = await Promise.all([
        api.get(`tasks/to-do/by_id/${nurseId}`).then((r) => r.data).catch(() => null),
        api.get(`tasks/done/by_id/${nurseId}`).then((r) => r.data).catch(() => null),
        api.get(`tasks/done/today/by_id/${nurseId}`).then((r) => r.data).catch(() => null),
        api.get(`medicines/`).then((r) => r.data).catch(() => null),
        api.get(`stationary-rooms/taken/`).then((r) => r.data).catch(() => null),
        api.get(`salary/history/${nurseId}/weekly/`).then((r) => r.data).catch(() => null),
        api.get(`salary/history/${nurseId}/monthly/`).then((r) => r.data).catch(() => null),
      ]);

      const toArray = (payload: any) => {
        if (!payload) return [] as any[];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.results)) return payload.results;
        return [] as any[];
      };

      // Salary history endpoints return an object with shape:
      // { total_amount, event_count, events: [...] }
      // Normalize to an array of events for rendering.
      const toEventsArray = (payload: any) => {
        if (!payload) return [] as any[];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.events)) return payload.events;
        if (Array.isArray(payload.results)) return payload.results;
        return [] as any[];
      };

      const toCount = (payload: any) => {
        if (payload && typeof payload.count === "number") return payload.count;
        return toArray(payload).length;
      };

      setTodoTasks(toArray(todoData));
      setDoneTasks(toArray(doneData));
      setDoneTodayTasks(toArray(todayData));

      setMetrics({
        todo: toCount(todoData),
        done: toCount(doneData),
        doneToday: toCount(todayData),
        medicines: toCount(medicinesData),
        pets: toCount(takenRoomsData),
      });
  setMedicinesList(toArray(medicinesData));
  setSalaryWeekly(toEventsArray(weeklySalaryData));
  setSalaryMonthly(toEventsArray(monthlySalaryData));
    } catch (error: any) {
  const description = error?.response?.data?.detail || error?.message || t("nurse.tasks.toast.updateError");
  toast({ title: t("auth.error"), description, variant: "destructive" });
      setMedicinesList([]);
      setSalaryWeekly([]);
      setSalaryMonthly([]);
    } finally {
      setMetricsLoading(false);
      setTasksLoading(false);
      setSalaryLoading(false);
      setInitialFetchComplete(true);
    }
  }, [nurseId, toast]);

  useEffect(() => {
    if (!nurseId || isPublic) return;
    fetchDashboardData();
  }, [nurseId, isPublic, fetchDashboardData]);

  const refreshDashboardData = useCallback(async () => {
    if (isPublic) return;
    await fetchDashboardData();
    await refetchMe();
  }, [fetchDashboardData, refetchMe, isPublic]);

  const formatNumber = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : value.toLocaleString("ru-RU");

  const formatCurrency = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : `${value.toLocaleString("ru-RU")} сум`;

  const getTaskPetName = (task: any) =>
    task?.pet_name ||
    task?.patient ||
    task?.medical_card?.pet?.name ||
    task?.medical_card?.pet_name ||
    task?.medical_card?.pet?.nickname ||
    "—";

  const getTaskServiceName = (task: any) =>
    task?.service_name || task?.service?.service_name || task?.service?.name || task?.service || "—";

  const formatTime = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isFutureCalendarDate = useCallback((value?: string | null) => {
    if (!value) return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    const candidate = new Date(parsed);
    candidate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return candidate.getTime() > today.getTime();
  }, []);

  const preparedMedicines = useMemo(() => {
    const normalizeName = (item: any) =>
      item?.name ||
      item?.title ||
      item?.medicine_name ||
      item?.product_name ||
      (item?.id ? `Позиция #${item.id}` : "Без названия");

    const normalizeCategory = (item: any) =>
      item?.category ||
      item?.type ||
      item?.group ||
      item?.form ||
      item?.dosage_form ||
      "—";

    const normalizeStock = (item: any) => {
      const candidates = [
        item?.available_quantity,
        item?.available,
        item?.quantity,
        item?.stock,
        item?.remaining,
        item?.count,
      ];
      for (const candidate of candidates) {
        const parsed = parseNumeric(candidate);
        if (parsed !== null) return parsed;
      }
      return null;
    };

    const normalizeUnit = (item: any) => item?.unit || item?.unit_name || item?.measure || item?.measurement || "";

    return medicinesList.map((item: any, index) => ({
      id: item?.id ?? index,
      name: normalizeName(item),
      category: normalizeCategory(item),
      stock: normalizeStock(item),
      unit: normalizeUnit(item),
      updatedAt: item?.updated_at || item?.updatedAt || item?.updated,
    }));
  }, [medicinesList]);

  const scheduleGroups = useMemo(() => {
    const allTasks = [...todoTasks, ...doneTodayTasks, ...doneTasks];
    const buckets = new Map<
      string,
      {
        label: string;
        tasks: Array<{
          id: number | string;
          title: string;
          petName: string;
          serviceName: string;
          time: string | null;
          status: string;
          sortOrder: number;
        }>;
      }
    >();

    for (const task of allTasks) {
      const dateValue = task?.datetime || task?.due_date;
      if (!dateValue) continue;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) continue;
  if (!isFutureCalendarDate(dateValue)) continue;
      const dateKey = parsed.toISOString().split("T")[0];
      const label = parsed.toLocaleDateString("ru-RU", {
        weekday: "short",
        day: "numeric",
        month: "long",
      });
      if (!buckets.has(dateKey)) {
        buckets.set(dateKey, { label, tasks: [] });
      }
      buckets.get(dateKey)!.tasks.push({
        id: task?.id ?? `${dateKey}-${buckets.get(dateKey)!.tasks.length}`,
  title: task?.title || task?.name || t('nurse.task.untitled'),
        petName: getTaskPetName(task),
        serviceName: getTaskServiceName(task),
        time: formatTime(task?.datetime || task?.due_date),
        status: task?.status || "—",
        sortOrder: parsed.getTime(),
      });
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, bucket]) => ({
        dateKey,
        label: bucket.label,
        tasks: bucket.tasks
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(({ sortOrder, ...rest }) => rest),
      }));
  }, [todoTasks, doneTodayTasks, doneTasks, isFutureCalendarDate]);

  useEffect(() => {
    if (isPublic) {
      setInitialFetchComplete(true);
      setNurseIdAttempted(true);
    }
  }, [isPublic]);

  const isRefreshing = metricsLoading || tasksLoading;
  const showInitialLoader = isPublic
    ? false
    : meLoading || (nurseId ? !initialFetchComplete : !nurseIdAttempted);
  const showNurseWarning = !isPublic && nurseIdAttempted && !nurseId;
  const tasksInitialLoading = !initialFetchComplete && (tasksLoading || metricsLoading) && !showNurseWarning;

  const statsConfig = useMemo(
    () => [
      {
        key: "salary",
        label: t('nurse.metrics.salary.label'),
        value: isPublic ? null : dailySalary,
        formatter: formatCurrency,
        icon: Wallet,
        subtitle: t('nurse.metrics.salary.subtitle'),
      },
      {
        key: "todo",
        label: t('nurse.metrics.todo.label'),
        value: nurseId && !isPublic ? metrics.todo : null,
        formatter: formatNumber,
        icon: ClipboardList,
        subtitle: t('nurse.metrics.todo.subtitle'),
      },
      {
        key: "doneToday",
        label: t('nurse.metrics.doneToday.label'),
        value: nurseId && !isPublic ? metrics.doneToday : null,
        formatter: formatNumber,
        icon: Clock4,
        subtitle: t('nurse.metrics.doneToday.subtitle'),
      },
      {
        key: "done",
        label: t('nurse.metrics.done.label'),
        value: nurseId && !isPublic ? metrics.done : null,
        formatter: formatNumber,
        icon: CheckCircle2,
        subtitle: t('nurse.metrics.done.subtitle'),
      },
      {
        key: "medicines",
        label: t('nurse.metrics.medicines.label'),
        value: isPublic ? null : metrics.medicines,
        formatter: formatNumber,
        icon: Pill,
        subtitle: t('nurse.metrics.medicines.subtitle'),
      },
      {
        key: "pets",
        label: t('nurse.metrics.roomsTaken.label'),
        value: isPublic ? null : metrics.pets,
        formatter: formatNumber,
        icon: PawPrint,
        subtitle: t('nurse.metrics.roomsTaken.subtitle'),
      },
    ],
    [dailySalary, metrics, nurseId, isPublic, t]
  );

  const handleLogout = async () => {
    tokenStore.clear();
    toast({
      title: t("dashboard.logout"),
      description: t("common.goodbye"),
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
    } catch (e: any) {
      // optional: add toast
    } finally {
      setBannerUploading(false);
    }
  };

  if (showInitialLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="animate-pulse">
          <ClipboardList className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
        <div className="container px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition hover:opacity-90 hover-scale"
            aria-label={t('common.goHome')}
          >
            <img src={elvetLogo} alt="ELVET" className="w-12 h-12 rounded-xl object-cover shadow-glow border border-white/30" />
            <div className="text-left">
              <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
              <p className="text-xs text-muted-foreground">{t("dashboard.nurse")}</p>
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

      <div className="container px-4 py-8">
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
                      <ImageIcon className="w-4 h-4" /> {bannerUploading ? t('nurse.banner.uploading') : t('nurse.banner.changeImage')}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1">
                  {t("dashboard.welcome")}, {me?.first_name ? `${me.first_name}` : t('nurse.banner.defaultName')}! 💉
                </h2>
                <p className="text-primary-foreground/90 text-lg">{t('nurse.banner.subtitle')}</p>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  {t('nurse.banner.dailySalaryLabel')} <span className="font-semibold">{formatCurrency(dailySalary)}</span>
                </p>
              </div>
            </div>
          </div>
        </Card>

        {showNurseWarning && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {t('nurse.profileNotFound.inlineWarning')}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-muted-foreground">{t('nurse.metrics.title')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDashboardData}
            disabled={isRefreshing || !nurseId || isPublic}
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {t('nurse.metrics.refresh')}
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          {statsConfig.map(({ key, label, value, formatter, icon: Icon, subtitle }) => (
            <Card
              key={key}
              className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-emerald-50 via-background to-teal-50"
            >
              <CardHeader className="pb-3 flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-base">
                    <Icon className="w-4 h-4" />
                  </span>
                  {label}
                </CardTitle>
                <span className="text-lg">✨</span>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent ${
                  isRefreshing ? "opacity-70" : ""
                }`}>
                  {formatter(value)}
                </div>
                {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="procedures" className="w-full">
          <TabsList className="w-full mb-8 h-auto p-1 rounded-2xl bg-card/80 shadow-md grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <TabsTrigger
              value="procedures"
              className="gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted/60 transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nurse.tabs.procedures")}</span>
              <span className="sm:hidden">{t("nurse.tabs.procedures")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="medicines"
              className="gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted/60 transition-all"
            >
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nurse.tabs.medicines")}</span>
              <span className="sm:hidden">{t("nurse.tabs.medicines")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted/60 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nurse.tabs.schedule")}</span>
              <span className="sm:hidden">{t("nurse.tabs.schedule")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="salary"
              className="gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted/60 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nurse.tabs.salaryHistory")}</span>
              <span className="sm:hidden">{t("nurse.tabs.salaryHistory")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="nurse-care"
              className="gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted/60 transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Nurse Care 💗</span>
              <span className="sm:hidden">Nurse 💗</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="procedures" className="space-y-6 animate-fade-in">
            <HospitalizationTasks
              nurseId={isPublic ? null : nurseId}
              todoTasks={todoTasks}
              doneTasks={doneTasks}
              doneTodayTasks={doneTodayTasks}
              todoCount={metrics.todo}
              doneCount={metrics.done}
              doneTodayCount={metrics.doneToday}
              loading={tasksInitialLoading}
              refreshing={isRefreshing || isPublic}
              onRefresh={refreshDashboardData}
            />
          </TabsContent>

          <TabsContent value="medicines" className="space-y-6 animate-fade-in">
            <Card className="border-2 hover:shadow-glow transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  {t('nurse.medicines.title')}
                </CardTitle>
                <CardDescription>
                  {t('nurse.medicines.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading && preparedMedicines.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </span>
                    {t('nurse.medicines.loading')}
                  </div>
                ) : preparedMedicines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('nurse.medicines.empty')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('nurse.medicines.table.name')}</TableHead>
                          <TableHead>{t('nurse.medicines.table.category')}</TableHead>
                          <TableHead>{t('nurse.medicines.table.stock')}</TableHead>
                          <TableHead>{t('nurse.medicines.table.updated')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preparedMedicines.map((item) => (
                          <TableRow key={`medicine-${item.id}`}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>
                              <Badge
                                variant={item.stock !== null && item.stock <= 0 ? "destructive" : "outline"}
                                className={item.stock !== null && item.stock <= 0 ? "bg-destructive text-destructive-foreground" : ""}
                              >
                                {item.stock !== null ? `${item.stock}${item.unit ? ` ${item.unit}` : ""}` : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(item.updatedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6 animate-fade-in">
            <Card className="border-2 hover:shadow-glow transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {t('nurse.schedule.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduleGroups.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('nurse.schedule.empty')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduleGroups.map((group) => (
                      <div key={`schedule-${group.dateKey}`} className="rounded-xl border bg-muted/40 p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="text-base font-semibold text-foreground">{group.label}</div>
                          <Badge variant="outline" className="text-xs uppercase tracking-wide">
                            {t('nurse.schedule.tasks', { count: group.tasks.length })}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {group.tasks.map((task) => (
                            <div
                              key={`schedule-${group.dateKey}-${task.id}`}
                              className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-background/90 p-4 shadow-sm"
                            >
                              <div>
                                <p className="font-medium text-foreground">{task.title === 'Без названия' ? t('nurse.task.untitled') : task.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {task.petName} · {task.serviceName}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                                {task.time && <span className="text-base font-semibold text-primary">{task.time}</span>}
                                <Badge variant="secondary" className="uppercase tracking-tight">
                                  {task.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary" className="space-y-6 animate-fade-in">
            <Card className="border-2 hover:shadow-glow transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  {t('nurse.tabs.salaryHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-xl border bg-background p-4">
                    <h4 className="font-semibold mb-3">{t('nurse.salary.weeklyTitle')}</h4>
                    {salaryLoading && salaryWeekly.length === 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('nurse.salary.loading')}
                      </div>
                    ) : salaryWeekly.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('nurse.salary.empty')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('nurse.salary.table.date')}</TableHead>
                              <TableHead className="text-right">{t('nurse.salary.table.amount')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salaryWeekly.map((item, idx) => {
                              const date = item?.date || item?.created_at || item?.createdAt || item?.time || item?.timestamp;
                              const amountRaw = item?.amount ?? item?.value ?? item?.total ?? item?.sum ?? item?.salary ?? item?.income;
                              const amount = typeof amountRaw === 'number' ? amountRaw : Number.parseFloat(String(amountRaw ?? 'NaN'));
                              return (
                                <TableRow key={`weekly-${item?.id ?? idx}`}>
                                  <TableCell>{formatDate(date)}</TableCell>
                                  <TableCell className="text-right font-medium">{Number.isFinite(amount) ? formatCurrency(amount) : '—'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <h4 className="font-semibold mb-3">{t('nurse.salary.monthlyTitle')}</h4>
                    {salaryLoading && salaryMonthly.length === 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('nurse.salary.loading')}
                      </div>
                    ) : salaryMonthly.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('nurse.salary.empty')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('nurse.salary.table.date')}</TableHead>
                              <TableHead className="text-right">{t('nurse.salary.table.amount')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salaryMonthly.map((item, idx) => {
                              const date = item?.date || item?.created_at || item?.createdAt || item?.time || item?.timestamp;
                              const amountRaw = item?.amount ?? item?.value ?? item?.total ?? item?.sum ?? item?.salary ?? item?.income;
                              const amount = typeof amountRaw === 'number' ? amountRaw : Number.parseFloat(String(amountRaw ?? 'NaN'));
                              return (
                                <TableRow key={`monthly-${item?.id ?? idx}`}>
                                  <TableCell>{formatDate(date)}</TableCell>
                                  <TableCell className="text-right font-medium">{Number.isFinite(amount) ? formatCurrency(amount) : '—'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nurse-care" className="space-y-6 animate-fade-in">
            <NurseCareCardsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NurseDashboard;