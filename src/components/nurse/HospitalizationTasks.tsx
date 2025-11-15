import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, CheckCircle2, Clock4, RefreshCcw, FileText, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/apiClient";
import { Pets, Services, Schedules, Medicines } from "@/lib/api";

type TaskRecord = {
  id: number | string;
  title?: string;
  description?: string;
  datetime?: string;
  due_date?: string;
  status?: string;
  service_name?: string;
  service_id?: number | string;
  service?: { id?: number | string; name?: string; service_name?: string; title?: string } | number | string;
  medical_card?: {
    id?: number | string;
    pet_name?: string;
    pet?: { id?: number | string; name?: string; nickname?: string };
    card_number?: string;
  };
  patient?: string;
  pet_name?: string;
  pet_id?: number | string;
  pet?: { id?: number | string; name?: string; nickname?: string };
  schedule_id?: number | string;
  schedule?: {
    id?: number | string;
    pet_id?: number | string;
    pet?: { id?: number | string; name?: string; nickname?: string };
    animal?: { id?: number | string; name?: string };
    animal_id?: number | string;
  };
};

type HospitalizationTasksProps = {
  nurseId: number | null;
  todoTasks: TaskRecord[];
  doneTasks: TaskRecord[];
  doneTodayTasks: TaskRecord[];
  todoCount: number;
  doneCount: number;
  doneTodayCount: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void> | void;
};

const getTaskPetName = (task: TaskRecord) =>
  task.pet_name ||
  task.patient ||
  (typeof task.pet === "object" ? task.pet?.name || task.pet?.nickname : null) ||
  task.medical_card?.pet?.name ||
  task.medical_card?.pet?.nickname ||
  task.medical_card?.pet_name ||
  (typeof task.pet === "string" ? task.pet : null) ||
  "—";

const getTaskServiceName = (task: TaskRecord) => {
  if (task.service_name) return task.service_name;
  if (typeof task.service === "string") return task.service;
  if (typeof task.service === "number") return `Услуга #${task.service}`;
  return task.service?.service_name || task.service?.name || task.service?.title || "—";
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "object") {
    const maybeId = (value as { id?: unknown })?.id;
    return normalizeId(maybeId);
  }
  return null;
};

const getTaskServiceId = (task: TaskRecord): string | null => {
  const candidates = [task.service_id, task.service, (task.service as any)?.service_id, (task.service as any)?.id];
  for (const candidate of candidates) {
    const normalized = normalizeId(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const getTaskScheduleId = (task: TaskRecord): string | null => {
  const candidates = [task.schedule_id, task.schedule, (task.schedule as any)?.id];
  for (const candidate of candidates) {
    const normalized = normalizeId(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const getTaskPetId = (task: TaskRecord): string | null => {
  const candidates = [
    task.pet_id,
    task.pet,
    (task.pet as any)?.id,
    task.medical_card?.pet,
    task.medical_card?.pet?.id,
    task.schedule?.pet,
    task.schedule?.pet_id,
    task.schedule?.pet?.id,
    task.schedule?.animal,
    task.schedule?.animal_id,
    task.schedule?.animal?.id,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeId(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const isDateToday = (value?: string | null) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
};

const isTaskScheduledForToday = (task: TaskRecord) => {
  const candidates = [task.datetime, task.due_date];
  return candidates.some((value) => isDateToday(value));
};

export const HospitalizationTasks = ({
  nurseId,
  todoTasks,
  doneTasks,
  doneTodayTasks,
  todoCount,
  doneCount,
  doneTodayCount,
  loading,
  refreshing,
  onRefresh,
}: HospitalizationTasksProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [updatingTaskId, setUpdatingTaskId] = useState<number | string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [selectedTaskCompletionRequested, setSelectedTaskCompletionRequested] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [serviceMeta, setServiceMeta] = useState<Record<string, { name: string; medicineName?: string }>>({});
  const [scheduleMeta, setScheduleMeta] = useState<Record<string, { petId?: string; petName?: string }>>({});
  const [petNames, setPetNames] = useState<Record<string, string>>({});
  const [medicineNames, setMedicineNames] = useState<Record<string, string>>({});
  const pendingServiceIds = useRef(new Set<string>());
  const pendingScheduleIds = useRef(new Set<string>());
  const pendingPetIds = useRef(new Set<string>());
  const pendingMedicineIds = useRef(new Set<string>());
  const detailsRequestIdRef = useRef(0);

  const getTaskId = (task: TaskRecord) => {
    const rawId = task?.id;
    if (typeof rawId === "string" && rawId.includes("-")) return rawId;
    const numeric = Number(rawId);
    return Number.isNaN(numeric) ? rawId ?? "" : numeric;
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedTask(null);
    setSelectedTaskCompletionRequested(false);
    setDetailsLoading(false);
  };

  const resolveMedicineName = useCallback(
    async (medicineId: string): Promise<string> => {
      if (medicineNames[medicineId]) return medicineNames[medicineId];
      if (pendingMedicineIds.current.has(medicineId)) {
        return medicineNames[medicineId] || `Препарат #${medicineId}`;
      }

      pendingMedicineIds.current.add(medicineId);
      try {
        const data = await Medicines.get<any>(medicineId);
        const resolved =
          data?.name ||
          data?.title ||
          data?.medicine_name ||
          data?.display_name ||
          `Препарат #${medicineId}`;
        setMedicineNames((prev) => ({ ...prev, [medicineId]: resolved }));
        return resolved;
      } catch {
        const fallback = `Препарат #${medicineId}`;
        setMedicineNames((prev) => ({ ...prev, [medicineId]: prev[medicineId] || fallback }));
        return fallback;
      } finally {
        pendingMedicineIds.current.delete(medicineId);
      }
    },
    [medicineNames]
  );

  const ensureServiceDetails = useCallback(
    async (task: TaskRecord) => {
      const serviceId = getTaskServiceId(task);
      if (!serviceId) return;

      const key = String(serviceId);
  const existing = serviceMeta[key];
  if (existing?.medicineName && existing?.name) return;
      if (pendingServiceIds.current.has(key)) return;

      pendingServiceIds.current.add(key);
      try {
        const data = await Services.get<any>(serviceId);
        const resolvedName =
          data?.name ||
          data?.title ||
          data?.service_name ||
          data?.display_name ||
          existing?.name ||
          `Услуга #${key}`;

        let resolvedMedicineName =
          data?.medicine_name ||
          data?.medicine?.name ||
          data?.medicine?.title ||
          data?.medicine_title ||
          (typeof data?.medicine === "string" ? data.medicine : undefined);

        const medicineId = normalizeId(
          data?.medicine?.id ??
            data?.medicine_id ??
            (typeof data?.medicine === "number" || typeof data?.medicine === "string" ? data?.medicine : undefined)
        );

        let finalMedicineName = resolvedMedicineName;
        if (!finalMedicineName && medicineId) {
          finalMedicineName = await resolveMedicineName(medicineId);
        } else if (medicineId && finalMedicineName) {
          const resolved = finalMedicineName;
          setMedicineNames((prev) => ({ ...prev, [medicineId]: prev[medicineId] || resolved }));
        }

        setServiceMeta((prev) => ({
          ...prev,
          [key]: {
            name: resolvedName,
            medicineName: finalMedicineName ?? prev[key]?.medicineName,
          },
        }));
      } catch {
        setServiceMeta((prev) => ({
          ...prev,
          [key]: prev[key] || { name: `Услуга #${key}` },
        }));
      } finally {
        pendingServiceIds.current.delete(key);
      }
    },
    [resolveMedicineName, serviceMeta]
  );

  const ensurePetDetails = useCallback(
    async (task: TaskRecord) => {
      const directName = getTaskPetName(task);
      if (directName && directName !== "—") return;

      let petId = getTaskPetId(task);

      if (!petId) {
        const scheduleId = getTaskScheduleId(task);
        if (!scheduleId) return;

        const scheduleKey = String(scheduleId);
        const existingMeta = scheduleMeta[scheduleKey];

        if (existingMeta?.petId) {
          petId = existingMeta.petId;
        } else if (!pendingScheduleIds.current.has(scheduleKey)) {
          pendingScheduleIds.current.add(scheduleKey);
          try {
            const schedule = await Schedules.get<any>(scheduleId);
            const derivedPetId = normalizeId(
              schedule?.pet?.id ??
                schedule?.pet_id ??
                schedule?.pet ??
                schedule?.animal?.id ??
                schedule?.animal_id
            );
            const derivedPetName =
              schedule?.pet?.name ??
              schedule?.pet?.nickname ??
              schedule?.pet_name ??
              schedule?.animal?.name ??
              schedule?.animal_name ??
              undefined;

            setScheduleMeta((prev) => ({
              ...prev,
              [scheduleKey]: {
                petId: derivedPetId ?? prev[scheduleKey]?.petId,
                petName: derivedPetName ?? prev[scheduleKey]?.petName,
              },
            }));

            if (derivedPetId) {
              petId = derivedPetId;
            }

            if (derivedPetId && derivedPetName) {
              const petKey = String(derivedPetId);
              setPetNames((prev) => ({ ...prev, [petKey]: prev[petKey] || derivedPetName }));
            }
          } catch {
            // ignore schedule fetch errors; we'll fall back to IDs later
          } finally {
            pendingScheduleIds.current.delete(scheduleKey);
          }
        } else {
          return;
        }
      }

      if (!petId) return;
      const petKey = String(petId);
      if (petNames[petKey] || pendingPetIds.current.has(petKey)) return;

      pendingPetIds.current.add(petKey);
      try {
        const pet = await Pets.get<any>(petId);
        const resolved =
          pet?.name ||
          pet?.nickname ||
          pet?.pet_name ||
          pet?.display_name ||
          `Питомец #${petKey}`;

        setPetNames((prev) => ({ ...prev, [petKey]: resolved }));

        setScheduleMeta((prev) => {
          const updated = { ...prev };
          Object.entries(updated).forEach(([scheduleIdKey, info]) => {
            if (info?.petId === petKey && !info.petName) {
              updated[scheduleIdKey] = { ...info, petName: resolved };
            }
          });
          return updated;
        });
      } catch {
        setPetNames((prev) => ({ ...prev, [petKey]: prev[petKey] || `Питомец #${petKey}` }));
      } finally {
        pendingPetIds.current.delete(petKey);
      }
    },
    [petNames, scheduleMeta]
  );

  const loadTaskDetails = useCallback(
    async (task: TaskRecord) => {
      const requestId = detailsRequestIdRef.current + 1;
      detailsRequestIdRef.current = requestId;
      setDetailsLoading(true);
      try {
        await Promise.all([ensureServiceDetails(task), ensurePetDetails(task)]);
      } finally {
        if (detailsRequestIdRef.current === requestId) {
          setDetailsLoading(false);
        }
      }
    },
    [ensurePetDetails, ensureServiceDetails]
  );

  const getDisplayServiceName = useCallback(
    (task: TaskRecord) => {
      const serviceId = getTaskServiceId(task);
      const key = serviceId ? String(serviceId) : null;

      const directName = getTaskServiceName(task);
      let baseName = directName && directName !== "—" ? directName : undefined;

      let medicineLabel: string | undefined;
      if (typeof task.service === "object" && task.service) {
        const rawMedicine =
          (task.service as any)?.medicine_name ||
          (task.service as any)?.medicineTitle ||
          (task.service as any)?.medicine?.name ||
          (task.service as any)?.medicine?.title;
        if (rawMedicine) {
          medicineLabel = String(rawMedicine);
        }
      }

      if (key) {
        const meta = serviceMeta[key];
        if (meta) {
          baseName = meta.name || baseName || `Услуга #${key}`;
          medicineLabel = meta.medicineName || medicineLabel;
        } else if (!baseName) {
          baseName = `Услуга #${key}`;
        }
      }

      const baseLabel = baseName || (key ? `Услуга #${key}` : undefined);

      if (medicineLabel) {
        return `${baseLabel || "—"} · ${medicineLabel}`;
      }

      return baseLabel || "—";
    },
    [serviceMeta]
  );

  const getDisplayPetName = useCallback(
    (task: TaskRecord) => {
      const direct = getTaskPetName(task);
      if (direct && direct !== "—") return direct;

      const petId = getTaskPetId(task);
      if (petId && petNames[String(petId)]) {
        return petNames[String(petId)];
      }

      const scheduleId = getTaskScheduleId(task);
      if (scheduleId) {
        const key = String(scheduleId);
        const info = scheduleMeta[key];
        if (info?.petName) return info.petName;
        if (info?.petId) {
          const cached = petNames[String(info.petId)];
          if (cached) return cached;
          return `Питомец #${info.petId}`;
        }
      }

      if (petId) return `Питомец #${petId}`;
      return "—";
    },
    [petNames, scheduleMeta]
  );

  const openDialogForTask = (task: TaskRecord, allowCompletion: boolean) => {
    setSelectedTask(task);
    setSelectedTaskCompletionRequested(allowCompletion);
    setDialogOpen(true);
    void loadTaskDetails(task);
  };

  const selectedTaskId = useMemo(() => (selectedTask ? getTaskId(selectedTask) : null), [selectedTask]);
  const selectedTaskIsToday = useMemo(
    () => (selectedTask ? isTaskScheduledForToday(selectedTask) : false),
    [selectedTask]
  );
  const selectedTaskStatusUpper = (selectedTask?.status || "").toUpperCase();
  const canMarkSelectedTaskDone = Boolean(
    selectedTask &&
      selectedTaskCompletionRequested &&
      selectedTaskIsToday &&
      selectedTaskStatusUpper !== "DONE"
  );
  const selectedTaskServiceName = useMemo(
    () => (selectedTask ? getDisplayServiceName(selectedTask) : "—"),
    [selectedTask, getDisplayServiceName]
  );
  const selectedTaskPetName = useMemo(
    () => (selectedTask ? getDisplayPetName(selectedTask) : "—"),
    [selectedTask, getDisplayPetName]
  );
  const completionRestrictionMessage = useMemo(() => {
    if (!selectedTask) return null;
    if (selectedTaskStatusUpper === "DONE") {
      return t('nurse.tasks.dialog.alreadyDone');
    }
    if (!selectedTaskCompletionRequested) {
      return t('nurse.tasks.dialog.onlyFromTodo');
    }
    if (!selectedTaskIsToday) {
      return t('nurse.tasks.dialog.onlyToday');
    }
    return null;
  }, [selectedTask, selectedTaskCompletionRequested, selectedTaskIsToday, selectedTaskStatusUpper, t]);

  useEffect(() => {
    const toPrefetch = [...todoTasks, ...doneTodayTasks, ...doneTasks];
    toPrefetch.forEach((task) => {
      void ensureServiceDetails(task);
      void ensurePetDetails(task);
    });
  }, [todoTasks, doneTodayTasks, doneTasks, ensurePetDetails, ensureServiceDetails]);

  const handleMarkDone = async (taskId: number | string) => {
    if (!taskId || !nurseId) return;

    if (selectedTask && getTaskId(selectedTask) === taskId) {
      if (selectedTaskStatusUpper === "DONE") {
        toast({ title: t('nurse.tasks.dialog.alreadyCompletedToast'), variant: "default" });
        return;
      }

      if (!canMarkSelectedTaskDone) {
        toast({
          title: t('nurse.tasks.dialog.cannotCompleteEarlyTitle'),
          description: t('nurse.tasks.dialog.cannotCompleteEarlyDescription'),
          variant: "destructive",
        });
        return;
      }
    }

    setUpdatingTaskId(taskId);
    try {
      await api.patch(`tasks/${taskId}/`, { status: "DONE" });
      toast({ title: t('nurse.tasks.toast.done') });
      await onRefresh?.();
      closeDialog();
    } catch (error: any) {
      const description = error?.response?.data?.detail || error?.message || t('nurse.tasks.toast.updateError');
      toast({ title: t('auth.error'), description, variant: "destructive" });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const renderTasksTable = (tasks: TaskRecord[], allowCompletion = false) => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('nurse.tasks.empty')}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('nurse.tasks.table.task')}</TableHead>
            <TableHead>{t('nurse.tasks.table.patient')}</TableHead>
            <TableHead>{t('nurse.tasks.table.service')}</TableHead>
            <TableHead>{t('nurse.tasks.table.scheduled')}</TableHead>
            <TableHead>{t('nurse.tasks.table.deadline')}</TableHead>
            <TableHead className="text-right">{t('nurse.tasks.table.details')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const petName = getDisplayPetName(task);
            const serviceName = getDisplayServiceName(task);
            const scheduledToday = isTaskScheduledForToday(task);

            return (
              <TableRow
                key={`task-${task.id}`}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => openDialogForTask(task, allowCompletion)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{task.title || t('nurse.tasks.untitled')}</span>
                    {!scheduledToday && allowCompletion && (
                      <Badge variant="secondary" className="uppercase tracking-tight text-[10px]">
                        {t('nurse.tasks.badge.notToday')}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{petName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{serviceName}</Badge>
                </TableCell>
                <TableCell>{formatDateTime(task.datetime)}</TableCell>
                <TableCell>{formatDateTime(task.due_date)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDialogForTask(task, allowCompletion);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    {t('nurse.tasks.table.details')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              {t('nurse.tasks.title')}
            </CardTitle>
            <CardDescription>{t('nurse.tasks.description')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefresh?.()}
            disabled={refreshing || loading || !nurseId}
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {t('nurse.tasks.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('nurse.tasks.loading')}
          </div>
        ) : !nurseId ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('nurse.tasks.profileMissing')}</p>
          </div>
        ) : (
          <Tabs defaultValue="todo" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todo" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                {t('nurse.tasks.tab.todo')} ({todoCount})
              </TabsTrigger>
              <TabsTrigger value="today" className="gap-2">
                <Clock4 className="w-4 h-4" />
                {t('nurse.tasks.tab.today')} ({doneTodayCount})
              </TabsTrigger>
              <TabsTrigger value="done" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t('nurse.tasks.tab.done')} ({doneCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todo" className="space-y-4">
              {renderTasksTable(todoTasks, true)}
            </TabsContent>

            <TabsContent value="today" className="space-y-4">
              {renderTasksTable(doneTodayTasks)}
            </TabsContent>

            <TabsContent value="done" className="space-y-4">
              {renderTasksTable(doneTasks)}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              {selectedTask?.title || t('nurse.tasks.dialog.titleFallback')}
            </DialogTitle>
            <DialogDescription>
              {t('nurse.tasks.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          {selectedTask ? (
            <div className="space-y-4">
              {detailsLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('nurse.tasks.dialog.updatingDetails')}
                </div>
              )}

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">{t('nurse.tasks.dialog.patient')}</p>
                <p className="text-base font-semibold">{selectedTaskPetName}</p>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">{t('nurse.tasks.dialog.service')}</p>
                <p className="text-base font-semibold">{selectedTaskServiceName}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase text-muted-foreground">{t('nurse.tasks.dialog.scheduled')}</p>
                  <p className="text-sm font-medium">{formatDateTime(selectedTask.datetime)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase text-muted-foreground">{t('nurse.tasks.dialog.deadline')}</p>
                  <p className="text-sm font-medium">{formatDateTime(selectedTask.due_date)}</p>
                </div>
              </div>

              {selectedTask.description && (
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm text-muted-foreground mb-2">{t('nurse.tasks.dialog.descriptionLabel')}</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="uppercase tracking-tight">
                  {selectedTask.status || "—"}
                </Badge>
                {!selectedTaskIsToday && (selectedTask.datetime || selectedTask.due_date) && (
                  <Badge variant="outline" className="uppercase tracking-tight text-[10px]">
                    {t('nurse.tasks.badge.notToday')}
                  </Badge>
                )}
                {selectedTask.medical_card?.card_number && (
                  <Badge variant="outline">{t('nurse.tasks.dialog.cardNumber', { number: selectedTask.medical_card.card_number })}</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {t('nurse.tasks.dialog.detailsNotFound')}
            </div>
          )}

          {completionRestrictionMessage && (
            <p className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
              {completionRestrictionMessage}
            </p>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <Button variant="outline" onClick={closeDialog} className="sm:order-1">{t('nurse.tasks.dialog.close')}</Button>
            <Button
              className="gap-2 sm:order-2"
              onClick={() => selectedTaskId && handleMarkDone(selectedTaskId)}
              disabled={
                !selectedTask ||
                !canMarkSelectedTaskDone ||
                updatingTaskId === selectedTaskId ||
                refreshing
              }
            >
              {updatingTaskId === selectedTaskId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {selectedTaskStatusUpper === "DONE" ? t('nurse.tasks.dialog.completeButton.completed') : t('nurse.tasks.dialog.completeButton.markDone')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
