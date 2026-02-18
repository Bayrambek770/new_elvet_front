import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, LogOut, FileText, Users, Calendar, Clock, RefreshCcw, Package, Pill, BedDouble, User, Image as ImageIcon, Stethoscope, Paperclip, Download, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { tokenStore, api } from "@/lib/apiClient";
import { SalaryHistory } from "@/lib/api";
import elvetLogo from "@/assets/elvet_logo.jpg";
import { DoctorSidebar, DoctorSidebarView } from "@/components/doctor/DoctorSidebar";
// No direct typed helpers used here; relying on api client endpoints
import { useMe } from "@/hooks/api";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPublic = new URLSearchParams(location.search).get("public") === "1";
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("doctorSidebarOpen");
    return saved === "true";
  });

  // Active view from URL query params
  const [activeView, setActiveView] = useState<DoctorSidebarView>(() => {
    const viewParam = searchParams.get("view");
    const validViews: DoctorSidebarView[] = ["main", "clients", "services", "medicines", "history", "rooms", "salary"];
    return validViews.includes(viewParam as DoctorSidebarView) ? (viewParam as DoctorSidebarView) : "main";
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("doctorSidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  // Handle view navigation
  const handleNavigate = useCallback((view: DoctorSidebarView) => {
    setActiveView(view);
    if (view === "main") {
      searchParams.delete("view");
    } else {
      searchParams.set("view", view);
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Current doctor profile id (Doctor model primary key)
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [doctorIdLoading, setDoctorIdLoading] = useState(false);
  // Dynamic counts for clinic inventories / rooms
  const [counts, setCounts] = useState({ services: 0, medicines: 0, feeds: 0, doctorDailySalary: 0, loading: true });
  const [salaryPeriod, setSalaryPeriod] = useState<"weekly" | "monthly">("weekly");
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [salaryEvents, setSalaryEvents] = useState<any[]>([]);
  const [salaryTotal, setSalaryTotal] = useState<number>(0);

  // Aggregate salary events per day for dropdown view
  const salaryDailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of salaryEvents) {
      const dtStr = ev?.created_at || ev?.date || ev?.createdAt || ev?.timestamp;
      let key: string | null = null;
      if (dtStr) {
        const d = new Date(dtStr);
        if (!Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          key = `${y}-${m}-${da}`;
        }
      }
      if (!key) key = 'unknown';
      const candidates = [ev?.amount, ev?.total, ev?.sum, ev?.value];
      let amount = 0;
      for (const c of candidates) {
        const parsed = typeof c === 'string' ? parseFloat(c) : (typeof c === 'number' ? c : NaN);
        if (!Number.isNaN(parsed)) { amount = parsed; break; }
      }
      map.set(key, (map.get(key) || 0) + amount);
    }
    const arr = Array.from(map.entries())
      .filter(([k]) => k !== 'unknown')
      .map(([key, total]) => ({ key, date: new Date(`${key}T00:00:00`), total }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return arr;
  }, [salaryEvents]);

  const formatDayLabel = (d: Date) => new Intl.DateTimeFormat(i18n.language || undefined, { day: '2-digit', month: 'long' }).format(d);

  // Types for API-driven paginated data
  interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
  interface ApiClient { id: number; phone_number?: string; first_name?: string; last_name?: string; image?: string }
  interface ApiService { id: number; service_name?: string; name?: string; price?: string | number }
  interface ApiMedicine { id: number; medicine_name?: string; name?: string; price?: string | number; stock?: number; quantity?: number; unit?: string }
  interface ApiFeed { id: number; feed_name?: string; name?: string; price?: string | number }
  interface ApiRoom { id: number; room_number: string; price_per_day?: string; hourly_price?: string | null; description?: string; is_available: boolean }
  interface ApiMedicalCard {
    id: number;
    pet?: number | string;
    doctor?: number;
    client?: number;
    diagnosis?: string;
    created_at?: string;
    status?: string;
    closed_at?: string;
    total_fee?: string;
    service_usages?: any[];
    analyze?: string;
    general_condition?: string;
    chest_condition?: string;
    notes?: string;
    revisit_date?: string | null;
    recommended_feed_text?: string | null;
    // Stationary
    stationary_room?: number | null;
    booking_type?: "DAILY" | "HOURLY" | null;
    stay_start?: string | null;
    stay_end?: string | null;
    stay_days?: string | null;
    hourly_start?: string | null;
    hourly_end?: string | null;
    stay_hours?: string | null;
    stationary_fee?: string | null;
  }
  interface ApiMedicalCardAttachment { id: number; medical_card?: number; type?: "XRAY" | "PRESCRIPTION" | "OTHER" | string; file: string; uploaded_by?: number; uploaded_at?: string }
  interface ApiServiceUsage { id: number; medical_card: number; service: number; service_name?: string; quantity: number; description?: string }
  interface ApiMedicineUsage { id: number; medical_card: number; medicine: number; name?: string; quantity: number; dosage: string }
  interface ApiFeedUsage { id: number; medical_card: number; feed: number; quantity: number }
  interface ApiPet { id: number; name?: string; pet_name?: string; species?: string; breed?: string }
  interface ApiNurse { id: number; first_name?: string; last_name?: string; name?: string }
  type ServiceSelection = { quantity: number; description: string };
  type MedicineSelection = { quantity: number; dosage: string };
  // Local demo types kept for create-card modal (simplified)
  type Client = { id: string; name: string; phone?: string };
  type HistoryCard = { id: string; pet: string; date: string; summary: string; status: "open" | "closed"; doctorId: string };
  type MedCard = HistoryCard & { clientId: string };

  // Demo lists for create card modal (keep existing style)
  // Pagination states & data containers
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsData, setClientsData] = useState<Paginated<ApiClient> | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [servicesPage, setServicesPage] = useState(1);
  const [servicesData, setServicesData] = useState<Paginated<ApiService> | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [medicinesPage, setMedicinesPage] = useState(1);
  const [medicinesData, setMedicinesData] = useState<Paginated<ApiMedicine> | null>(null);
  const [medicinesLoading, setMedicinesLoading] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const [doctorCardsData, setDoctorCardsData] = useState<Paginated<ApiMedicalCard> | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsData, setRoomsData] = useState<Paginated<ApiRoom> | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);

  // Today (local) in YYYY-MM-DD for date inputs
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }, []);

  // Dynamic client detail & medical cards (modal)
  interface ApiClientFull extends ApiClient { address?: string; description?: string; extra_number1?: string; extra_number2?: string; telegram_id?: string }
  const [clientDetail, setClientDetail] = useState<ApiClientFull | null>(null);
  const [clientDetailLoading, setClientDetailLoading] = useState(false);
  const [clientMedicalCards, setClientMedicalCards] = useState<ApiMedicalCard[]>([]);
  const [clientMedicalCardsLoading, setClientMedicalCardsLoading] = useState(false);
  const [clientMedicalCardsError, setClientMedicalCardsError] = useState<string | null>(null);

  // Search states (client-side filtering)
  const [searchClients, setSearchClients] = useState("");
  const [searchServices, setSearchServices] = useState("");
  const [searchMedicines, setSearchMedicines] = useState("");

  // Client profile modal state
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Create Medical Card modal state
  const [createCardDialogOpen, setCreateCardDialogOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [analyses, setAnalyses] = useState("");
  const [revisitDate, setRevisitDate] = useState("");
  const [recommendedFeedText, setRecommendedFeedText] = useState("");
  const [isStationary, setIsStationary] = useState(false);
  const [bookingType, setBookingType] = useState<"DAILY" | "HOURLY">("DAILY");
  const [stationaryRoom, setStationaryRoom] = useState("");
  const [stationaryRoomLabel, setStationaryRoomLabel] = useState<string>("");
  const [stationaryStartDate, setStationaryStartDate] = useState("");
  const [stationaryReleaseDate, setStationaryReleaseDate] = useState("");
  const [hourlyStartDateTime, setHourlyStartDateTime] = useState("");
  const [hourlyEndDateTime, setHourlyEndDateTime] = useState("");
  // Required vitals & selections
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [bloodPressure, setBloodPressure] = useState("");
  const [mucousMembrane, setMucousMembrane] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [chestCondition, setChestCondition] = useState("");
  const [notes, setNotes] = useState("");
  // Selections inside create card modal
  const [selectedServices, setSelectedServices] = useState<Record<number, ServiceSelection>>({});
  const [selectedMedicines, setSelectedMedicines] = useState<Record<number, MedicineSelection>>({});
  const [selectedFeeds, setSelectedFeeds] = useState<Record<number, number>>({});
  // Assigned nurse for medical card (required)
  const [assignedNurseId, setAssignedNurseId] = useState<number | null>(null);
  const [formNurses, setFormNurses] = useState<ApiNurse[]>([]);
  const [formNursesLoading, setFormNursesLoading] = useState(false);
  const [formNursesError, setFormNursesError] = useState<string | null>(null);

  // Pets list for client
  const [petsList, setPetsList] = useState<ApiPet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);
  // New pet creation states
  const [showPetCreateForm, setShowPetCreateForm] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<string | null>(null);
  const [newPetGender, setNewPetGender] = useState<string | null>(null);
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetBirthDate, setNewPetBirthDate] = useState("");
  const [newPetColor, setNewPetColor] = useState("");
  const [newPetWeight, setNewPetWeight] = useState("");
  const [newPetDescription, setNewPetDescription] = useState("");
  const [petCreateLoading, setPetCreateLoading] = useState(false);
  const [petCreateError, setPetCreateError] = useState<string | null>(null);

  // Catalogs for create card modal
  const [formServices, setFormServices] = useState<Paginated<ApiService> | null>(null);
  const [formServicesLoading, setFormServicesLoading] = useState(false);
  const [formMedicines, setFormMedicines] = useState<Paginated<ApiMedicine> | null>(null);
  const [formMedicinesLoading, setFormMedicinesLoading] = useState(false);
  const [formFeeds, setFormFeeds] = useState<Paginated<ApiFeed> | null>(null);
  const [formFeedsLoading, setFormFeedsLoading] = useState(false);
  const [formSearchService, setFormSearchService] = useState("");
  const [formSearchMedicine, setFormSearchMedicine] = useState("");
  const [formSearchFeed, setFormSearchFeed] = useState("");

  // Schedule modal state (follow-up when stationary)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForCardId, setScheduleForCardId] = useState<number | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  type ScheduleTask = { id: string; performer: string; date: string; time: string; description: string; nurseId?: number | null; serviceId?: number | null; startDate?: string; startTime?: string; persisted?: boolean; backendId?: number };
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>([]);

  // Nurses and services for task assignment in schedule modal
  const [nurses, setNurses] = useState<ApiNurse[]>([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [nursesError, setNursesError] = useState<string | null>(null);
  const [scheduleServices, setScheduleServices] = useState<ApiService[]>([]);
  const [scheduleServicesLoading, setScheduleServicesLoading] = useState(false);
  const [scheduleServicesError, setScheduleServicesError] = useState<string | null>(null);

  const [freeRoomsDialogOpen, setFreeRoomsDialogOpen] = useState(false);
  const [freeRoomsData, setFreeRoomsData] = useState<ApiRoom[]>([]);
  const [freeRoomsLoading, setFreeRoomsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [freeRoomsError, setFreeRoomsError] = useState<string | null>(null);
  // Banner image upload state (doctor can change only image)
  const [bannerUploading, setBannerUploading] = useState(false);

  // Edit medical card modal state
  const [editCardDialogOpen, setEditCardDialogOpen] = useState(false);
  const [editCardLoading, setEditCardLoading] = useState(false);
  const [editCardSaving, setEditCardSaving] = useState(false);
  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [editOriginal, setEditOriginal] = useState<ApiMedicalCard | null>(null);
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editAnalyses, setEditAnalyses] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [editChest, setEditChest] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRevisit, setEditRevisit] = useState("");
  const [editRecommendedFeedText, setEditRecommendedFeedText] = useState("");
  const [editIsStationary, setEditIsStationary] = useState(false);
  const [editBookingType, setEditBookingType] = useState<"DAILY" | "HOURLY">("DAILY");
  const [editStationaryRoom, setEditStationaryRoom] = useState<string>("");
  const [editStationaryRoomLabel, setEditStationaryRoomLabel] = useState<string>("");
  const [editStayStart, setEditStayStart] = useState("");
  const [editStayEnd, setEditStayEnd] = useState("");
  const [editHourlyStart, setEditHourlyStart] = useState("");
  const [editHourlyEnd, setEditHourlyEnd] = useState("");
  const [editFreeRoomsDialogOpen, setEditFreeRoomsDialogOpen] = useState(false);

  useEffect(() => {
    if (bookingType === "DAILY") {
      setHourlyStartDateTime("");
      setHourlyEndDateTime("");
    } else {
      setStationaryStartDate("");
      setStationaryReleaseDate("");
    }
  }, [bookingType]);

  useEffect(() => {
    if (editBookingType === "DAILY") {
      setEditHourlyStart("");
      setEditHourlyEnd("");
    } else {
      setEditStayStart("");
      setEditStayEnd("");
    }
  }, [editBookingType]);
  // Edit usages state
  type EditServiceUsageRow = { _localId: string; _new?: boolean; _deleted?: boolean; _dirty?: boolean } & Partial<ApiServiceUsage> & { service_name_fallback?: string };
  type EditMedicineUsageRow = { _localId: string; _new?: boolean; _deleted?: boolean; _dirty?: boolean } & Partial<ApiMedicineUsage>;
  type EditFeedUsageRow = { _localId: string; _new?: boolean; _deleted?: boolean; _dirty?: boolean } & Partial<ApiFeedUsage>;
  const [editServicesUsages, setEditServicesUsages] = useState<EditServiceUsageRow[]>([]);
  const [editMedicinesUsages, setEditMedicinesUsages] = useState<EditMedicineUsageRow[]>([]);
  const [editFeedsUsages, setEditFeedsUsages] = useState<EditFeedUsageRow[]>([]);
  const [editUsagesLoading, setEditUsagesLoading] = useState(false);
  const [editUsagesError, setEditUsagesError] = useState<string | null>(null);
  const [editAttachments, setEditAttachments] = useState<ApiMedicalCardAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<{ file: File; type: "XRAY" | "PRESCRIPTION" | "OTHER" }[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  // Create card attachments state
  const [newCardAttachments, setNewCardAttachments] = useState<{ file: File; type: "XRAY" | "PRESCRIPTION" | "OTHER" }[]>([]);
  // Edit catalogs for adding new rows
  const [editFormServices, setEditFormServices] = useState<Paginated<ApiService> | null>(null);
  const [editFormMedicines, setEditFormMedicines] = useState<Paginated<ApiMedicine> | null>(null);
  const [editFormFeeds, setEditFormFeeds] = useState<Paginated<ApiFeed> | null>(null);
  const [editSearchService, setEditSearchService] = useState("");
  const [editSearchMedicine, setEditSearchMedicine] = useState("");
  const [editSearchFeed, setEditSearchFeed] = useState("");

  const openEditCard = async (id: number) => {
    setEditCardId(id);
    setEditCardDialogOpen(true);
    setEditCardLoading(true);
    setEditOriginal(null);
    try {
      const { data } = await api.get(`medical-cards/${id}/`);
      const card = data as ApiMedicalCard & { attachments?: ApiMedicalCardAttachment[] };
      setEditOriginal(card);
      setEditDiagnosis(card.diagnosis || "");
      setEditAnalyses(card.analyze || "");
      setEditSymptoms(card.general_condition || "");
      setEditChest(card.chest_condition || "");
      setEditNotes(card.notes || "");
      setEditRevisit(card.revisit_date ? (card.revisit_date as string).slice(0,10) : "");
      setEditRecommendedFeedText(card.recommended_feed_text || "");
      setEditAttachments(card.attachments || []);
      setPendingAttachments([]);
      const hasStationary = Boolean(card.stationary_room || card.stay_start || card.stay_end || card.hourly_start || card.hourly_end);
      setEditIsStationary(hasStationary);
      setEditBookingType((card.booking_type as any) || "DAILY");
      setEditStationaryRoom(card.stationary_room ? String(card.stationary_room) : "");
      setEditStayStart(card.stay_start ? String(card.stay_start).slice(0,10) : "");
    	setEditStayEnd(card.stay_end ? String(card.stay_end).slice(0,10) : "");
    	setEditHourlyStart(card.hourly_start ? String(card.hourly_start).slice(0,16) : "");
    	setEditHourlyEnd(card.hourly_end ? String(card.hourly_end).slice(0,16) : "");
    	setEditStationaryRoomLabel(card.stationary_room ? t('doctor.room.fallback', { id: card.stationary_room }) : "");
      // Load usages and catalogs in parallel
      setEditUsagesLoading(true); setEditUsagesError(null);
      Promise.all([
        api.get(`service-usages/?medical_card=${id}`).then(r => r.data).catch(() => null),
        api.get(`medicine-usages/?medical_card=${id}`).then(r => r.data).catch(() => null),
        api.get('services/?page=1').then(r => r.data).catch(() => null),
        api.get('medicines/?page=1').then(r => r.data).catch(() => null),
      ]).then(([su, mu, sc, mc]) => {
        const norm = (d: any) => Array.isArray(d) ? d : (Array.isArray(d?.results) ? d.results : []);
        const suArr: ApiServiceUsage[] = norm(su);
        const muArr: ApiMedicineUsage[] = norm(mu);
        setEditServicesUsages(suArr.map(u => ({ _localId: `su-${u.id}`, ...u })));
        setEditMedicinesUsages(muArr.map(u => ({ _localId: `mu-${u.id}`, ...u })));
        setEditFeedsUsages([]);
        setEditFormServices(sc && Array.isArray(sc.results) ? sc : { count: 0, next: null, previous: null, results: [] });
        setEditFormMedicines(mc && Array.isArray(mc.results) ? mc : { count: 0, next: null, previous: null, results: [] });
      }).catch((e:any) => setEditUsagesError(e?.message || t('doctor.edit.loadUsagesError')))
        .finally(() => setEditUsagesLoading(false));
    } catch (e:any) {
      toast({ title: t('doctor.edit.loadCardError'), description: e?.message, variant: 'destructive' });
      setEditCardDialogOpen(false);
    } finally {
      setEditCardLoading(false);
    }
  };

  const handleSelectEditFreeRoom = (room: ApiRoom) => {
    const label = room.room_number || room.description || t('doctor.room.fallback', { id: room.id });
    setEditStationaryRoom(String(room.id));
    setEditStationaryRoomLabel(label);
    if (!editIsStationary) setEditIsStationary(true);
    setEditFreeRoomsDialogOpen(false);
  };

  const saveEditCard = async () => {
    if (!editCardId || !editOriginal) return;
    const patch: any = {};
    if ((editDiagnosis || '') !== (editOriginal.diagnosis || '')) patch.diagnosis = editDiagnosis.trim();
    if ((editAnalyses || '') !== (editOriginal.analyze || '')) patch.analyze = editAnalyses.trim();
    if ((editSymptoms || '') !== (editOriginal.general_condition || '')) patch.general_condition = editSymptoms.trim();
    if ((editChest || '') !== (editOriginal.chest_condition || '')) patch.chest_condition = editChest.trim();
    if ((editNotes || '') !== (editOriginal.notes || '')) patch.notes = editNotes.trim();
    if ((editRecommendedFeedText || '') !== (editOriginal.recommended_feed_text || '')) {
      patch.recommended_feed_text = editRecommendedFeedText.trim();
    }
    const newRevisitIso = editRevisit ? new Date(editRevisit).toISOString() : null;
    const oldRevisit = editOriginal.revisit_date ?? null;
    if ((newRevisitIso || null) !== (oldRevisit || null)) patch.revisit_date = newRevisitIso;

    const origHasStationary = Boolean(
      editOriginal.stationary_room ||
      editOriginal.stay_start ||
      editOriginal.stay_end ||
      editOriginal.hourly_start ||
      editOriginal.hourly_end
    );

    if (editIsStationary) {
      if (!editStationaryRoom) {
        toast({ title: t('doctor.edit.stationaryRequiredTitle'), description: t('doctor.edit.stationaryRequiredDescription'), variant: 'destructive' });
        return;
      }

      patch.stationary_room = Number(editStationaryRoom);
      patch.booking_type = editBookingType;

      if (editBookingType === "DAILY") {
        if (!editStayStart || !editStayEnd) {
          toast({ title: t('doctor.edit.stationaryRequiredTitle'), description: t('doctor.edit.stationaryRequiredDescription'), variant: 'destructive' });
          return;
        }
        patch.stay_start = editStayStart;
        patch.stay_end = editStayEnd;
        patch.hourly_start = null;
        patch.hourly_end = null;
      } else {
        if (!editHourlyStart || !editHourlyEnd) {
          toast({ title: t('doctor.edit.stationaryRequiredTitle'), description: t('doctor.edit.stationaryRequiredDescription'), variant: 'destructive' });
          return;
        }
        patch.hourly_start = new Date(editHourlyStart).toISOString();
        patch.hourly_end = new Date(editHourlyEnd).toISOString();
        patch.stay_start = null;
        patch.stay_end = null;
      }
    } else if (origHasStationary) {
      // Clearing stationary: send all related fields as nulls
      patch.stationary_room = null;
      patch.booking_type = null;
      patch.stay_start = null;
      patch.stay_end = null;
      patch.hourly_start = null;
      patch.hourly_end = null;
    }

    if (Object.keys(patch).length === 0) {
      toast({ title: t('doctor.edit.noChanges') });
      setEditCardDialogOpen(false);
      return;
    }

    setEditCardSaving(true);
    try {
      // 1) Save card changes if any
      if (Object.keys(patch).length > 0) {
        await api.patch(`medical-cards/${editCardId}/`, patch);
      }

      // 2) Persist usages changes sequentially to avoid DB locks
      // Services
      for (const row of editServicesUsages) {
        if (row._deleted && row.id) {
          try { await api.delete(`service-usages/${row.id}/`); } catch {}
          continue;
        }
        if (row._new) {
          if (!row.service || !row.quantity) continue;
          const serviceRecord = editFormServices?.results.find(s => s.id === row.service);
          const svcName = serviceRecord?.service_name || serviceRecord?.name || row.service_name || row.service_name_fallback || t('doctor.edit.services.fallback', { id: row.service });
          const payload: any = { medical_card: editCardId, service: row.service, service_name: svcName, quantity: Number(row.quantity) };
          if (row.description) payload.description = row.description;
          try { await api.post('service-usages/', payload); } catch {}
          continue;
        }
        if (row.id && row._dirty) {
          const payload: any = {};
          if (typeof row.quantity === 'number') payload.quantity = row.quantity;
          if (typeof row.description === 'string') payload.description = row.description;
          if (typeof row.service === 'number') {
            payload.service = row.service;
            const serviceRecord = editFormServices?.results.find(s => s.id === row.service);
            const svcName = serviceRecord?.service_name || serviceRecord?.name || row.service_name || row.service_name_fallback || t('doctor.edit.services.fallback', { id: row.service });
            payload.service_name = svcName;
          }
          if (Object.keys(payload).length > 0) {
            try { await api.patch(`service-usages/${row.id}/`, payload); } catch {}
          }
        }
      }

      // Medicines
      for (const row of editMedicinesUsages) {
        if (row._deleted && row.id) {
          try { await api.delete(`medicine-usages/${row.id}/`); } catch {}
          continue;
        }
        if (row._new) {
          if (!row.medicine || !row.quantity || !row.dosage) continue;
          const medRecord = editFormMedicines?.results.find(m => m.id === row.medicine);
          const name = medRecord?.medicine_name || medRecord?.name || row.name || t('doctor.edit.medicines.fallback', { id: row.medicine });
          const payload: any = { medical_card: editCardId, medicine: row.medicine, quantity: Number(row.quantity), dosage: String(row.dosage), name };
          try { await api.post('medicine-usages/', payload); } catch {}
          continue;
        }
        if (row.id && row._dirty) {
          const payload: any = {};
          if (typeof row.quantity === 'number') payload.quantity = row.quantity;
          if (typeof row.dosage === 'string') payload.dosage = row.dosage;
          if (typeof row.medicine === 'number') {
            payload.medicine = row.medicine;
            const medRecord = editFormMedicines?.results.find(m => m.id === row.medicine);
            payload.name = medRecord?.medicine_name || medRecord?.name || row.name || t('doctor.edit.medicines.fallback', { id: row.medicine });
          }
          if (Object.keys(payload).length > 0) {
            try { await api.patch(`medicine-usages/${row.id}/`, payload); } catch {}
          }
        }
      }

      // 3) Upload pending attachments if any
      if (pendingAttachments.length && editCardId) {
        try {
          setAttachmentsUploading(true);
          const createdAll: any[] = [];

          // Backend accepts multiple files via files/types lists, but
          // sending one file per request avoids partial failures and
          // makes error handling clearer.
          for (const att of pendingAttachments) {
            const form = new FormData();
            form.append("files", att.file);
            form.append("types", att.type);

            try {
              const { data } = await api.post(`medical-cards/${editCardId}/attachments/`, form, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              if (Array.isArray(data)) {
                createdAll.push(...data);
              } else if (data) {
                createdAll.push(data);
              }
            } catch (e: any) {
              // Surface backend validation errors (size/type/etc.)
              const message = e?.response?.data || e?.message;
              toast({
                title: t('doctor.edit.attachments.uploadError', { defaultValue: 'Не удалось загрузить вложения' }),
                description: typeof message === 'string' ? message : JSON.stringify(message),
                variant: 'destructive',
              });
            }
          }

          if (createdAll.length) {
            setEditAttachments(prev => [...prev, ...createdAll]);
          }
          setPendingAttachments([]);
        } finally {
          setAttachmentsUploading(false);
        }
      }

      // Feeds
      for (const row of editFeedsUsages) {
        if (row._deleted && row.id) {
          try { await api.delete(`feed-usages/${row.id}/`); } catch {}
          continue;
        }
        if (row._new) {
          if (!row.feed || !row.quantity) continue;
          const payload: any = { medical_card: editCardId, feed: row.feed, quantity: Number(row.quantity) };
          try { await api.post('feed-usages/', payload); } catch {}
          continue;
        }
        if (row.id && row._dirty) {
          const payload: any = {};
          if (typeof row.quantity === 'number') payload.quantity = row.quantity;
          if (typeof row.feed === 'number') payload.feed = row.feed;
          if (Object.keys(payload).length > 0) {
            try { await api.patch(`feed-usages/${row.id}/`, payload); } catch {}
          }
        }
      }

  toast({ title: t('doctor.edit.saveSuccess') });
      setEditCardDialogOpen(false);
      // refresh doctor cards list
      if (me?.id) {
        fetchPage<ApiMedicalCard>(`medical-cards/by-doctor/${me.id}/?page=${historyPage}`, d => setDoctorCardsData(d), setHistoryLoading);
      }
      // refresh client cards list in profile modal if open
      if (selectedClient?.id) {
        try {
          const { data } = await api.get(`medical-cards/by-user/${Number(selectedClient.id)}/`);
          const results = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
          setClientMedicalCards(results);
        } catch {}
      }
    } catch (e:any) {
  toast({ title: t('doctor.edit.saveError'), description: e?.message, variant: 'destructive' });
    } finally {
      setEditCardSaving(false);
    }
  };

  const toDateTimeLocalValue = (iso?: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  };

  const splitIsoToLocalParts = (iso?: string | null) => {
    if (!iso) return { date: "", time: "" };
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return { date: "", time: "" };
    const offsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offsetMs);
    const [d, t] = local.toISOString().split("T");
    return { date: d, time: t.slice(0, 5) };
  };

  const combineDateTimeLocalToIso = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const combineDateAndTimeToIso = (date: string, time: string) => {
    if (!date || !time) return null;
    const composed = new Date(`${date}T${time}`);
    if (Number.isNaN(composed.getTime())) return null;
    return composed.toISOString();
  };

  // Inline component: editor for schedule tasks
  const ScheduleTasksEditor = () => {
    const [perf, setPerf] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [nurseId, setNurseId] = useState<number | null>(null);
    const [serviceId, setServiceId] = useState<number | null>(null);
    const [desc, setDesc] = useState("");

    const addTask = () => {
      if (!perf.trim() || !date || !time || !desc.trim() || !nurseId || !serviceId) {
        toast({
          title: t('doctor.schedule.task.validationTitle'),
          description: t('doctor.schedule.task.validationDescription'),
          variant: "destructive",
        });
        return;
      }
      setScheduleTasks((prev) => [
        ...prev,
        { id: `t-${Date.now()}`,
          performer: perf.trim(),
          startDate: startDate || date,
          startTime: startTime || time,
          date,
          time,
          nurseId,
          serviceId,
          description: desc.trim(),
          persisted: false },
      ]);
      setPerf(""); setStartDate(""); setStartTime(""); setDate(""); setTime(""); setNurseId(null); setServiceId(null); setDesc("");
    };

    return (
      <div className="space-y-4">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>{t('doctor.schedule.addTaskTitle')}</CardTitle>
            <CardDescription>{t('doctor.schedule.addTaskSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-6 gap-3">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="perf">{t('doctor.schedule.task.nameLabel')}</Label>
              <Input id="perf" value={perf} onChange={(e) => setPerf(e.target.value)} placeholder={t('doctor.schedule.task.namePlaceholder')} />
            </div>
            {/* Two-column time/date groups for better differentiation */}
            <div className="md:col-span-3 space-y-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="sdate">{t('doctor.schedule.task.startDateLabel')}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="sdate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-9 focus-visible:ring-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stime">{t('doctor.schedule.task.startTimeLabel')}</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="stime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pl-9 focus-visible:ring-secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-3 space-y-2">
              <div className="rounded-md border bg-background p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tdate">{t('doctor.schedule.task.deadlineDateLabel')}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="tdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9 focus-visible:ring-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ttime">{t('doctor.schedule.task.deadlineTimeLabel')}</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="ttime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9 focus-visible:ring-secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>{t('doctor.schedule.task.nurseLabel')}</Label>
              <Select value={nurseId ? String(nurseId) : undefined} onValueChange={(v) => setNurseId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder={nursesLoading ? t('doctor.schedule.task.nurseSelectLoading') : t('doctor.schedule.task.nurseSelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {nurses.map(n => {
                    const name = (n.first_name || '') + (n.last_name ? (' ' + n.last_name) : '') || n.name || `ID ${n.id}`;
                    return <SelectItem key={n.id} value={String(n.id)}>{name.trim() || `ID ${n.id}`}</SelectItem>;
                  })}
                  {!nursesLoading && nurses.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">{t('doctor.schedule.task.noUsers')}</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>{t('doctor.schedule.task.serviceLabel')}</Label>
              <Select value={serviceId ? String(serviceId) : undefined} onValueChange={(v) => setServiceId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder={scheduleServicesLoading ? t('doctor.schedule.task.serviceSelectLoading') : t('doctor.schedule.task.serviceSelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {scheduleServices.map(s => {
                    const name = s.service_name || s.name || `ID ${s.id}`;
                    return <SelectItem key={s.id} value={String(s.id)}>{name}</SelectItem>;
                  })}
                  {!scheduleServicesLoading && scheduleServices.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">{t('doctor.schedule.task.noServices')}</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="tdesc">{t('doctor.schedule.task.descriptionLabel')}</Label>
              <Textarea id="tdesc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('doctor.schedule.task.descriptionPlaceholder')} />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button onClick={addTask} className="bg-gradient-hero" disabled={scheduleSaving}>{t('doctor.schedule.task.addButton')}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>{t('doctor.schedule.tasksTitle')}</CardTitle>
            <CardDescription>{t('doctor.schedule.tasksSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduleTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('doctor.schedule.tasksEmpty')}</div>
            ) : (
              <div className="space-y-2">
                {scheduleTasks.map(task => (
                  <div key={task.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span>{task.performer || t('doctor.schedule.task.untitled')}</span>
                        {task.persisted && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('doctor.schedule.task.persistedBadge')}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('doctor.schedule.task.startPrefix')} {task.startDate || task.date || "—"} • {task.startTime || task.time || "—"} • {t('doctor.schedule.task.deadlinePrefix')} {task.date || "—"} • {task.time || "—"}</div>
                      <div className="text-sm text-muted-foreground">{task.description || " "}</div>
                    </div>
                    <Button variant="outline" size="sm" disabled={task.persisted || scheduleSaving}
                      onClick={() => setScheduleTasks(prev => prev.filter(x => x.id !== task.id))}>{t('doctor.schedule.task.deleteButton')}</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const openClientProfile = (client: Client) => {
    setSelectedClient(client);
    setClientDialogOpen(true);
    // Reset & fetch client detail and medical cards
    const idNum = Number(client.id);
    if (!isFinite(idNum)) return;
    setClientDetail(null); setClientDetailLoading(true);
    setClientMedicalCards([]); setClientMedicalCardsLoading(true); setClientMedicalCardsError(null);
    api.get(`clients/${idNum}/`).then(r => setClientDetail(r.data)).catch(() => setClientDetail(null)).finally(() => setClientDetailLoading(false));
    api.get(`medical-cards/by-user/${idNum}/`).then(r => {
      const data = r.data;
      let cards: ApiMedicalCard[] = [];
      if (data) {
        if (Array.isArray(data)) cards = data as ApiMedicalCard[];
        else if (Array.isArray(data.results)) cards = data.results as ApiMedicalCard[];
        else if (typeof data === 'object') cards = [data as ApiMedicalCard];
      }
      setClientMedicalCards(cards);
  }).catch(() => setClientMedicalCardsError(t('doctor.clientCards.loadError'))).finally(() => setClientMedicalCardsLoading(false));
  };
  const closeClientProfile = () => {
    setClientDialogOpen(false);
    setSelectedClient(null);
    setClientDetail(null);
    setClientMedicalCards([]);
    resetCreateCardForm();
  };

  const resetCreateCardForm = () => {
  setWeight(""); setTemperature("");
    setSymptoms(""); setDiagnosis(""); setAnalyses(""); setRevisitDate(""); setRecommendedFeedText("");
  setIsStationary(false); setStationaryRoom(""); setStationaryRoomLabel(""); setStationaryStartDate(""); setStationaryReleaseDate("");
  setFreeRoomsData([]); setFreeRoomsError(null);
    setSelectedServices({}); setSelectedMedicines({}); setSelectedFeeds({});
    setFormSearchService(""); setFormSearchMedicine(""); setFormSearchFeed("");
    setSelectedPetId(null); setBloodPressure(""); setMucousMembrane(""); setHeartRate(""); setRespiratoryRate(""); setChestCondition(""); setNotes("");
    setShowPetCreateForm(false); setNewPetName(""); setNewPetSpecies(null); setNewPetGender(null); setNewPetBreed(""); setNewPetBirthDate(""); setNewPetColor(""); setNewPetWeight(""); setNewPetDescription(""); setPetCreateError(null);
    setAssignedNurseId(null); setFormNursesError(null);
  };

  // Load catalogs when create-card modal opens
  useEffect(() => {
    if (createCardDialogOpen) {
      // Load client's pets for selection
      if (selectedClient?.id) {
        setPetsLoading(true); setPetsError(null); setPetsList([]);
        const userId = Number(selectedClient.id);
        api.get(`pets/by-user/${userId}/`).then(r => {
          const data = r.data;
          const results = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
          setPetsList(results);
          if (results.length === 0) {
            setShowPetCreateForm(true);
          }
  }).catch(() => setPetsError(t('doctor.pet.loadError'))).finally(() => setPetsLoading(false));
      }
      // Load nurses for assignment
      setFormNursesLoading(true); setFormNursesError(null);
      api.get('nurses/').then(r => {
        const data = r.data;
        const results = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setFormNurses(results);
      }).catch(() => setFormNursesError(t('doctor.create.nursesLoadError'))).finally(() => setFormNursesLoading(false));
      
      setFormServicesLoading(true);
      setFormMedicinesLoading(true);
      setFormFeedsLoading(true);
      Promise.all([
        fetchAllPaginated<ApiService>('services/'),
        fetchAllPaginated<ApiMedicine>('medicines/'),
        fetchAllPaginated<ApiFeed>('pet-feeds/'),
      ]).then(([s, m, f]) => {
        setFormServices(s);
        setFormMedicines(m);
        setFormFeeds(f);
      }).finally(() => { setFormServicesLoading(false); setFormMedicinesLoading(false); setFormFeedsLoading(false); });
    } else {
      // reset selections when closing
      setSelectedServices({}); setSelectedMedicines({}); setSelectedFeeds({});
      setFormSearchService(""); setFormSearchMedicine(""); setFormSearchFeed("");
    }
  }, [createCardDialogOpen]);

  const toggleServiceSelect = (id: number, checked: boolean) => {
    setSelectedServices(prev => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? { quantity: 1, description: "" };
      else delete next[id];
      return next;
    });
  };
  const setServiceQty = (id: number, qty: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { quantity: 1, description: "" }), quantity: Math.max(1, Math.floor(qty || 0)) },
    }));
  };
  const setServiceDescription = (id: number, description: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { quantity: 1, description: "" }), description },
    }));
  };
  const toggleMedicineSelect = (id: number, checked: boolean) => {
    setSelectedMedicines(prev => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? { quantity: 1, dosage: "" };
      else delete next[id];
      return next;
    });
  };
  const setMedicineQty = (id: number, qty: number) => {
    setSelectedMedicines(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { quantity: 1, dosage: "" }), quantity: Math.max(1, Math.floor(qty || 0)) },
    }));
  };
  const setMedicineDosage = (id: number, dosage: string) => {
    setSelectedMedicines(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { quantity: 1, dosage: "" }), dosage },
    }));
  };
  const toggleFeed = (id: number, qty: number) => {
    setSelectedFeeds(prev => {
      const nextQty = Math.max(0, Math.floor(qty || 0));
      const next = { ...prev };
      if (nextQty > 0) next[id] = nextQty;
      else delete next[id];
      return next;
    });
  };

  const getServiceName = (id: number) => {
    const record = formServices?.results.find(s => s.id === id);
    return record?.service_name || record?.name || t('doctor.edit.services.fallback', { id });
  };

  const getMedicineName = (id: number) => {
    const record = formMedicines?.results.find(m => m.id === id);
    return record?.medicine_name || record?.name || t('doctor.edit.medicines.fallback', { id });
  };

  const toDateIso = (value?: string | null, endOfDay = false) => {
    if (!value) return null;
    const suffix = endOfDay ? 'T23:59:59' : 'T00:00:00';
    return new Date(`${value}${suffix}`).toISOString();
  };

  const handleSaveMedicalCard = async () => {
    if (!selectedClient) { toast({ title: t('doctor.create.validation.selectClient'), variant: "destructive" }); return; }
    if (!selectedPetId) { toast({ title: t('doctor.create.validation.selectPet'), variant: "destructive" }); return; }
    if (!assignedNurseId) { toast({ title: t('doctor.create.validation.selectNurse'), variant: "destructive" }); return; }
    if (!diagnosis.trim()) { toast({ title: t('doctor.create.validation.diagnosis'), variant: "destructive" }); return; }
    // Required numeric vitals
    const weightNum = Number(weight);
    const tempNum = Number(temperature);
    const bpStr = bloodPressure.trim();
    const hrNum = Number(heartRate);
    const rrNum = Number(respiratoryRate);
    const mmStr = mucousMembrane.trim();
    const chestStr = chestCondition.trim();
    const notesStr = notes.trim();
    const missing: string[] = [];
    if (!isFinite(weightNum)) missing.push(t('doctor.vitals.weight'));
    if (!isFinite(tempNum)) missing.push(t('doctor.vitals.temperature'));
    if (!bpStr) missing.push(t('doctor.vitals.bloodPressure'));
    if (!isFinite(hrNum)) missing.push(t('doctor.vitals.heartRate'));
    if (!isFinite(rrNum)) missing.push(t('doctor.vitals.respiratoryRate'));
    if (!mmStr) missing.push(t('doctor.vitals.mucous'));
    if (!chestStr) missing.push(t('doctor.vitals.chest'));
    if (!notesStr) missing.push(t('doctor.vitals.notes'));
    if (missing.length) { toast({ title: t('doctor.create.validation.requiredFieldsTitle'), description: missing.join(', '), variant: 'destructive' }); return; }
    const selectedServiceEntries = Object.entries(selectedServices);
    const selectedMedicineEntries = Object.entries(selectedMedicines);

    const medicinesMissingDosage = selectedMedicineEntries.filter(([, v]) => !v.dosage.trim());
    if (medicinesMissingDosage.length) {
      toast({ title: t('doctor.create.validation.requiredFieldsTitle'), description: t('doctor.create.validation.medicineDosage'), variant: "destructive" });
      return;
    }

    // Create medical card via API
    if (!doctorId) {
      toast({ title: t('doctor.create.determineDoctorError'), description: t('doctor.create.tryLater'), variant: 'destructive' });
      return;
    }
    const payload: any = {
      client: Number(selectedClient.id),
      doctor: doctorId,
      pet: selectedPetId,
      assigned_nurse: assignedNurseId,
      diagnosis: diagnosis.trim(),
      analyze: analyses.trim() || undefined,
      general_condition: symptoms.trim() || undefined,
      chest_condition: chestStr,
      notes: notesStr,
      weight: weightNum,
      blood_pressure: bpStr || null,
      mucous_membrane: mmStr,
      heart_rate: hrNum,
      respiratory_rate: rrNum,
      body_temperature: tempNum,
      revisit_date: revisitDate ? new Date(revisitDate).toISOString() : null,
      recommended_feed_text: recommendedFeedText.trim() || undefined,
      status: 'OPEN',
    };
    if (isStationary && stationaryRoom) {
      payload.stationary_room = Number(stationaryRoom);
      payload.booking_type = bookingType;

      if (bookingType === "DAILY") {
        payload.stay_start = stationaryStartDate || null;
        payload.stay_end = stationaryReleaseDate || null;
        payload.hourly_start = null;
        payload.hourly_end = null;
      } else {
        payload.stay_start = null;
        payload.stay_end = null;
        payload.hourly_start = hourlyStartDateTime ? new Date(hourlyStartDateTime).toISOString() : null;
        payload.hourly_end = hourlyEndDateTime ? new Date(hourlyEndDateTime).toISOString() : null;
      }
    }
    let createdCard: ApiMedicalCard | null = null;
    try {
      const { data } = await api.post('medical-cards/', payload);
      createdCard = data;
    } catch (e:any) {
      toast({ title: t('doctor.create.createErrorTitle'), description: e?.message || t('doctor.create.serverError'), variant: 'destructive' });
      return;
    }

    const cardIdRaw = createdCard?.id;
    const cardId = typeof cardIdRaw === 'number' ? cardIdRaw : Number(cardIdRaw);
    if (!Number.isFinite(cardId)) {
      toast({ title: t('doctor.create.idMissingTitle'), description: t('doctor.create.idMissingDescription'), variant: 'destructive' });
      return;
    }

    // Post usages in parallel (best-effort)
    const servicePosts = selectedServiceEntries
      .filter(([, detail]) => detail.quantity > 0)
      .map(([sid, detail]) => {
        const serviceId = Number(sid);
        const serviceName = getServiceName(serviceId);
        const trimmedDescription = detail.description.trim();
        return api.post('service-usages/', {
          medical_card: cardId,
          service: serviceId,
          service_name: serviceName,
          quantity: Number(detail.quantity),
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        }).catch(() => null);
      });
    const medicinePosts = selectedMedicineEntries
      .filter(([, detail]) => detail.quantity > 0 && detail.dosage.trim())
      .map(([mid, detail]) => api.post('medicine-usages/', {
        medical_card: cardId,
        medicine: Number(mid),
        quantity: Number(detail.quantity),
        name: getMedicineName(Number(mid)),
        dosage: detail.dosage.trim(),
      }).catch(() => null));
    await Promise.allSettled([...servicePosts, ...medicinePosts]);

    // Upload attachments chosen during card creation
    if (newCardAttachments.length) {
      const createdAll: any[] = [];
      for (const att of newCardAttachments) {
        const form = new FormData();
        form.append("files", att.file);
        form.append("types", att.type);
        try {
          const { data } = await api.post(`medical-cards/${cardId}/attachments/`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (Array.isArray(data)) {
            createdAll.push(...data);
          } else if (data) {
            createdAll.push(data);
          }
        } catch (e: any) {
          const message = e?.response?.data || e?.message;
          toast({
            title: t('doctor.edit.attachments.uploadError', { defaultValue: 'Не удалось загрузить вложения' }),
            description: typeof message === 'string' ? message : JSON.stringify(message),
            variant: 'destructive',
          });
        }
      }
    }

    // Refresh client cards list
    try {
      const { data } = await api.get(`medical-cards/by-user/${Number(selectedClient.id)}/`);
      const results = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      setClientMedicalCards(results);
    } catch {
      // fallback: append locally
      setClientMedicalCards(prev => [{ ...createdCard! }, ...prev]);
    }

    setCreateCardDialogOpen(false);
  	toast({ title: t('doctor.create.successTitle'), description: t('doctor.create.successDescription', { id: cardId }) });
    resetCreateCardForm();
  };

  const handleCreatePet = async () => {
    if (!selectedClient) { toast({ title: t('doctor.create.pet.noClient'), variant: 'destructive' }); return; }
    if (!newPetName.trim()) { toast({ title: t('doctor.create.pet.nameRequired'), variant: 'destructive' }); return; }
    if (!newPetSpecies) { toast({ title: t('doctor.create.pet.speciesRequired'), variant: 'destructive' }); return; }
    if (!newPetGender) { toast({ title: t('doctor.create.pet.genderRequired'), variant: 'destructive' }); return; }
    setPetCreateLoading(true); setPetCreateError(null);
    try {
      const payload: any = {
        client_id: Number(selectedClient.id),
        name: newPetName.trim(),
        species: newPetSpecies,
        gender: newPetGender,
        breed: newPetBreed.trim() || undefined,
        birth_date: newPetBirthDate || undefined,
        color: newPetColor.trim() || undefined,
        weight_kg: newPetWeight ? newPetWeight.trim() : undefined,
        description: newPetDescription.trim() || undefined,
      };
      const { data } = await api.post('pets/create-for-client/', payload);
      // Append and select new pet
      setPetsList(prev => [data, ...prev]);
      setSelectedPetId(data.id);
      toast({ title: t('doctor.create.pet.successTitle'), description: t('doctor.create.pet.successDescription', { name: data.name || data.pet_name || `ID ${data.id}` }) });
      setShowPetCreateForm(false);
      setNewPetName(''); setNewPetSpecies(null); setNewPetGender(null); setNewPetBreed(''); setNewPetBirthDate(''); setNewPetColor(''); setNewPetWeight(''); setNewPetDescription('');
    } catch (e:any) {
      setPetCreateError(e?.message || t('doctor.create.pet.errorUnknown'));
      toast({ title: t('doctor.create.pet.errorTitle'), description: e?.message, variant: 'destructive' });
    } finally {
      setPetCreateLoading(false);
    }
  };

  const handleSelectFreeRoom = (room: ApiRoom) => {
    const label = room.room_number || room.description || t('doctor.room.fallback', { id: room.id });
    setStationaryRoom(String(room.id));
    setStationaryRoomLabel(label);
    if (!isStationary) setIsStationary(true);
    setFreeRoomsDialogOpen(false);
  };

  const ensureScheduleId = async (cardId: number, isoDate: string) => {
    let currentId = scheduleId;
    if (!currentId) {
      try {
        const { data } = await api.get(`schedules/?medical_card=${cardId}`);
        const list = Array.isArray((data as any)?.results) ? (data as any).results : (Array.isArray(data) ? data : []);
        const existing = list[0];
        if (existing) {
          currentId = typeof existing.id === 'number' ? existing.id : Number(existing.id);
          if (!Number.isFinite(currentId)) currentId = null;
        }
      } catch (e) {
        // swallow and create below
      }
    }
    if (!currentId) {
      const payload: any = { medical_card: cardId, date: isoDate, status: 'PENDING' as const };
      // Include explicit relations if requested
      if (doctorId) payload.doctor = doctorId;
      if (selectedClient?.id) payload.client = Number(selectedClient.id);
      if (selectedPetId) payload.pet = selectedPetId;
      const { data } = await api.post('schedules/', payload);
      currentId = typeof data?.id === 'number' ? data.id : Number(data?.id);
      if (!Number.isFinite(currentId)) currentId = null;
    } else {
      try {
        await api.patch(`schedules/${currentId}/`, { date: isoDate });
      } catch (e) {
        // ignore patch errors silently to avoid blocking task creation; backend may reject identical value
      }
    }
    setScheduleId(currentId ?? null);
    return currentId;
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForCardId) {
      toast({ title: t('doctor.schedule.cardMissing'), variant: 'destructive' });
      return;
    }
    if (!scheduleDateTime) {
      toast({ title: t('doctor.schedule.datetimeRequired'), variant: 'destructive' });
      return;
    }
    const scheduleIso = combineDateTimeLocalToIso(scheduleDateTime);
    if (!scheduleIso) {
      toast({ title: t('doctor.schedule.invalidDate'), variant: 'destructive' });
      return;
    }

    setScheduleSaving(true);
    setScheduleError(null);
    try {
      const scheduleIdentifier = await ensureScheduleId(scheduleForCardId, scheduleIso);
  if (!scheduleIdentifier) throw new Error(t('doctor.schedule.createError'));

      const creations: Array<{ localId: string; backendId: number }> = [];
      for (const task of scheduleTasks.filter(t => !t.persisted)) {
        const dueIso = combineDateAndTimeToIso(task.date, task.time);
        const startIso = combineDateAndTimeToIso(task.startDate || task.date, task.startTime || task.time);
        const title = (task.performer || '').trim();
        const description = (task.description || '').trim();
        if (!title || !description || !dueIso || !startIso || !task.nurseId || !task.serviceId) {
          toast({
            title: t('doctor.schedule.task.validationTitle'),
            description: t('doctor.schedule.task.validationExtended'),
            variant: 'destructive',
          });
          continue;
        }
        const payload: Record<string, unknown> = {
          schedule: scheduleIdentifier,
          title,
          description,
          assigned_nurse: task.nurseId,
          service: task.serviceId,
          datetime: startIso,
          due_date: dueIso,
          status: 'TODO',
        };
        try {
          const { data } = await api.post('tasks/', payload);
          const backendId = typeof data?.id === 'number' ? data.id : Number(data?.id);
          if (Number.isFinite(backendId)) creations.push({ localId: task.id, backendId });
        } catch (taskError: any) {
          toast({ title: t('doctor.schedule.task.createError'), description: taskError?.message, variant: 'destructive' });
        }
      }

      if (creations.length) {
        setScheduleTasks(prev => prev.map(task => {
          const created = creations.find(c => c.localId === task.id);
          return created ? { ...task, persisted: true, backendId: created.backendId } : task;
        }));
      }

      toast({ title: t('doctor.schedule.saveSuccess') });
      setScheduleDialogOpen(false);
    } catch (e: any) {
      const description = e?.response?.data?.detail || e?.message || t('doctor.schedule.saveErrorDescription');
      setScheduleError(description);
      toast({ title: t('doctor.schedule.saveErrorTitle'), description, variant: 'destructive' });
    } finally {
      setScheduleSaving(false);
    }
  };

  useEffect(() => { setLoading(false); }, [isPublic]);

  // Generic paginated fetch helper
  const fetchPage = async <T,>(url: string, setter: (d: Paginated<T>) => void, setLoad: (b: boolean) => void) => {
    setLoad(true);
    try {
      const { data } = await api.get(url);
      if (data && Array.isArray(data.results)) setter(data);
    } catch (e) {
      toast({ title: t('doctor.fetch.errorTitle'), description: t('doctor.fetch.errorDescription', { resource: url }), variant: 'destructive' });
    } finally {
      setLoad(false);
    }
  };

  // Fetch the entire catalog (all pages) to show full lists in the create-card modal.
  // Uses explicit page & page_size to avoid relying solely on "next" links and prevents partial lists.
  const fetchAllPaginated = async <T,>(endpoint: string): Promise<Paginated<T>> => {
    const empty: Paginated<T> = { count: 0, next: null, previous: null, results: [] };
    try {
      let page = 1;
      const pageSize = 100;
      let results: T[] = [];
      let guard = 0;
      let hasMore = true;
      let totalCount: number | null = null;

      while (hasMore && guard < 50) {
        const separator = endpoint.includes("?") ? "&" : "?";
        const url = `${endpoint}${separator}page=${page}&page_size=${pageSize}`;
        const { data } = await api.get(url);

        if (Array.isArray(data)) {
          // Backend returned a plain array (non-paginated)
          return { count: data.length, next: null, previous: null, results: data };
        }

        const pageResults: T[] = Array.isArray(data?.results) ? data.results : [];
        if (typeof data?.count === "number") totalCount = data.count;

        results = results.concat(pageResults);
        page += 1;
        guard += 1;

        const reachedCount = totalCount != null && results.length >= totalCount;
        const hasNext = Boolean(data?.next);
        hasMore = hasNext || (!reachedCount && pageResults.length > 0);
      }

      return { count: results.length, next: null, previous: null, results };
    } catch {
      return empty;
    }
  };

  // Fetch clients
  useEffect(() => { fetchPage<ApiClient>(`clients/?page=${clientsPage}`, d => setClientsData(d), setClientsLoading); }, [clientsPage]);
  // Fetch services
  useEffect(() => { fetchPage<ApiService>(`services/?page=${servicesPage}`, d => setServicesData(d), setServicesLoading); }, [servicesPage]);
  // Fetch medicines
  useEffect(() => { fetchPage<ApiMedicine>(`medicines/?page=${medicinesPage}`, d => setMedicinesData(d), setMedicinesLoading); }, [medicinesPage]);
  // Fetch doctor medical cards (requires doctor id)
  useEffect(() => { if (me?.id) fetchPage<ApiMedicalCard>(`medical-cards/by-doctor/${me.id}/?page=${historyPage}`, d => setDoctorCardsData(d), setHistoryLoading); }, [historyPage, me?.id]);
  // Fetch rooms
  useEffect(() => { fetchPage<ApiRoom>(`stationary-rooms/?page=${roomsPage}`, d => setRoomsData(d), setRoomsLoading); }, [roomsPage]);

  // Fetch counts & daily salary once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [servicesResp, medicinesResp, feedsResp, doctorResp] = await Promise.all([
          api.get("services/").then(r => r.data).catch(() => null),
          api.get("medicines/").then(r => r.data).catch(() => null),
          api.get("pet-feeds/").then(r => r.data).catch(() => null),
          me?.id ? api.get(`doctors/${me.id}/`).then(r => r.data).catch(() => null) : Promise.resolve(null),
        ]);
        const extractCount = (obj: any) => (obj && typeof obj.count === 'number') ? obj.count : (Array.isArray(obj) ? obj.length : 0);
        const doctorDailySalaryRaw = doctorResp?.daily_salary ?? 0;
        const doctorDailySalary = typeof doctorDailySalaryRaw === 'string' ? parseFloat(doctorDailySalaryRaw) : (doctorDailySalaryRaw || 0);
        if (!cancelled) {
          setCounts({
            services: extractCount(servicesResp),
            medicines: extractCount(medicinesResp),
            feeds: extractCount(feedsResp),
            doctorDailySalary,
            loading: false,
          });
          if (doctorResp && typeof doctorResp.id === 'number') setDoctorId(doctorResp.id);
        }
      } catch (e) {
        if (!cancelled) setCounts(c => ({ ...c, loading: false }));
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [me?.id]);

  // Load salary history for selected period
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!doctorId) return;
      setSalaryLoading(true);
      setSalaryError(null);
      try {
        const data = salaryPeriod === 'weekly'
          ? await SalaryHistory.weekly<any>(doctorId)
          : await SalaryHistory.monthly<any>(doctorId);
        const items = Array.isArray((data as any)?.events) ? (data as any).events : ([] as any[]);
        const totalRaw = (data as any)?.total_amount ?? 0;
        const total = typeof totalRaw === 'string' ? parseFloat(totalRaw) : (typeof totalRaw === 'number' ? totalRaw : 0);
        if (!cancelled) { setSalaryEvents(items); setSalaryTotal(Number.isFinite(total) ? total : 0); }
      } catch (e: any) {
        if (!cancelled) setSalaryError(e?.message || 'Error');
      } finally {
        if (!cancelled) setSalaryLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [salaryPeriod, doctorId]);

  // Manual refresh all dashboard data without full page reload
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      // 1) Invalidate user cache
      try { await qc.invalidateQueries({ queryKey: ["me"] }); } catch {}

      // 2) Refresh counts and doctor id
      try {
        const [servicesResp, medicinesResp, feedsResp, doctorResp] = await Promise.all([
          api.get("services/").then(r => r.data).catch(() => null),
          api.get("medicines/").then(r => r.data).catch(() => null),
          api.get("pet-feeds/").then(r => r.data).catch(() => null),
          me?.id ? api.get(`doctors/${me.id}/`).then(r => r.data).catch(() => null) : Promise.resolve(null),
        ]);
        const extractCount = (obj: any) => (obj && typeof obj.count === 'number') ? obj.count : (Array.isArray(obj) ? obj.length : 0);
        const doctorDailySalaryRaw = doctorResp?.daily_salary ?? 0;
        const doctorDailySalary = typeof doctorDailySalaryRaw === 'string' ? parseFloat(doctorDailySalaryRaw) : (doctorDailySalaryRaw || 0);
        setCounts({
          services: extractCount(servicesResp),
          medicines: extractCount(medicinesResp),
          feeds: extractCount(feedsResp),
          doctorDailySalary,
          loading: false,
        });
        if (doctorResp && typeof doctorResp.id === 'number') setDoctorId(doctorResp.id);
      } catch {}

      // 3) Refresh paginated lists with current pages
      const pageFetches: Promise<any>[] = [
        fetchPage<ApiClient>(`clients/?page=${clientsPage}`, d => setClientsData(d), setClientsLoading),
        fetchPage<ApiService>(`services/?page=${servicesPage}`, d => setServicesData(d), setServicesLoading),
        fetchPage<ApiMedicine>(`medicines/?page=${medicinesPage}`, d => setMedicinesData(d), setMedicinesLoading),
        fetchPage<ApiRoom>(`stationary-rooms/?page=${roomsPage}`, d => setRoomsData(d), setRoomsLoading),
      ];
      if (me?.id) pageFetches.push(fetchPage<ApiMedicalCard>(`medical-cards/by-doctor/${me.id}/?page=${historyPage}`, d => setDoctorCardsData(d), setHistoryLoading));
      await Promise.allSettled(pageFetches);

      // 4) Refresh salary panel
      if (doctorId) {
        setSalaryLoading(true);
        setSalaryError(null);
        try {
          const data = salaryPeriod === 'weekly'
            ? await SalaryHistory.weekly<any>(doctorId)
            : await SalaryHistory.monthly<any>(doctorId);
          const items = Array.isArray((data as any)?.events) ? (data as any).events : ([] as any[]);
          const totalRaw = (data as any)?.total_amount ?? 0;
          const total = typeof totalRaw === 'string' ? parseFloat(totalRaw) : (typeof totalRaw === 'number' ? totalRaw : 0);
          setSalaryEvents(items); setSalaryTotal(Number.isFinite(total) ? total : 0);
        } catch (e: any) {
          setSalaryError(e?.message || 'Error');
        } finally {
          setSalaryLoading(false);
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Resolve Doctor model id robustly for current user
  // The doctor ID for creating medical cards is the user's ID when they have the DOCTOR role
  useEffect(() => {
    let cancelled = false;
    const resolveDoctorId = async () => {
      if (!me?.id || doctorId) return;
      
      // If user has DOCTOR role, their user ID is used as the doctor ID for medical cards
      if (me.role === 'DOCTOR') {
        setDoctorId(me.id);
        return;
      }
      
      setDoctorIdLoading(true);
      const trySet = (data: any) => {
        const id = typeof data?.id === 'number' ? data.id : (typeof data?.doctor?.id === 'number' ? data.doctor.id : null);
        if (id && !cancelled) setDoctorId(id);
        return id;
      };
      try {
        let id = null;
        // Try to get doctor profile by user ID
        try { id = trySet((await api.get(`doctors/${me.id}/`)).data); } catch {}
        if (!id && !cancelled) {
          toast({ title: t('doctor.profile.notFoundTitle'), description: t('doctor.profile.notFoundDescription'), variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setDoctorIdLoading(false);
      }
    };
    resolveDoctorId();
    return () => { cancelled = true; };
  }, [me?.id, doctorId]);

  useEffect(() => {
    if (!scheduleDialogOpen || !scheduleForCardId) return;
    let cancelled = false;
    const cardId = scheduleForCardId;
    const fetchSchedule = async () => {
      setScheduleLoading(true);
      setScheduleError(null);
      // Load nurses and services for task assignment
      setNursesLoading(true); setScheduleServicesLoading(true);
      setNursesError(null); setScheduleServicesError(null);
      Promise.all([
        api.get('nurses/').then(r => r.data).catch((e) => { setNursesError(e?.message || t('doctor.schedule.nursesLoadError')); return null; }),
        api.get('services/').then(r => r.data).catch((e) => { setScheduleServicesError(e?.message || t('doctor.schedule.servicesLoadError')); return null; }),
      ]).then(([ns, ss]) => {
        const nursesArr = Array.isArray(ns) ? ns : (Array.isArray(ns?.results) ? ns.results : []);
        const servicesArr = Array.isArray(ss) ? ss : (Array.isArray(ss?.results) ? ss.results : []);
        if (!cancelled) { setNurses(nursesArr); setScheduleServices(servicesArr); }
      }).finally(() => { if (!cancelled) { setNursesLoading(false); setScheduleServicesLoading(false); } });
      try {
        const { data } = await api.get(`schedules/?medical_card=${cardId}`);
        const list = Array.isArray((data as any)?.results) ? (data as any).results : (Array.isArray(data) ? data : []);
        const schedule = list[0];
        if (schedule && !cancelled) {
          const scheduleIdentifier = typeof schedule.id === "number" ? schedule.id : Number(schedule.id);
          setScheduleId(Number.isFinite(scheduleIdentifier) ? scheduleIdentifier : null);
          setScheduleDateTime(toDateTimeLocalValue(schedule.date));
          try {
            if (scheduleIdentifier) {
              const { data: tasksResp } = await api.get(`tasks/?schedule=${scheduleIdentifier}`);
              const taskList = Array.isArray((tasksResp as any)?.results)
                ? (tasksResp as any).results
                : (Array.isArray(tasksResp) ? tasksResp : []);
              if (!cancelled) {
                setScheduleTasks(taskList.map((task: any) => {
                  const parts = splitIsoToLocalParts(task.due_date);
                  return {
                    id: `persisted-${task.id}`,
                    backendId: task.id,
                    performer: task.title || "",
                    date: parts.date,
                    time: parts.time,
                    description: task.description || "",
                    persisted: true,
                  } as ScheduleTask;
                }));
              }
            }
          } catch (taskError: any) {
            if (!cancelled) {
              setScheduleError(taskError?.message || t('doctor.schedule.tasksError'));
            }
          }
        } else if (!cancelled) {
          setScheduleId(null);
          setScheduleTasks([]);
          // keep scheduleDateTime if doctor already filled it manually
        }
      } catch (e: any) {
        if (!cancelled) {
          setScheduleError(e?.message || t('doctor.schedule.loadError'));
        }
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    };
    fetchSchedule();
    return () => { cancelled = true; };
  }, [scheduleDialogOpen, scheduleForCardId, t]);

  useEffect(() => {
    if (scheduleDialogOpen) return;
    setScheduleLoading(false);
    setScheduleSaving(false);
    setScheduleError(null);
    setScheduleForCardId(null);
    setScheduleId(null);
    setScheduleDateTime("");
    setScheduleTasks([]);
  }, [scheduleDialogOpen]);

  useEffect(() => {
    if (freeRoomsDialogOpen) return;
    setFreeRoomsData([]);
    setFreeRoomsError(null);
  }, [freeRoomsDialogOpen]);

  useEffect(() => {
    if (!freeRoomsDialogOpen && !editFreeRoomsDialogOpen) return;
    let cancelled = false;
    setFreeRoomsLoading(true);
    setFreeRoomsError(null);
    api.get('stationary-rooms/free/').then(({ data }) => {
      if (cancelled) return;
      const rooms = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];
      setFreeRoomsData(rooms);
    }).catch((e: any) => {
  if (!cancelled) setFreeRoomsError(e?.message || t('doctor.freeRooms.loadError'));
    }).finally(() => {
      if (!cancelled) setFreeRoomsLoading(false);
    });
    return () => { cancelled = true; };
  }, [freeRoomsDialogOpen, editFreeRoomsDialogOpen, t]);

  const handleLogout = async () => {
    tokenStore.clear();
    toast({
      title: t("dashboard.logout"),
      description: t('doctor.logout.goodbye'),
    });
    navigate("/");
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

  // Doctor banner image change (PATCH me/ with multipart)
  const handleDoctorBannerImageChange = async (file?: File | null) => {
    if (!file) return;
    setBannerUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.patch(`me/`, form, { headers: { "Content-Type": "multipart/form-data" } });
      // Optimistically update cache
      qc.setQueryData(["me"], (prev: any) => ({ ...(prev || {}), image: data?.image ?? prev?.image ?? null }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: t('doctor.banner.updated') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error?.message, variant: "destructive" });
    } finally {
      setBannerUploading(false);
    }
  };

  // Render main dashboard view with metrics
  const renderMainView = () => (
    <>
      {/* Hero Welcome Card (matches client style with inline image change) */}
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
                {/* Inline image change button */}
                <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDoctorBannerImageChange(e.target.files?.[0])} />
                  <span className="inline-flex items-center gap-2 text-xs font-medium bg-white/90 text-black px-3 py-1 rounded-full shadow">
                    <ImageIcon className="w-4 h-4" /> {bannerUploading ? t('doctor.banner.loading') : t('doctor.banner.edit')}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {t("dashboard.welcome")}, {me?.first_name ? `${me.first_name}` : t('doctor.hero.fallbackRole')}! 👨‍⚕️
              </h2>
              <p className="text-primary-foreground/90 text-lg">{t('doctor.hero.subtitle')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Dynamic Inventory + Daily Salary Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Package className="w-4 h-4" /> {t('doctor.stats.services.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{counts.loading ? "…" : counts.services}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('doctor.stats.services.subtitle')}</p>
          </CardContent>
        </Card>
        <Card className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-purple-500/5 to-purple-500/10" style={{ animationDelay: "60ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Pill className="w-4 h-4" /> {t('doctor.stats.medicines.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{counts.loading ? "…" : counts.medicines}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('doctor.stats.medicines.subtitle')}</p>
          </CardContent>
        </Card>
        <Card className="border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-orange-500/5 to-orange-500/10" style={{ animationDelay: "120ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Heart className="w-4 h-4" /> {t('doctor.stats.feeds.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{counts.loading ? "…" : counts.feeds}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('doctor.stats.feeds.subtitle')}</p>
          </CardContent>
        </Card>
        <Card
          className="md:col-span-1 lg:col-span-1 xl:col-span-1 border-2 hover:shadow-glow transition-all animate-fade-in bg-gradient-to-br from-green-500/5 to-green-500/10 cursor-pointer"
          style={{ animationDelay: "180ms" }}
          role="button"
          tabIndex={0}
          onClick={() => handleNavigate("salary")}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigate("salary"); }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Stethoscope className="w-4 h-4" /> {t('doctor.salary.today')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{counts.loading ? "…" : formatSalary(counts.doctorDailySalary)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('doctor.salary.total')}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  // Render salary view
  const renderSalaryView = () => (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-2 hover:shadow-glow transition-all">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="w-4 h-4" /> {salaryPeriod === 'weekly' ? t('doctor.salary.weekly') : t('doctor.salary.monthly')}
          </CardTitle>
          <Select value={salaryPeriod} onValueChange={(v) => setSalaryPeriod(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('doctor.salary.dropdown.weekly')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t('doctor.salary.dropdown.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('doctor.salary.dropdown.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {salaryLoading ? (
            <div className="text-sm text-muted-foreground">{t('doctor.salary.loading')}</div>
          ) : salaryError ? (
            <div className="text-sm text-destructive">{t('doctor.salary.error')}: {salaryError}</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <div className="text-2xl font-bold">{formatSalary(salaryTotal)}</div>
                <div className="text-xs text-muted-foreground">{t('doctor.salary.total')}</div>
              </div>
              {salaryDailyTotals.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('doctor.salary.empty')}</div>
              ) : (
                <div className="space-y-2">
                  {salaryDailyTotals.map(({ key, date, total }) => (
                    <div key={key} className="flex items-center justify-between text-sm border rounded-lg p-2">
                      <div className="text-muted-foreground">{formatDayLabel(date)}</div>
                      <div className="font-medium">{formatSalary(total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case "salary":
        return renderSalaryView();
      case "clients":
        return renderClientsView();
      case "services":
        return renderServicesView();
      case "medicines":
        return renderMedicinesView();
      case "history":
        return renderHistoryView();
      case "rooms":
        return renderRoomsView();
      case "main":
      default:
        return renderMainView();
    }
  };

  // Render clients view
  const renderClientsView = () => (
    <div className="space-y-4 animate-fade-in">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle>{t('doctor.clients.title')}</CardTitle>
                <CardDescription>{t('doctor.clients.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={t('doctor.clients.searchPlaceholder')}
                  value={searchClients}
                  onChange={(e) => setSearchClients(e.target.value)}
                />
                <div className="space-y-2 max-h-[420px] overflow-auto">
                  {clientsLoading && <div className="text-sm text-muted-foreground">{t('doctor.clients.loading')}</div>}
                  {!clientsLoading && clientsData && clientsData.results
                    .filter(c => {
                      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
                      return name.toLowerCase().includes(searchClients.toLowerCase()) || (c.phone_number?.includes(searchClients));
                    })
                    .map(c => {
                      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || `ID ${c.id}`;
                      const client: Client = { id: String(c.id), name, phone: c.phone_number };
                      return (
                        <div key={c.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/40">
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{c.phone_number || "—"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openClientProfile(client)}>
                              {t('doctor.clients.profileButton')}
                            </Button>
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  {!clientsLoading && clientsData && clientsData.results.filter(c => {
                    const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
                    return name.toLowerCase().includes(searchClients.toLowerCase()) || (c.phone_number?.includes(searchClients));
                  }).length === 0 && (
                    <div className="text-sm text-muted-foreground">{t('doctor.clients.nothing')}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">{t('doctor.clients.total', { count: clientsData?.count ?? 0 })}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={clientsPage === 1 || clientsLoading} onClick={() => setClientsPage(p => Math.max(1, p - 1))}>{t('common.prev')}</Button>
                    <Button variant="outline" size="sm" disabled={!clientsData?.next || clientsLoading} onClick={() => setClientsPage(p => p + 1)}>{t('common.next')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client profile modal */}
            <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t('doctor.clientProfile.title')}</DialogTitle>
                  <DialogDescription>
                    {t('doctor.clientProfile.subtitle')}
                  </DialogDescription>
                </DialogHeader>

                {selectedClient && (
                  <div className="space-y-6">
                    {/* Client summary (dynamic) */}
                    <Card className="border">
                      <CardHeader className="pb-4">
                        <div className="flex flex-col gap-4">
                          <div>
                            <CardTitle className="text-lg mb-2">{clientDetailLoading ? t('common.loading') : (clientDetail ? `${clientDetail.first_name || ''} ${clientDetail.last_name || ''}`.trim() || selectedClient.name : selectedClient.name)}</CardTitle>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{t('doctor.clientProfile.phone')}</span>
                                <span>{clientDetail?.phone_number || selectedClient.phone || '—'}</span>
                              </div>
                              {clientDetail?.address && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium">{t('doctor.clientProfile.address')}</span>
                                  <span>{clientDetail.address}</span>
                                </div>
                              )}
                              {clientDetail?.description && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium">{t('doctor.clientProfile.description')}</span>
                                  <span>{clientDetail.description}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={closeClientProfile}>{t('doctor.clientProfile.close')}</Button>
                            <Button className="bg-gradient-hero" onClick={() => setCreateCardDialogOpen(true)}>
                              {t('doctor.clientProfile.createCard')}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Client medical cards list (dynamic) */}
                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle>{t('doctor.clientCards.title')}</CardTitle>
                        <CardDescription>{t('doctor.clientCards.subtitle')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {clientMedicalCardsLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                          {!clientMedicalCardsLoading && clientMedicalCardsError && <div className="text-sm text-destructive">{clientMedicalCardsError}</div>}
                          {!clientMedicalCardsLoading && !clientMedicalCardsError && clientMedicalCards.map(card => {
                            const status = card.status || '';
                            const isOpen = status === 'OPEN';
                            const isWaiting = status === 'WAITING_FOR_PAYMENT' || status === 'WAITING' || status === 'PENDING_PAYMENT';
                            const isClosed = status === 'CLOSED';
                            const petLabel = typeof card.pet === 'number' ? t('doctor.pet.fallback', { id: card.pet }) : (card.pet || `ID ${card.id}`);
                            const diag = card.diagnosis || '—';
                            const dateStr = card.created_at ? new Date(card.created_at).toLocaleDateString(i18n.language ? i18n.language : undefined) : '—';
                            return (
                              <div key={card.id} className="p-4 border rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold">{petLabel}</div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${isOpen ? 'text-orange-600 border-orange-200 bg-orange-50' : isWaiting ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-green-600 border-green-200 bg-green-50'}`}>{isOpen ? t('doctor.clientCards.status.open') : isWaiting ? t('doctor.clientCards.status.waiting') : t('doctor.clientCards.status.closed')}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">{dateStr}</div>
                                <div className="text-sm text-muted-foreground truncate" title={diag}>{diag}</div>
                                {isWaiting && (
                                  <div className="mt-3 flex justify-end">
                                    <Button size="sm" variant="outline" onClick={() => openEditCard(Number(card.id))}>{t('doctor.clientCards.edit')}</Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {!clientMedicalCardsLoading && !clientMedicalCardsError && clientMedicalCards.length === 0 && (
                            <div className="text-sm text-muted-foreground">{t('doctor.clientCards.empty', { defaultValue: '—' })}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Create Medical Card Modal */}
            <Dialog open={createCardDialogOpen} onOpenChange={setCreateCardDialogOpen}>
              <DialogContent className="w-full max-w-[96vw] max-h-[92vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t('doctor.newCard.title')}</DialogTitle>
                  <DialogDescription>
                    {t('doctor.newCard.subtitle')}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Left column: Pet and clinical info */}
                  <Card className="lg:col-span-2 border-2">
                    <CardHeader>
                      <CardTitle>{t('doctor.sections.petAndExam')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                      {/* Pet selector */}
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('doctor.pet.selectLabel')}</Label>
                        <div className="grid md:grid-cols-[1fr,auto] gap-3 items-center">
                          <Select value={selectedPetId ? String(selectedPetId) : undefined} onValueChange={(v) => setSelectedPetId(Number(v))}>
                            <SelectTrigger>
                              <SelectValue placeholder={petsLoading ? t('doctor.pet.loading') : t('doctor.pet.selectPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {petsList.map(p => {
                                const label = `${p.pet_name || p.name || t('doctor.pet.fallback', { id: p.id })}${p.species ? ' • ' + p.species : ''}${p.breed ? ' • ' + p.breed : ''}`;
                                return <SelectItem key={p.id} value={String(p.id)}>{label}</SelectItem>;
                              })}
                              {(!petsLoading && petsList.length === 0) && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">{t('doctor.pet.none')}</div>
                              )}
                            </SelectContent>
                          </Select>
                          {petsError && <div className="text-xs text-destructive">{petsError}</div>}
                        </div>
                        {/* Toggle create pet form */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {petsList.length === 0 && !showPetCreateForm && (
                            <Button variant="outline" size="sm" onClick={() => setShowPetCreateForm(true)}>{t('doctor.pet.create')}</Button>
                          )}
                          {petsList.length > 0 && !showPetCreateForm && (
                            <Button variant="ghost" size="sm" onClick={() => setShowPetCreateForm(true)}>{t('doctor.pet.addNew')}</Button>
                          )}
                        </div>
                        {showPetCreateForm && (
                          <Card className="mt-3 border-2">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">{t('doctor.pet.form.title')}</CardTitle>
                              <CardDescription>{t('doctor.pet.createHelp')}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor="newPetName">{t('doctor.pet.name')}</Label>
                                <Input id="newPetName" value={newPetName} onChange={e => setNewPetName(e.target.value)} placeholder={t('doctor.pet.namePlaceholder')} />
                              </div>
                              <div className="space-y-1">
                                <Label>{t('doctor.pet.species')}</Label>
                                <Select value={newPetSpecies ?? undefined} onValueChange={setNewPetSpecies}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('doctor.pet.speciesPlaceholder')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dog">{t('doctor.pet.species.dog')}</SelectItem>
                                    <SelectItem value="cat">{t('doctor.pet.species.cat')}</SelectItem>
                                    <SelectItem value="bird">{t('doctor.pet.species.bird')}</SelectItem>
                                    <SelectItem value="reptile">{t('doctor.pet.species.reptile')}</SelectItem>
                                    <SelectItem value="other">{t('doctor.pet.species.other')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>{t('doctor.pet.gender')}</Label>
                                <Select value={newPetGender ?? undefined} onValueChange={setNewPetGender}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('doctor.pet.genderPlaceholder')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="male">{t('doctor.pet.gender.male')}</SelectItem>
                                    <SelectItem value="female">{t('doctor.pet.gender.female')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="newPetBreed">{t('doctor.pet.breed')}</Label>
                                <Input id="newPetBreed" value={newPetBreed} onChange={e => setNewPetBreed(e.target.value)} placeholder={t('doctor.pet.breedPlaceholder')} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="newPetBirth">{t('doctor.pet.birthDate')}</Label>
                                <Input id="newPetBirth" type="date" max={todayStr} value={newPetBirthDate} onChange={e => setNewPetBirthDate(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="newPetColor">{t('doctor.pet.color')}</Label>
                                <Input id="newPetColor" value={newPetColor} onChange={e => setNewPetColor(e.target.value)} placeholder={t('doctor.pet.colorPlaceholder')} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="newPetWeight">{t('doctor.pet.weight')}</Label>
                                <Input id="newPetWeight" type="number" step="0.1" value={newPetWeight} onChange={e => setNewPetWeight(e.target.value)} placeholder={t('doctor.pet.weightPlaceholder')} />
                              </div>
                              <div className="space-y-1 md:col-span-3">
                                <Label htmlFor="newPetDescription">{t('doctor.pet.description')}</Label>
                                <Textarea id="newPetDescription" value={newPetDescription} onChange={e => setNewPetDescription(e.target.value)} placeholder={t('doctor.pet.descriptionPlaceholder')} />
                              </div>
                              {petCreateError && <div className="md:col-span-3 text-xs text-destructive">{petCreateError}</div>}
                              <div className="md:col-span-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setShowPetCreateForm(false); setPetCreateError(null); }}>{t('common.cancel')}</Button>
                                <Button size="sm" className="bg-gradient-hero" disabled={petCreateLoading} onClick={handleCreatePet}>{petCreateLoading ? t('common.saving') : t('doctor.pet.create')}</Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Assigned Nurse selector (required) */}
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('doctor.create.assignedNurseLabel')} *</Label>
                        <Select value={assignedNurseId ? String(assignedNurseId) : undefined} onValueChange={(v) => setAssignedNurseId(Number(v))}>
                          <SelectTrigger className={`${!assignedNurseId ? 'border-destructive focus-visible:ring-destructive' : ''}`}>
                            <SelectValue placeholder={formNursesLoading ? t('common.loading') : t('doctor.create.assignedNursePlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {formNurses.map(n => {
                              const name = (n.first_name || '') + (n.last_name ? (' ' + n.last_name) : '') || n.name || `ID ${n.id}`;
                              return <SelectItem key={n.id} value={String(n.id)}>{name.trim() || `ID ${n.id}`}</SelectItem>;
                            })}
                            {!formNursesLoading && formNurses.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">{t('doctor.create.noNurses')}</div>
                            )}
                          </SelectContent>
                        </Select>
                        {formNursesError && <div className="text-xs text-destructive">{formNursesError}</div>}
                        {!assignedNurseId && <p className="text-xs text-destructive">Required</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight">{t('doctor.vitals.weight')}</Label>
                        <Input id="weight" type="number" required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t('doctor.vitals.weightPlaceholder')} className={`${!String(weight||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(weight||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temperature">{t('doctor.vitals.temperature')}</Label>
                        <Input 
                          id="temperature" 
                          type="text" 
                          inputMode="decimal"
                          required 
                          value={temperature} 
                          onChange={(e) => {
                            let val = e.target.value;
                            // Remove non-numeric except dot
                            val = val.replace(/[^0-9.]/g, '');
                            // Prevent multiple dots
                            const dotCount = (val.match(/\./g) || []).length;
                            if (dotCount > 1) {
                              val = val.slice(0, val.lastIndexOf('.'));
                            }
                            // Auto-insert dot after 2 digits if no dot yet
                            if (/^\d{2}$/.test(val) && !val.includes('.')) {
                              val = val + '.';
                            }
                            // Limit to format like 38.5 or 39.12
                            if (/^\d{0,2}(\.\d{0,2})?$/.test(val) || val === '') {
                              setTemperature(val);
                            }
                          }} 
                          placeholder={t('doctor.vitals.temperaturePlaceholder')} 
                          className={`${!String(temperature||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} 
                        />
                        {!String(temperature||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bloodp">{t('doctor.vitals.bloodPressure')}</Label>
                        <Input 
                          id="bloodp" 
                          type="text" 
                          inputMode="numeric"
                          required 
                          value={bloodPressure} 
                          onChange={(e) => {
                            let val = e.target.value;
                            // Allow only digits, spaces, and slash
                            val = val.replace(/[^0-9\s/]/g, '');
                            // Normalize multiple slashes to one
                            val = val.replace(/\/+/g, ' / ');
                            // Normalize multiple spaces
                            val = val.replace(/\s+/g, ' ');
                            setBloodPressure(val);
                          }}
                          onKeyDown={(e) => {
                            // On ArrowRight, auto-insert " / " if we have digits and no slash yet
                            if (e.key === 'ArrowRight') {
                              const val = bloodPressure.trim();
                              // If value is 2-3 digits only (no slash yet)
                              if (/^\d{2,3}$/.test(val)) {
                                e.preventDefault();
                                setBloodPressure(val + ' / ');
                              }
                            }
                          }}
                          placeholder={t('doctor.vitals.bloodPressurePlaceholder')} 
                          className={`${!String(bloodPressure||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} 
                        />
                        {!String(bloodPressure||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heartrate">{t('doctor.vitals.heartRate')}</Label>
                        <Input id="heartrate" type="number" required value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder={t('doctor.vitals.heartRatePlaceholder')} className={`${!String(heartRate||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(heartRate||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resprate">{t('doctor.vitals.respiratoryRate')}</Label>
                        <Input id="resprate" type="number" required value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder={t('doctor.vitals.respiratoryRatePlaceholder')} className={`${!String(respiratoryRate||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(respiratoryRate||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mucous">{t('doctor.vitals.mucous')}</Label>
                        <Input id="mucous" required value={mucousMembrane} onChange={(e) => setMucousMembrane(e.target.value)} placeholder={t('doctor.vitals.mucousPlaceholder')} className={`${!String(mucousMembrane||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(mucousMembrane||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="chest">{t('doctor.vitals.chest')}</Label>
                        <Input id="chest" required value={chestCondition} onChange={(e) => setChestCondition(e.target.value)} placeholder={t('doctor.vitals.chestPlaceholder')} className={`${!String(chestCondition||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(chestCondition||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="symptoms">{t('doctor.vitals.symptoms')}</Label>
                        <Textarea id="symptoms" required value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder={t('doctor.vitals.symptomsPlaceholder')} className={`${!String(symptoms||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(symptoms||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="diagnosis">{t('doctor.vitals.diagnosis')}</Label>
                        <Textarea id="diagnosis" required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder={t('doctor.vitals.diagnosisPlaceholder')} className={`${!String(diagnosis||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(diagnosis||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="analyses">{t('doctor.vitals.analyses')}</Label>
                        <Textarea id="analyses" required value={analyses} onChange={(e) => setAnalyses(e.target.value)} placeholder={t('doctor.vitals.analysesPlaceholder')} className={`${!String(analyses||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(analyses||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notes">{t('doctor.vitals.notes')}</Label>
                        <Textarea id="notes" required value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('doctor.vitals.notesPlaceholder')} className={`${!String(notes||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                        {!String(notes||'').trim() && <p className="text-xs text-destructive">Required</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="revisit">{t('doctor.revisitDate')}</Label>
                        <Input id="revisit" type="date" min={todayStr} value={revisitDate} onChange={(e) => setRevisitDate(e.target.value)} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="recommended_feed">Рекомендованный корм</Label>
                        <Textarea
                          id="recommended_feed"
                          value={recommendedFeedText}
                          onChange={(e) => setRecommendedFeedText(e.target.value)}
                          placeholder={t("doctor.feed.recommendationPlaceholder")}
                        />
                      </div>

                      {/* Attachments upload area (X-rays & prescriptions) */}
                      <div className="md:col-span-2 mt-4">
                        <div
                          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 p-[1px] shadow-lg shadow-sky-500/20"
                        >
                          <div
                            className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-white/30 bg-slate-950/70 px-8 py-8 text-center transition-colors duration-200 hover:bg-slate-950/90 cursor-pointer"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const files = Array.from(e.dataTransfer.files || []);
                              if (!files.length) return;
                              setNewCardAttachments(prev => ([
                                ...prev,
                                ...files.map(file => {
                                  const lower = file.name.toLowerCase();
                                  let type: "XRAY" | "PRESCRIPTION" | "OTHER" = "OTHER";
                                  if (lower.endsWith('.pdf')) {
                                    type = "PRESCRIPTION";
                                  } else if (/\.(jpg|jpeg|png|gif|bmp|tiff|tif|dcm)$/.test(lower)) {
                                    type = "XRAY";
                                  }
                                  return { file, type };
                                }),
                              ]));
                            }}
                            >
                            <label className="flex flex-col items-center gap-3">
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300 ring-2 ring-sky-400/60 ring-offset-2 ring-offset-slate-950 shadow-inner animate-pulse">
                                <span className="text-4xl leading-none">+</span>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*,.pdf,.dcm,.dicom"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (!files.length) return;
                                  setNewCardAttachments(prev => ([
                                    ...prev,
                                    ...files.map(file => {
                                      const lower = file.name.toLowerCase();
                                      let type: "XRAY" | "PRESCRIPTION" | "OTHER" = "OTHER";
                                      if (lower.endsWith('.pdf')) {
                                        type = "PRESCRIPTION";
                                      } else if (/\.(jpg|jpeg|png|gif|bmp|tiff|tif|dcm)$/.test(lower)) {
                                        type = "XRAY";
                                      }
                                      return { file, type };
                                    }),
                                  ]));
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {newCardAttachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md bg-slate-900/70 p-2 text-xs">
                              {newCardAttachments.map((att, idx) => (
                                <div key={`${att.file.name}-${idx}`} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                                      {att.type === 'XRAY' ? 'X' : att.type === 'PRESCRIPTION' ? 'Rx' : 'F'}
                                    </span>
                                    <span className="max-w-[150px] truncate" title={att.file.name}>{att.file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={att.type}
                                      onValueChange={(v) => setNewCardAttachments(prev => prev.map((x, i) => i === idx ? { ...x, type: v as any } : x))}
                                    >
                                      <SelectTrigger className="h-7 w-[110px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="XRAY">XRAY</SelectItem>
                                        <SelectItem value="PRESCRIPTION">PRESCRIPTION</SelectItem>
                                        <SelectItem value="OTHER">OTHER</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-xs"
                                      onClick={() => setNewCardAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right column: Services, Medicines, Stationary */}
                  <div className="space-y-6">
                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle>{t('doctor.services.title')}</CardTitle>
                        <CardDescription>{t('doctor.services.subtitle')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input placeholder={t('doctor.search.servicePlaceholder')} value={formSearchService} onChange={e => setFormSearchService(e.target.value)} />
                        {formServicesLoading ? (
                          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-auto">
                            {formServices?.results
                              .filter(s => (s.service_name || s.name || '').toLowerCase().includes(formSearchService.toLowerCase()))
                              .map(s => {
                                const name = s.service_name || s.name || `ID ${s.id}`;
                                const price = typeof s.price === 'string' ? parseFloat(s.price) : (s.price || 0);
                                const selection = selectedServices[s.id];
                                return (
                                  <div key={s.id} className="p-3 border rounded-lg hover:bg-muted/40 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="font-medium">{name}</div>
                                        <div className="text-xs text-muted-foreground">{t('doctor.price', { price: price.toLocaleString() })}</div>
                                      </div>
                                      <input type="checkbox" checked={Boolean(selection)} onChange={e => toggleServiceSelect(s.id, e.target.checked)} />
                                    </div>
                                    {selection && (
                                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                        <Input className="w-full sm:w-24" type="number" min={1} value={selection.quantity}
                                          onChange={e => setServiceQty(s.id, Number(e.target.value))} placeholder={t('doctor.qtyPlaceholder')} />
                                        <Input className="w-full sm:flex-1" value={selection.description}
                                          onChange={e => setServiceDescription(s.id, e.target.value)} placeholder={t('doctor.serviceDescPlaceholder')} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            {formServices && formServices.results.filter(s => (s.service_name || s.name || '').toLowerCase().includes(formSearchService.toLowerCase())).length === 0 && (
                              <div className="text-sm text-muted-foreground">{t('common.nothingFound')}</div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle>{t('doctor.medicines.title')}</CardTitle>
                        <CardDescription>{t('doctor.medicines.subtitle')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input placeholder={t('doctor.search.medicinePlaceholder')} value={formSearchMedicine} onChange={e => setFormSearchMedicine(e.target.value)} />
                        {formMedicinesLoading ? (
                          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-auto">
                            {formMedicines?.results
                              .filter(m => (m.medicine_name || m.name || '').toLowerCase().includes(formSearchMedicine.toLowerCase()))
                              .map(m => {
                                const name = m.medicine_name || m.name || `ID ${m.id}`;
                                const stock = m.stock ?? m.quantity ?? undefined;
                                const selection = selectedMedicines[m.id];
                                return (
                                  <div key={m.id} className="p-3 border rounded-lg hover:bg-muted/40 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="font-medium">{name}</div>
                                        <div className="text-xs text-muted-foreground">{stock != null ? t('doctor.inStock', { stock }) : ' '}</div>
                                      </div>
                                      <input type="checkbox" checked={Boolean(selection)} onChange={e => toggleMedicineSelect(m.id, e.target.checked)} />
                                    </div>
                                    {selection && (
                                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                        <Input className="w-full sm:w-24" type="number" min={1} value={selection.quantity}
                                          onChange={e => setMedicineQty(m.id, Number(e.target.value))} placeholder={t('doctor.qtyPlaceholder')} />
                                        <Input className="w-full sm:flex-1" value={selection.dosage}
                                          onChange={e => setMedicineDosage(m.id, e.target.value)} placeholder={t('doctor.dosagePlaceholder')} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            {formMedicines && formMedicines.results.filter(m => (m.medicine_name || m.name || '').toLowerCase().includes(formSearchMedicine.toLowerCase())).length === 0 && (
                              <div className="text-sm text-muted-foreground">{t('common.nothingFound')}</div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Feeds are no longer selected on the medical card. Doctor only writes recommended_feed_text. */}

                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle>{t('doctor.stationary.title')}</CardTitle>
                        <CardDescription>{t('doctor.stationary.subtitle')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={isStationary} onChange={(e) => setIsStationary(e.target.checked)} />
                          <span>{t('doctor.stationary.checkbox')}</span>
                        </label>
                        {isStationary && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>{t('doctor.stationary.room')}</Label>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" type="button" onClick={() => setFreeRoomsDialogOpen(true)}>
                                  {stationaryRoom ? t('doctor.stationary.roomSelected', { room: stationaryRoomLabel || t('doctor.room.fallback', { id: stationaryRoom }) }) : t('doctor.stationary.selectRoom')}
                                </Button>
                                {stationaryRoom && (
                                  <Button variant="ghost" size="sm" type="button" onClick={() => { setStationaryRoom(""); setStationaryRoomLabel(""); }}>
                                    {t('doctor.clear')}
                                  </Button>
                                )}
                              </div>
                              {stationaryRoom && (
                                <div className="text-xs text-muted-foreground">{t('doctor.stationary.roomIdNote', { id: stationaryRoom })}</div>
                              )}
                            </div>
                            {stationaryRoom && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label>{t('doctor.stationary.bookingType', { defaultValue: 'Тип бронирования' })}</Label>
                                  <Select value={bookingType} onValueChange={(val: "DAILY" | "HOURLY") => setBookingType(val)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t('doctor.stationary.bookingTypePlaceholder', { defaultValue: 'Выберите тип' })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="DAILY">{t('doctor.stationary.typeDaily', { defaultValue: 'Daily' })}</SelectItem>
                                      <SelectItem value="HOURLY">{t('doctor.stationary.typeHourly', { defaultValue: 'Hourly' })}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {bookingType === "DAILY" ? (
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label htmlFor="start">{t('doctor.stationary.startDate')}</Label>
                                      <Input id="start" type="date" min={todayStr} value={stationaryStartDate} onChange={(e) => setStationaryStartDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="release">{t('doctor.stationary.endDate')}</Label>
                                      <Input id="release" type="date" min={todayStr} value={stationaryReleaseDate} onChange={(e) => setStationaryReleaseDate(e.target.value)} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label htmlFor="start_dt">{t('doctor.stationary.startDateTime')}</Label>
                                      <Input id="start_dt" type="datetime-local" value={hourlyStartDateTime} onChange={(e) => setHourlyStartDateTime(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="end_dt">{t('doctor.stationary.endDateTime')}</Label>
                                      <Input id="end_dt" type="datetime-local" value={hourlyEndDateTime} onChange={(e) => setHourlyEndDateTime(e.target.value)} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Dialog open={freeRoomsDialogOpen} onOpenChange={setFreeRoomsDialogOpen}>
                      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                          <DialogTitle>{t('doctor.freeRooms.title')}</DialogTitle>
                          <DialogDescription>{t('doctor.freeRooms.subtitle')}</DialogDescription>
                        </DialogHeader>

                        {freeRoomsLoading && <div className="text-sm text-muted-foreground">{t('doctor.freeRooms.loading')}</div>}
                        {freeRoomsError && <div className="text-sm text-destructive">{freeRoomsError}</div>}
                        {!freeRoomsLoading && !freeRoomsError && (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3 max-h-[360px] overflow-auto pr-1">
                              {freeRoomsData.map(room => {
                                const roomLabel = room.room_number || room.description || t('doctor.room.fallback', { id: room.id });
                                return (
                                  <Card key={room.id} className={`border-2 ${String(room.id) === stationaryRoom ? 'border-primary shadow-glow' : ''}`}>
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-base">{roomLabel}</CardTitle>
                                      <CardDescription>{t('doctor.freeRooms.id', { id: room.id })}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      {room.description && <div className="text-sm text-muted-foreground">{room.description}</div>}
                                      {room.price_per_day && <div className="text-xs text-muted-foreground">{t('doctor.freeRooms.pricePerDay', { price: room.price_per_day })}</div>}
                                      <Button variant="outline" size="sm" onClick={() => handleSelectFreeRoom(room)}>{t('doctor.freeRooms.select')}</Button>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                              {freeRoomsData.length === 0 && (
                                <div className="text-sm text-muted-foreground">{t('doctor.freeRooms.empty')}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCreateCardDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button
                    className="bg-gradient-hero"
                    onClick={handleSaveMedicalCard}
                    disabled={
                      !selectedClient ||
                      !selectedPetId ||
                      !String(diagnosis || '').trim() ||
                      !String(weight || '').trim() ||
                      !String(temperature || '').trim() ||
                      !String(bloodPressure || '').trim() ||
                      !String(heartRate || '').trim() ||
                      !String(respiratoryRate || '').trim() ||
                      !String(mucousMembrane || '').trim() ||
                      !String(chestCondition || '').trim() ||
                      !String(symptoms || '').trim() ||
                      !String(analyses || '').trim() ||
                      !String(notes || '').trim()
                    }
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 
              Schedule Builder Modal REMOVED - Doctors no longer create tasks for nurses.
              Nurses now create their own tasks directly from medical cards.
              
            <Dialog open={scheduleDialogOpen} onOpenChange={(open) => {
              if (!open && scheduleSaving) return;
              setScheduleDialogOpen(open);
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t('doctor.schedule.title')}</DialogTitle>
                  <DialogDescription>
                    {t('doctor.schedule.subtitle')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-datetime">{t('doctor.schedule.datetime')}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="schedule-datetime" type="datetime-local" value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)} disabled={scheduleSaving}
                        className="pl-9 focus-visible:ring-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('doctor.schedule.hint')}</p>
                  </div>
                  {scheduleError && <div className="text-sm text-destructive">{scheduleError}</div>}
                  {scheduleLoading && <div className="text-sm text-muted-foreground">{t('doctor.schedule.loading')}</div>}
                </div>

                {!scheduleLoading && <ScheduleTasksEditor />}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={scheduleSaving}>{t('common.cancel')}</Button>
                  <Button className="bg-gradient-hero" onClick={handleSaveSchedule} disabled={scheduleSaving}>
                    {scheduleSaving ? t('common.saving') : t('doctor.schedule.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            */}
    </div>
  );

  // Render services view
  const renderServicesView = () => (
    <div className="space-y-4 animate-fade-in">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle>{t('doctor.servicesList.title')}</CardTitle>
                <CardDescription>{t('doctor.servicesList.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={t('doctor.servicesList.searchPlaceholder')}
                  value={searchServices}
                  onChange={(e) => setSearchServices(e.target.value)}
                />
                <div className="space-y-2 max-h-[420px] overflow-auto">
                  {servicesLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                  {!servicesLoading && servicesData && servicesData.results
                    .filter(s => {
                      const name = (s.service_name || s.name || "").toLowerCase();
                      return name.includes(searchServices.toLowerCase());
                    })
                    .map(s => {
                      const name = s.service_name || s.name || `ID ${s.id}`;
                      const priceRaw = s.price;
                      const price = typeof priceRaw === 'string' ? parseFloat(priceRaw) : (priceRaw || 0);
                      return (
                        <div key={s.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/40">
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{price.toLocaleString()} {t('doctor.currency.som')}</div>
                          </div>
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  {!servicesLoading && servicesData && servicesData.results.filter(s => (s.service_name || s.name || "").toLowerCase().includes(searchServices.toLowerCase())).length === 0 && (
                    <div className="text-sm text-muted-foreground">{t('doctor.servicesList.empty')}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">{t('doctor.servicesList.total', { count: servicesData?.count ?? 0 })}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={servicesPage === 1 || servicesLoading} onClick={() => setServicesPage(p => Math.max(1, p - 1))}>{t('common.prev')}</Button>
                    <Button variant="outline" size="sm" disabled={!servicesData?.next || servicesLoading} onClick={() => setServicesPage(p => p + 1)}>{t('common.next')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
    </div>
  );

  // Render medicines view
  const renderMedicinesView = () => (
    <div className="space-y-4 animate-fade-in">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle>{t('doctor.medicinesList.title')}</CardTitle>
                <CardDescription>{t('doctor.medicinesList.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={t('doctor.medicinesList.searchPlaceholder')}
                  value={searchMedicines}
                  onChange={(e) => setSearchMedicines(e.target.value)}
                />
                <div className="space-y-2 max-h-[420px] overflow-auto">
                  {medicinesLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                  {!medicinesLoading && medicinesData && medicinesData.results
                    .filter(m => {
                      const name = (m.medicine_name || m.name || "").toLowerCase();
                      return name.includes(searchMedicines.toLowerCase());
                    })
                    .map(m => {
                      const name = m.medicine_name || m.name || `ID ${m.id}`;
                      const stock = m.stock ?? m.quantity ?? 0;
                      return (
                        <div key={m.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/40">
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{t('doctor.medicinesList.stockPrefix', { stock })} {m.unit || t('doctor.medicinesList.unitDefault')}</div>
                          </div>
                          <Pill className="w-4 h-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  {!medicinesLoading && medicinesData && medicinesData.results.filter(m => (m.medicine_name || m.name || "").toLowerCase().includes(searchMedicines.toLowerCase())).length === 0 && (
                    <div className="text-sm text-muted-foreground">{t('doctor.medicinesList.empty')}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">{t('doctor.medicinesList.total', { count: medicinesData?.count ?? 0 })}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={medicinesPage === 1 || medicinesLoading} onClick={() => setMedicinesPage(p => Math.max(1, p - 1))}>{t('common.prev')}</Button>
                    <Button variant="outline" size="sm" disabled={!medicinesData?.next || medicinesLoading} onClick={() => setMedicinesPage(p => p + 1)}>{t('common.next')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
    </div>
  );

  // Render history view
  const renderHistoryView = () => (
    <div className="space-y-4 animate-fade-in">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle>{t('doctor.history.title')}</CardTitle>
                <CardDescription>{t('doctor.history.subtitle', { defaultValue: '' })}</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                {!historyLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {doctorCardsData && doctorCardsData.results.map(card => {
                      const status = card.status || "";
                      const isOpen = status === "OPEN";
                      const isWaiting = status === 'WAITING_FOR_PAYMENT' || status === 'WAITING' || status === 'PENDING_PAYMENT';
                      const isClosed = status === 'CLOSED';
                      const petLabel = typeof card.pet === 'number' ? t('doctor.pet.fallback', { id: card.pet }) : (card.pet || `ID ${card.id}`);
                      const diag = card.diagnosis || "—";
                      const dateStr = card.created_at ? new Date(card.created_at).toLocaleDateString(i18n.language ? i18n.language : undefined) : "—";
                      return (
                        <div key={card.id} className="p-4 border rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">{petLabel}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${isOpen ? "text-orange-600 border-orange-200 bg-orange-50" : isWaiting ? 'text-amber-700 border-amber-200 bg-amber-50' : "text-green-600 border-green-200 bg-green-50"}`}>{isOpen ? t('doctor.history.status.open') : isWaiting ? t('doctor.history.status.waiting') : t('doctor.history.status.closed')}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">{dateStr}</div>
                          <div className="text-sm text-muted-foreground truncate" title={diag}>{diag}</div>
                          <div className="mt-3 flex justify-end">
                            {isWaiting && (
                              <Button size="sm" variant="outline" onClick={() => openEditCard(Number(card.id))}>{t('doctor.history.edit')}</Button>
                            )}
                            {isClosed && (
                              <Button size="sm" variant="outline" disabled>{t('doctor.history.viewDisabled')}</Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {doctorCardsData && doctorCardsData.results.length === 0 && (
                      <div className="text-sm text-muted-foreground">{t('doctor.history.empty')}</div>
                    )}
                    {!doctorCardsData && <div className="text-sm text-muted-foreground">{t('doctor.history.empty')}</div>}
                  </div>
                )}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs text-muted-foreground">{t('doctor.history.total', { count: doctorCardsData?.count ?? 0 })}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={historyPage === 1 || historyLoading} onClick={() => setHistoryPage(p => Math.max(1, p - 1))}>{t('common.prev')}</Button>
                    <Button variant="outline" size="sm" disabled={!doctorCardsData?.next || historyLoading} onClick={() => setHistoryPage(p => p + 1)}>{t('common.next')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
    </div>
  );

  // Render rooms view
  const renderRoomsView = () => (
    <div className="space-y-4 animate-fade-in">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle>{t('doctor.rooms.title')}</CardTitle>
                <CardDescription>{t('doctor.rooms.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {roomsLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                {!roomsLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {roomsData && roomsData.results.map(r => {
                      const available = r.is_available;
                      const idLabel = r.room_number || r.id.toString().padStart(3, '0');
                      return (
                        <div key={r.id} className={`rounded-xl border p-4 transition-all hover:shadow-glow ${available ? "bg-green-50 border-green-200" : "bg-muted/40"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-muted-foreground">{t('doctor.rooms.roomLabel')}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${available ? "text-green-700 border-green-300 bg-green-100" : "text-red-700 border-red-300 bg-red-100"}`}>{available ? t('doctor.rooms.free') : t('doctor.rooms.busy')}</span>
                          </div>
                          <div className="text-2xl font-bold tracking-widest">{idLabel}</div>
                          <div className="text-xs text-muted-foreground mt-1">{t('doctor.rooms.pricePerDayPrefix')} {r.price_per_day || '—'}</div>
                          <div className="text-xs text-muted-foreground truncate" title={r.description}>{r.description || t('doctor.rooms.noDescription')}</div>
                        </div>
                      );
                    })}
                    {roomsData && roomsData.results.length === 0 && <div className="text-sm text-muted-foreground">{t('doctor.rooms.empty')}</div>}
                    {!roomsData && <div className="text-sm text-muted-foreground">{t('doctor.rooms.empty')}</div>}
                  </div>
                )}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs text-muted-foreground">{t('doctor.rooms.total', { count: roomsData?.count ?? 0 })}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={roomsPage === 1 || roomsLoading} onClick={() => setRoomsPage(p => Math.max(1, p - 1))}>{t('common.prev')}</Button>
                    <Button variant="outline" size="sm" disabled={!roomsData?.next || roomsLoading} onClick={() => setRoomsPage(p => p + 1)}>{t('common.next')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Sidebar Navigation */}
      <DoctorSidebar
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
              aria-label={t("common.goHome")}
            >
              <img src={elvetLogo} alt="ELVET" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-glow border border-white/30" />
              <div className="text-left hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
                <p className="text-xs text-muted-foreground">{t("dashboard.doctor")}</p>
              </div>
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <LanguageSwitcher />
              <Button variant="outline" onClick={refreshAll} disabled={refreshing} className="gap-2 hover-scale" size="sm">
                <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin-slow' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Updating…' : 'Update'}</span>
              </Button>
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

      {/* Edit Medical Card Modal */}
      <Dialog open={editCardDialogOpen} onOpenChange={(open) => {
        if (!open && editCardSaving) return; setEditCardDialogOpen(open);
      }}>
        <DialogContent className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('doctor.edit.title')}</DialogTitle>
            <DialogDescription>{t('doctor.edit.subtitle')}</DialogDescription>
          </DialogHeader>

          {editCardLoading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ed_diag">{t('doctor.vitals.diagnosis')}</Label>
                <Textarea id="ed_diag" required value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} placeholder={t('doctor.vitals.diagnosisPlaceholder')} className={`${!String(editDiagnosis||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                {!String(editDiagnosis||'').trim() && <p className="text-xs text-destructive">Required</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ed_an">{t('doctor.vitals.analyses')}</Label>
                  <Textarea id="ed_an" required value={editAnalyses} onChange={(e) => setEditAnalyses(e.target.value)} placeholder={t('doctor.vitals.analysesPlaceholder')} className={`${!String(editAnalyses||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {!String(editAnalyses||'').trim() && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed_sym">{t('doctor.vitals.symptoms')}</Label>
                  <Textarea id="ed_sym" required value={editSymptoms} onChange={(e) => setEditSymptoms(e.target.value)} placeholder={t('doctor.vitals.symptomsPlaceholder')} className={`${!String(editSymptoms||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {!String(editSymptoms||'').trim() && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed_chest">{t('doctor.vitals.chest')}</Label>
                  <Input id="ed_chest" required value={editChest} onChange={(e) => setEditChest(e.target.value)} placeholder={t('doctor.vitals.chestPlaceholder')} className={`${!String(editChest||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {!String(editChest||'').trim() && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ed_notes">{t('doctor.vitals.notes')}</Label>
                  <Textarea id="ed_notes" required value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder={t('doctor.vitals.notesPlaceholder')} className={`${!String(editNotes||'').trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {!String(editNotes||'').trim() && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed_revisit">{t('doctor.revisitDate')}</Label>
                  <Input id="ed_revisit" type="date" min={todayStr} value={editRevisit} onChange={(e) => setEditRevisit(e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ed_recommended_feed">Рекомендованный корм</Label>
                  <Textarea
                    id="ed_recommended_feed"
                    value={editRecommendedFeedText}
                    onChange={(e) => setEditRecommendedFeedText(e.target.value)}
                    placeholder="Например: JOSERA Catelux, 0.5 кг в день на 14 дней"
                  />
                </div>

                <div className="md:col-span-2">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle>{t('doctor.stationary.title')}</CardTitle>
                      <CardDescription>{t('doctor.edit.stationarySubtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editIsStationary} onChange={(e) => setEditIsStationary(e.target.checked)} />
                        <span>{t('doctor.stationary.checkbox')}</span>
                      </label>
                      {editIsStationary && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>{t('doctor.stationary.room')}</Label>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant="outline" size="sm" type="button" onClick={() => setEditFreeRoomsDialogOpen(true)}>
                                {editStationaryRoom ? t('doctor.stationary.roomSelected', { room: editStationaryRoomLabel || t('doctor.room.fallback', { id: editStationaryRoom }) }) : t('doctor.stationary.selectRoom')}
                              </Button>
                              {editStationaryRoom && (
                                <Button variant="ghost" size="sm" type="button" onClick={() => { setEditStationaryRoom(""); setEditStationaryRoomLabel(""); }}>
                                  {t('doctor.clear')}
                                </Button>
                              )}
                            </div>
                            {editStationaryRoom && (
                              <div className="text-xs text-muted-foreground">{t('doctor.stationary.roomIdNote', { id: editStationaryRoom })}</div>
                            )}
                          </div>
                          {editStationaryRoom && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label>{t('doctor.stationary.bookingType', { defaultValue: 'Тип бронирования' })}</Label>
                                <Select value={editBookingType} onValueChange={(val: "DAILY" | "HOURLY") => setEditBookingType(val)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('doctor.stationary.bookingTypePlaceholder', { defaultValue: 'Выберите тип' })} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="DAILY">{t('doctor.stationary.typeDaily', { defaultValue: 'Daily' })}</SelectItem>
                                    <SelectItem value="HOURLY">{t('doctor.stationary.typeHourly', { defaultValue: 'Hourly' })}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {editBookingType === "DAILY" ? (
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="ed_start">{t('doctor.stationary.startDate')}</Label>
                                    <Input id="ed_start" type="date" min={todayStr} value={editStayStart} onChange={(e) => setEditStayStart(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="ed_end">{t('doctor.stationary.endDate')}</Label>
                                    <Input id="ed_end" type="date" min={todayStr} value={editStayEnd} onChange={(e) => setEditStayEnd(e.target.value)} />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="ed_start_dt">{t('doctor.stationary.startDateTime')}</Label>
                                    <Input id="ed_start_dt" type="datetime-local" value={editHourlyStart} onChange={(e) => setEditHourlyStart(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="ed_end_dt">{t('doctor.stationary.endDateTime')}</Label>
                                    <Input id="ed_end_dt" type="datetime-local" value={editHourlyEnd} onChange={(e) => setEditHourlyEnd(e.target.value)} />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Edit Services */}
                <div className="md:col-span-2">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle>{t('doctor.edit.services.title')}</CardTitle>
                      <CardDescription>{t('doctor.edit.services.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editUsagesLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                      {editUsagesError && <div className="text-sm text-destructive">{editUsagesError}</div>}
                      {!editUsagesLoading && (
                        <div className="space-y-2">
                          {editServicesUsages.filter(u => !u._deleted).map(row => {
                            const currentServiceId = row.service ? String(row.service) : undefined;
                            const label = (() => {
                              const rec = editFormServices?.results.find(s => s.id === row.service);
                              return rec?.service_name || rec?.name || row.service_name || row.service_name_fallback || (row.service ? t('doctor.edit.services.fallback', { id: row.service }) : '—');
                            })();
                            return (
                              <div key={row._localId} className="grid sm:grid-cols-[1fr,100px,1fr,auto] gap-2 items-center p-2 border rounded-lg">
                                <Select value={currentServiceId} onValueChange={(v) => setEditServicesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, service: Number(v), _dirty: true } : x))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={label} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {editFormServices?.results
                                      .filter(s => (s.service_name || s.name || '').toLowerCase().includes(editSearchService.toLowerCase()))
                                      .map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.service_name || s.name || `ID ${s.id}`}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Input type="number" min={1} value={row.quantity ?? ''} onChange={e => setEditServicesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, quantity: Number(e.target.value || 0), _dirty: true } : x))} />
                                <Input placeholder={t('doctor.edit.services.descriptionPlaceholder')} value={row.description ?? ''} onChange={e => setEditServicesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, description: e.target.value, _dirty: true } : x))} />
                                <Button variant="outline" size="sm" onClick={() => setEditServicesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, _deleted: true } : x))}>{t('doctor.edit.services.delete')}</Button>
                              </div>
                            );
                          })}
                          {editServicesUsages.filter(u => !u._deleted).length === 0 && (
                            <div className="text-sm text-muted-foreground">{t('doctor.edit.services.empty')}</div>
                          )}
                          <div className="pt-2 border-t mt-2">
                            <div className="grid sm:grid-cols-[1fr,100px,1fr,auto] gap-2 items-center">
                              <Select onValueChange={(v) => {
                                const service = Number(v);
                                setEditServicesUsages(prev => ([...prev, { _localId: `su-new-${Date.now()}`, _new: true, service, quantity: 1, description: '', _dirty: true }]));
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('doctor.edit.services.add')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <div className="px-2 py-1">
                                    <Input placeholder={t('doctor.edit.services.search')} value={editSearchService} onChange={e => setEditSearchService(e.target.value)} />
                                  </div>
                                  {editFormServices?.results
                                    .filter(s => (s.service_name || s.name || '').toLowerCase().includes(editSearchService.toLowerCase()))
                                    .map(s => (
                                      <SelectItem key={s.id} value={String(s.id)}>{s.service_name || s.name || `ID ${s.id}`}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <div />
                              <div />
                              <div />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Edit Medicines */}
                <div className="md:col-span-2">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle>{t('doctor.edit.medicines.title')}</CardTitle>
                      <CardDescription>{t('doctor.edit.medicines.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editUsagesLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
                      {!editUsagesLoading && (
                        <div className="space-y-2">
                          {editMedicinesUsages.filter(u => !u._deleted).map(row => {
                            const currentMedId = row.medicine ? String(row.medicine) : undefined;
                            const medLabel = (() => {
                              const rec = editFormMedicines?.results.find(m => m.id === row.medicine);
                              return rec?.medicine_name || rec?.name || row.name || (row.medicine ? t('doctor.edit.medicines.fallback', { id: row.medicine }) : '—');
                            })();
                            return (
                              <div key={row._localId} className="grid sm:grid-cols-[1fr,100px,1fr,auto] gap-2 items-center p-2 border rounded-lg">
                                <Select value={currentMedId} onValueChange={(v) => setEditMedicinesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, medicine: Number(v), _dirty: true } : x))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={medLabel} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {editFormMedicines?.results
                                      .filter(m => (m.medicine_name || m.name || '').toLowerCase().includes(editSearchMedicine.toLowerCase()))
                                      .map(m => (
                                        <SelectItem key={m.id} value={String(m.id)}>{m.medicine_name || m.name || `ID ${m.id}`}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Input type="number" min={1} value={row.quantity ?? ''} onChange={e => setEditMedicinesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, quantity: Number(e.target.value || 0), _dirty: true } : x))} />
                                <Input placeholder={t('doctor.edit.medicines.dosagePlaceholder')} value={row.dosage ?? ''} onChange={e => setEditMedicinesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, dosage: e.target.value, _dirty: true } : x))} />
                                <Button variant="outline" size="sm" onClick={() => setEditMedicinesUsages(prev => prev.map(x => x._localId === row._localId ? { ...x, _deleted: true } : x))}>{t('doctor.edit.medicines.delete')}</Button>
                              </div>
                            );
                          })}
                          {editMedicinesUsages.filter(u => !u._deleted).length === 0 && (
                            <div className="text-sm text-muted-foreground">{t('doctor.edit.medicines.empty')}</div>
                          )}
                          <div className="pt-2 border-t mt-2">
                            <div className="grid sm:grid-cols-[1fr,100px,1fr,auto] gap-2 items-center">
                              <Select onValueChange={(v) => {
                                const medicine = Number(v);
                                setEditMedicinesUsages(prev => ([...prev, { _localId: `mu-new-${Date.now()}`, _new: true, medicine, quantity: 1, dosage: '', _dirty: true }]));
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('doctor.edit.medicines.add')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <div className="px-2 py-1">
                                    <Input placeholder={t('doctor.edit.medicines.search')} value={editSearchMedicine} onChange={e => setEditSearchMedicine(e.target.value)} />
                                  </div>
                                  {editFormMedicines?.results
                                    .filter(m => (m.medicine_name || m.name || '').toLowerCase().includes(editSearchMedicine.toLowerCase()))
                                    .map(m => (
                                      <SelectItem key={m.id} value={String(m.id)}>{m.medicine_name || m.name || `ID ${m.id}`}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <div />
                              <div />
                              <div />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Feeds editing removed: feeds are billed via separate Feed Sales, not on the medical card. */}

                {/* Attachments: X-rays & Prescriptions */}
                <div className="md:col-span-2">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Paperclip className="w-4 h-4" />{t('doctor.edit.attachments.title', { defaultValue: 'Вложения: рентген и назначения' })}</CardTitle>
                      <CardDescription>{t('doctor.edit.attachments.subtitle', { defaultValue: 'Загрузите снимки и PDF-файлы рецептов для этой карты' })}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="attachments-input">{t('doctor.edit.attachments.add')}</Label>
                        <Input
                          id="attachments-input"
                          type="file"
                          multiple
                          accept="image/*,.pdf,.dcm,.dicom"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setPendingAttachments(prev => ([
                              ...prev,
                              ...files.map(file => {
                                const lower = file.name.toLowerCase();
                                let type: "XRAY" | "PRESCRIPTION" | "OTHER" = "OTHER";
                                if (lower.endsWith('.pdf')) {
                                  type = "PRESCRIPTION";
                                } else if (/\.(jpg|jpeg|png|gif|bmp|tiff|tif|dcm)$/.test(lower)) {
                                  type = "XRAY";
                                }
                                return { file, type };
                              }),
                            ]));
                            e.target.value = '';
                          }}
                        />
                        {pendingAttachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-muted-foreground">{t('doctor.edit.attachments.pending', { defaultValue: 'Файлы, ожидающие загрузки' })}</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/40">
                              {pendingAttachments.map((att, idx) => (
                                <div key={`${att.file.name}-${idx}`} className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                      {att.type === 'XRAY' ? 'X' : att.type === 'PRESCRIPTION' ? 'Rx' : 'F'}
                                    </span>
                                    <span className="truncate max-w-[180px]" title={att.file.name}>{att.file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={att.type}
                                      onValueChange={(v) => setPendingAttachments(prev => prev.map((x, i) => i === idx ? { ...x, type: v as any } : x))}
                                    >
                                      <SelectTrigger className="h-7 w-[120px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="XRAY">XRAY</SelectItem>
                                        <SelectItem value="PRESCRIPTION">PRESCRIPTION</SelectItem>
                                        <SelectItem value="OTHER">OTHER</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-xs"
                                      onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {t('doctor.edit.attachments.hint', { defaultValue: 'Вложения будут загружены при сохранении карты.' })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium flex items-center gap-2">
                            🖼️ {t('doctor.edit.attachments.xrayTitle', { defaultValue: 'Рентген-снимки' })}
                          </p>
                          {attachmentsLoading && <span className="text-xs text-muted-foreground">{t('common.loading')}</span>}
                        </div>
                        {editAttachments.filter(a => (a.type || '').toUpperCase() === 'XRAY').length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t('doctor.edit.attachments.xrayEmpty', { defaultValue: 'Нет загруженных рентген-снимков' })}</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {editAttachments.filter(a => (a.type || '').toUpperCase() === 'XRAY').map(att => (
                              <div key={att.id} className="relative group rounded-lg overflow-hidden border bg-muted/40">
                                <img src={att.file} alt="xray" className="w-full h-28 object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                  <a
                                    href={att.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-white px-2 py-1 rounded-full bg-black/60"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {t('doctor.edit.attachments.open', { defaultValue: 'Открыть' })}
                                  </a>
                                  <a
                                    href={att.file}
                                    download
                                    className="inline-flex items-center gap-1 text-xs text-white px-2 py-1 rounded-full bg-black/60"
                                  >
                                    <Download className="w-3 h-3" />
                                    {t('doctor.edit.attachments.download', { defaultValue: 'Скачать' })}
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          📄 {t('doctor.edit.attachments.prescriptionsTitle', { defaultValue: 'PDF назначения' })}
                        </p>
                        {editAttachments.filter(a => (a.type || '').toUpperCase() === 'PRESCRIPTION').length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t('doctor.edit.attachments.prescriptionsEmpty', { defaultValue: 'Нет загруженных PDF-файлов' })}</p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {editAttachments.filter(a => (a.type || '').toUpperCase() === 'PRESCRIPTION').map((att, idx) => (
                              <div key={att.id ?? idx} className="flex items-center justify-between gap-2 text-xs border rounded-md px-2 py-1 bg-muted/40">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800">Rx</span>
                                  <span className="truncate max-w-[220px]" title={att.file}>{att.file.split('/').slice(-1)[0]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={att.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {t('doctor.edit.attachments.open', { defaultValue: 'Открыть' })}
                                  </a>
                                  <a
                                    href={att.file}
                                    download
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline"
                                  >
                                    <Download className="w-3 h-3" />
                                    {t('doctor.edit.attachments.download', { defaultValue: 'Скачать' })}
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditCardDialogOpen(false)} disabled={editCardSaving}>{t('common.cancel')}</Button>
              <Button
                className="bg-gradient-hero"
                onClick={saveEditCard}
                disabled={
                  editCardSaving ||
                  !String(editDiagnosis || '').trim() ||
                  !String(editAnalyses || '').trim() ||
                  !String(editSymptoms || '').trim() ||
                  !String(editChest || '').trim() ||
                  !String(editNotes || '').trim()
                }
              >
                {editCardSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Free rooms dialog for edit */}
        <Dialog open={editFreeRoomsDialogOpen} onOpenChange={setEditFreeRoomsDialogOpen}>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{t('doctor.freeRooms.title')}</DialogTitle>
              <DialogDescription>{t('doctor.freeRooms.subtitle')}</DialogDescription>
            </DialogHeader>

            {freeRoomsLoading && <div className="text-sm text-muted-foreground">{t('doctor.freeRooms.loading')}</div>}
            {freeRoomsError && <div className="text-sm text-destructive">{freeRoomsError}</div>}
            {!freeRoomsLoading && !freeRoomsError && (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3 max-h-[360px] overflow-auto pr-1">
                  {freeRoomsData.map(room => {
                    const roomLabel = room.room_number || room.description || t('doctor.room.fallback', { id: room.id });
                    return (
                      <Card key={room.id} className={`border-2 ${String(room.id) === editStationaryRoom ? 'border-primary shadow-glow' : ''}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{roomLabel}</CardTitle>
                          <CardDescription>{t('doctor.freeRooms.id', { id: room.id })}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {room.description && <div className="text-sm text-muted-foreground">{room.description}</div>}
                          {room.price_per_day && <div className="text-xs text-muted-foreground">{t('doctor.freeRooms.pricePerDay', { price: room.price_per_day })}</div>}
                          <Button variant="outline" size="sm" onClick={() => handleSelectEditFreeRoom(room)}>{t('doctor.freeRooms.select')}</Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {freeRoomsData.length === 0 && (
                    <div className="text-sm text-muted-foreground">{t('doctor.freeRooms.empty')}</div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default DoctorDashboard;

// Helper for formatting salary sums
function formatSalary(n: number) {
  if (!isFinite(n)) return "0";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
