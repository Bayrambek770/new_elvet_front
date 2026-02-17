import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Search,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { HospitalizationTasks } from "@/components/nurse/HospitalizationTasks";
import { NurseCareCardsManager } from "@/components/nurse/NurseCareCardsManager";
import { MedicalCardsForNurse } from "@/components/nurse/MedicalCardsForNurse";
import { Sidebar, SidebarView } from "@/components/nurse/Sidebar";
import { tokenStore, api } from "@/lib/apiClient";
import { useMe } from "@/hooks/api";
import { Tasks } from "@/lib/api";
import elvetLogo from "@/assets/elvet_logo.jpg";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NurseDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [medicinesSearch, setMedicinesSearch] = useState("");
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryWeekly, setSalaryWeekly] = useState<any[]>([]);
  const [salaryMonthly, setSalaryMonthly] = useState<any[]>([]);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("nurseSidebarOpen");
    return saved === "true";
  });

  // Active view from URL query params
  const [activeView, setActiveView] = useState<SidebarView>(() => {
    const viewParam = searchParams.get("view");
    const validViews: SidebarView[] = ["main", "procedures", "medical-cards", "nurse-care", "medicines", "schedule", "salary"];
    return validViews.includes(viewParam as SidebarView) ? (viewParam as SidebarView) : "main";
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("nurseSidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  // Handle view navigation
  const handleNavigate = useCallback((view: SidebarView) => {
    setActiveView(view);
    if (view === "main") {
      searchParams.delete("view");
    } else {
      searchParams.set("view", view);
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

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
    
    // Only attempt to resolve nurse profile if user role is NURSE
    const userRole = (me?.role || "").toString().toUpperCase();
    if (userRole !== "NURSE") {
      setNurseIdAttempted(true);
      return;
    }

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

    const resolve = async () => {
      // Backend confirmation: User ID is identical to Nurse ID.
      // We accept me.id as the nurseId, but verify the profile exists via API.
      const targetId = parseId(me.id);
      
      if (!targetId) {
         setNurseIdAttempted(true);
         return;
      }

      try {
        // Verify the nurse profile exists using the canonical endpoint
        await api.get(`nurses/${targetId}/`, { _suppress404: true } as any);
        
        if (!cancelled) {
          setNurseId(targetId);
          setNurseIdAttempted(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setNurseIdAttempted(true);
          // If 404, the user exists but has no nurse profile
          if (err?.response?.status === 404) {
            toast({
              title: t("nurse.profileNotFound.title"),
              description: t("nurse.profileNotFound.description"),
              variant: "destructive",
            });
            setInitialFetchComplete(true);
          } else {
             // For other errors (network, etc.), assume the ID is valid to allow retry or offline viewing
             // and avoid blocking the user completely.
             console.warn("Error verifying nurse profile, proceeding with ID:", err);
             setNurseId(targetId);
          }
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
      // Helper to fetch with suppressed 404 errors
      const fetchSilent = async (url: string) => {
        try {
          const response = await api.get(url, { _suppress404: true } as any);
          return response.data;
        } catch (err: any) {
          // Return null for 404s (expected), rethrow other errors
          if (err?.response?.status === 404) {
            return null;
          }
          throw err;
        }
      };

      // Fetch all tasks for this nurse using the Tasks API
      // Try different parameter names that the API might use
      const fetchTasksForNurse = async (): Promise<any> => {
        // First try with nurse_id parameter (most common)
        try {
          const data = await Tasks.list<any>({ nurse_id: nurseId });
          return data;
        } catch {
          // Then try with nurse parameter
          try {
            const data = await Tasks.list<any>({ nurse: nurseId });
            return data;
          } catch {
            // Finally, fetch all tasks and filter client-side
            const data = await Tasks.list<any>();
            const allTasks = Array.isArray(data) ? data : (data as any)?.results || [];
            // Filter by nurse_id client-side
            return allTasks.filter((task: any) => {
              const taskNurseId = task.nurse_id || task.nurse?.id || task.nurse;
              return taskNurseId === nurseId || String(taskNurseId) === String(nurseId);
            });
          }
        }
      };
      
      const allTasksPromise = fetchTasksForNurse().catch(() => null);
      
      const [allTasksData, medicinesData, takenRoomsData, weeklySalaryData, monthlySalaryData] = await Promise.all([
        allTasksPromise,
        fetchSilent(`medicines/`),
        fetchSilent(`stationary-rooms/taken/`),
        fetchSilent(`salary/history/${nurseId}/weekly/`),
        fetchSilent(`salary/history/${nurseId}/monthly/`),
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

      // Process tasks: filter by status and date
      const allTasks = toArray(allTasksData);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter tasks by status
      const todoTasksFiltered = allTasks.filter((task: any) => {
        const status = (task.status || "").toString().toUpperCase();
        return status !== "DONE" && status !== "COMPLETED";
      });
      
      const doneTasksFiltered = allTasks.filter((task: any) => {
        const status = (task.status || "").toString().toUpperCase();
        return status === "DONE" || status === "COMPLETED";
      });
      
      // Filter done tasks by today's date
      const doneTodayTasksFiltered = doneTasksFiltered.filter((task: any) => {
        if (!task.completed_at && !task.updated_at) return false;
        const taskDate = new Date(task.completed_at || task.updated_at);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });

      setTodoTasks(todoTasksFiltered);
      setDoneTasks(doneTasksFiltered);
      setDoneTodayTasks(doneTodayTasksFiltered);

      setMetrics({
        todo: todoTasksFiltered.length,
        done: doneTasksFiltered.length,
        doneToday: doneTodayTasksFiltered.length,
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
      (item?.id ? t("nurse.medicines.itemFallback", { id: item.id }) : t("nurse.medicines.untitled"));

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

    const allMedicines = medicinesList.map((item: any, index) => ({
      id: item?.id ?? index,
      name: normalizeName(item),
      category: normalizeCategory(item),
      stock: normalizeStock(item),
      unit: normalizeUnit(item),
      updatedAt: item?.updated_at || item?.updatedAt || item?.updated,
    }));

    // Apply search filter
    if (!medicinesSearch.trim()) {
      return allMedicines;
    }

    const searchLower = medicinesSearch.toLowerCase().trim();
    return allMedicines.filter((medicine) => 
      medicine.name.toLowerCase().includes(searchLower) ||
      medicine.category.toLowerCase().includes(searchLower)
    );
  }, [medicinesList, medicinesSearch, t]);

  // Total medicines count for display (before filtering)
  const totalMedicinesCount = medicinesList.length;

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
        key: "medicines",
        label: t('nurse.metrics.medicines.label'),
        value: isPublic ? null : metrics.medicines,
        formatter: formatNumber,
        icon: Pill,
        subtitle: t('nurse.metrics.medicines.subtitle'),
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

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case "procedures":
        return (
          <div className="space-y-6 animate-fade-in">
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
          </div>
        );

      case "medical-cards":
        return (
          <div className="space-y-6 animate-fade-in">
            <MedicalCardsForNurse />
          </div>
        );

      case "nurse-care":
        return (
          <div className="space-y-6 animate-fade-in">
            <NurseCareCardsManager />
          </div>
        );

      case "medicines":
        return (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-2 hover:shadow-glow transition-all">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-primary" />
                      {t('nurse.medicines.title')}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t('nurse.medicines.description')}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="self-start sm:self-center">
                    {t('nurse.medicines.total', { count: totalMedicinesCount })}
                  </Badge>
                </div>
                {/* Search Input */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('nurse.medicines.searchPlaceholder')}
                    value={medicinesSearch}
                    onChange={(e) => setMedicinesSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {metricsLoading && medicinesList.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </span>
                    {t('nurse.medicines.loading')}
                  </div>
                ) : medicinesList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('nurse.medicines.empty')}</p>
                  </div>
                ) : preparedMedicines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('nurse.medicines.noSearchResults')}</p>
                    <Button
                      variant="link"
                      onClick={() => setMedicinesSearch("")}
                      className="mt-2"
                    >
                      {t('nurse.medicines.clearSearch')}
                    </Button>
                  </div>
                ) : (
                  <>
                    {medicinesSearch && (
                      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {t('nurse.medicines.searchResults', { count: preparedMedicines.length, total: totalMedicinesCount })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMedicinesSearch("")}
                        >
                          {t('nurse.medicines.clearSearch')}
                        </Button>
                      </div>
                    )}
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
                                  variant={item.stock !== null && item.stock <= 0 ? "destructive" : item.stock !== null && item.stock <= 10 ? "secondary" : "outline"}
                                  className={item.stock !== null && item.stock <= 0 ? "bg-destructive text-destructive-foreground" : item.stock !== null && item.stock <= 10 ? "bg-amber-100 text-amber-800 border-amber-300" : ""}
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-6 animate-fade-in">
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
                                <p className="font-medium text-foreground">{task.title === t('nurse.medicines.untitled') ? t('nurse.task.untitled') : task.title}</p>
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
          </div>
        );

      case "salary":
        return (
          <div className="space-y-6 animate-fade-in">
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
          </div>
        );

      case "main":
      default:
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Banner */}
            <Card className="overflow-hidden border-0 shadow-elegant">
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
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {t('nurse.profileNotFound.inlineWarning')}
              </div>
            )}

            {/* Metrics Section */}
            <div className="flex flex-wrap items-center justify-between gap-4">
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

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {statsConfig.map(({ key, label, value, formatter, icon: Icon, subtitle }) => (
                <Card
                  key={key}
                  className="border-2 hover:shadow-glow transition-all bg-gradient-to-br from-emerald-50 via-background to-teal-50"
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
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeView={activeView}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 animate-fade-in">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition hover:opacity-90 hover-scale"
              aria-label={t('common.goHome')}
            >
              <img src={elvetLogo} alt="ELVET" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-glow border border-white/30" />
              <div className="text-left hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
                <p className="text-xs text-muted-foreground">{t("dashboard.nurse")}</p>
              </div>
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <LanguageSwitcher />
              <Button variant="outline" onClick={handleLogout} className="gap-2 hover-scale" size="sm">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("dashboard.logout")}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NurseDashboard;