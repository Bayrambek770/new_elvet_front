import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MedicalCards, Doctors, Pets } from "@/lib/api";
import { useNurseCareClient } from "@/hooks/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Pill, ListChecks, ChevronDown, ChevronUp, User as UserIcon, Calendar as CalendarIcon, Image as ImageIcon, Paperclip, Download, Home, Wallet, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PaymentStatus = "WAITING" | "PARTLY_PAID" | "FULLY_PAID";

export const HistoryCardsViewer = ({ userId }: { userId: string | number }) => {
  const { t } = useTranslation();
  
  // State for selected payment status filter
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>("WAITING");
  
  // Medical cards state
  const [medicalCards, setMedicalCards] = useState<any[]>([]);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [detailsByCard,setDetailsByCard] = useState<Record<number, any>>({});
  const [loadingCardIds, setLoadingCardIds] = useState<Record<number, boolean>>({});
  const [doctorById, setDoctorById] = useState<Record<number, any | "unknown">>({});
  const [loadingDoctorIds, setLoadingDoctorIds] = useState<Record<number, boolean>>({});
  const [petById, setPetById] = useState<Record<number, any | "unknown">>({});
  
  // Nurse care cards state
  const { data: nurseCareData, isLoading: nurseLoading, isError: nurseError } = useNurseCareClient();
  const nurseCareCards = Array.isArray(nurseCareData) ? nurseCareData : [];

  useEffect(() => {
    fetchMedicalCards();
  }, [userId]);

  const toArray = (maybe: any) => {
    if (Array.isArray(maybe)) return maybe;
    if (Array.isArray(maybe?.results)) return maybe.results;
    if (maybe && typeof maybe === "object") return [maybe];
    return [];
  };

  const fetchMedicalCards = async () => {
    try {
      const data = await MedicalCards.byUser<any>(userId);
      const cards = toArray(data);
      setMedicalCards(cards);
      
      // Pre-fetch basic details AND pet names for each card
      cards.forEach(async (card) => {
        // Fetch card details
        if (card.id && !detailsByCard[card.id]) {
          try {
            const detail = await MedicalCards.get<any>(card.id);
            setDetailsByCard((prev) => ({ ...prev, [card.id]: detail }));
          } catch (e) {
            console.error(`Error fetching detail for card ${card.id}:`, e);
          }
        }
        
        // Fetch pet details
        const petId = card.pet || card.animal;
        if (typeof petId === 'number' && !petById[petId]) {
          try {
            const pet = await Pets.get<any>(petId);
            setPetById((prev) => ({ ...prev, [petId]: pet }));
          } catch (e) {
            console.error(`Error fetching pet ${petId}:`, e);
            setPetById((prev) => ({ ...prev, [petId]: "unknown" }));
          }
        }
      });
    } catch (e) {
      console.error("Error fetching medical cards:", e);
      setMedicalCards([]);
    }
  };

  const formatSum = (n: number | string | null | undefined) => {
    const num = typeof n === "string" ? Number(n) : (n ?? 0);
    if (!isFinite(num as number)) return "0";
    return (num as number).toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  };

  const toggleCard = async (id: number, isMedical: boolean) => {
    const key = isMedical ? `med-${id}` : `nurse-${id}`;
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
    
    if (isMedical && !detailsByCard[id]) {
      try {
        setLoadingCardIds((p) => ({ ...p, [id]: true }));
        const detail = await MedicalCards.get<any>(id);
        setDetailsByCard((prev) => ({ ...prev, [id]: detail }));
        const docId = detail?.doctor;
        if (typeof docId === "number" && !doctorById[docId]) {
          try {
            setLoadingDoctorIds((p) => ({ ...p, [docId]: true }));
            const doctor = await Doctors.get<any>(docId);
            setDoctorById((prev) => ({ ...prev, [docId]: doctor }));
          } catch (e) {
            console.error("Error fetching doctor detail:", e);
            setDoctorById((prev) => ({ ...prev, [docId]: "unknown" }));
          } finally {
            setLoadingDoctorIds((p) => ({ ...p, [docId]: false }));
          }
        }
      } catch (e) {
        console.error("Error fetching medical card detail:", e);
        setDetailsByCard((prev) => ({ ...prev, [id]: { medicine_usages: [] } }));
      } finally {
        setLoadingCardIds((p) => ({ ...p, [id]: false }));
      }
    }
  };

  // Payment status helpers
  const getStatus = (card: any): PaymentStatus => {
    const s = (card?.status || "").toString().toUpperCase();
    if (s === "FULLY_PAID" || s === "PAID" || s === "FULL_PAID" || !!card?.is_paid) return "FULLY_PAID";
    if (s === "PARTLY_PAID" || s === "PARTLY") return "PARTLY_PAID";
    return "WAITING";
  };

  const formatDateFancy = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const datePart = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(d);
    const timePart = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
    return `${datePart}, ${timePart}`;
  };

  const getDisplayDate = (card: any) => {
    const d = detailsByCard[card.id];
    const preferClosed = getStatus(card) === "FULLY_PAID";
    const iso = preferClosed
      ? (d?.closed_at || card?.closed_at || d?.schedule?.date || d?.created_at || card?.visit_date || card?.created_at)
      : (d?.schedule?.date || d?.created_at || card?.visit_date || card?.created_at);
    return formatDateFancy(iso);
  };

  const getDoctorLabel = (card: any) => {
    const d = detailsByCard[card.id];
    const docId = d?.doctor;
    if (typeof docId === "number") {
      if (loadingDoctorIds[docId]) return t("client.medicalCards.doctor.loading");
      const doc = doctorById[docId];
      if (doc === "unknown") return t("client.medicalCards.doctor.unknown");
      if (doc) {
        const fn = doc.first_name || "";
        const ln = doc.last_name || "";
        return `${t("client.medicalCards.doctor.prefix")} ${fn} ${ln}`.trim();
      }
    }
    const name = card?.doctor?.full_name || card?.doctor_name;
    return name ? `${t("client.medicalCards.doctor.prefix")} ${name}` : t("client.medicalCards.doctor.unknown");
  };

  const getAttachments = (cardId: number) => {
    const d = detailsByCard[cardId] || {};
    const fromDetail = Array.isArray(d.attachments) ? d.attachments : [];
    const fromRoot = Array.isArray((d as any).card_attachments) ? (d as any).card_attachments : [];
    return [...fromDetail, ...fromRoot];
  };

  const downloadFile = async (url: string, fallbackName: string) => {
    if (!url) return;
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Error downloading file", e);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadAll = (cardId: number) => {
    const attachments = getAttachments(cardId);
    if (!attachments.length) return;
    attachments.forEach((att: any, index: number) => {
      const url: string = att.file || "";
      if (!url) return;
      const name = url.split("/").filter(Boolean).slice(-1)[0] || `attachment-${index + 1}`;
      downloadFile(url, name);
    });
  };

  // Combined and filtered cards
  const filteredCombinedCards = useMemo(() => {
    // Transform medical cards
    const medical = medicalCards.map(card => ({
      ...card,
      type: "MEDICAL" as const,
      displayDate: card.created_at || card.visit_date,
    }));

    // Transform nurse care cards  
    const nurse = nurseCareCards.map(card => ({
      ...card,
      type: "NURSE" as const,
      displayDate: card.created_at || card.updated_at,
    }));

    // Combine and filter by selected status
    const allCards = [...medical, ...nurse];
    return allCards
      .filter(card => getStatus(card) === selectedStatus)
      .sort((a, b) => {
        const dateA = new Date(a.displayDate || 0).getTime();
        const dateB = new Date(b.displayDate || 0).getTime();
        return dateB - dateA; // Most recent first
      });
  }, [medicalCards, nurseCareCards, selectedStatus]);

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="w-6 h-6 text-primary" />
          {t("client.historyCards.title")}
        </CardTitle>
        <CardDescription className="text-base">
          {t("client.historyCards.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Filter Buttons - LARGE and CLEAR */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("client.historyCards.filterByStatus")}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Button
              onClick={() => setSelectedStatus("WAITING")}
              variant={selectedStatus === "WAITING" ? "default" : "outline"}
              size="lg"
              className={`h-auto py-3 sm:py-4 flex flex-col items-center gap-1 sm:gap-2 text-sm sm:text-base font-semibold transition-all ${
                selectedStatus === "WAITING" 
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg scale-105" 
                  : "hover:bg-amber-50 hover:border-amber-300"
              }`}
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm leading-tight text-center">
                <span className="sm:hidden">{t("client.historyCards.status.waitingShort")}</span>
                <span className="hidden sm:inline">{t("client.historyCards.status.waiting")}</span>
              </span>
            </Button>

            <Button
              onClick={() => setSelectedStatus("PARTLY_PAID")}
              variant={selectedStatus === "PARTLY_PAID" ? "default" : "outline"}
              size="lg"
              className={`h-auto py-3 sm:py-4 flex flex-col items-center gap-1 sm:gap-2 text-sm sm:text-base font-semibold transition-all ${
                selectedStatus === "PARTLY_PAID" 
                  ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg scale-105" 
                  : "hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm leading-tight text-center">
                <span className="sm:hidden">{t("client.historyCards.status.partlyPaidShort")}</span>
                <span className="hidden sm:inline">{t("client.historyCards.status.partlyPaid")}</span>
              </span>
            </Button>

            <Button
              onClick={() => setSelectedStatus("FULLY_PAID")}
              variant={selectedStatus === "FULLY_PAID" ? "default" : "outline"}
              size="lg"
              className={`h-auto py-3 sm:py-4 flex flex-col items-center gap-1 sm:gap-2 text-sm sm:text-base font-semibold transition-all ${
                selectedStatus === "FULLY_PAID" 
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-lg scale-105" 
                  : "hover:bg-green-50 hover:border-green-300"
              }`}
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm leading-tight text-center">
                <span className="sm:hidden">{t("client.historyCards.status.fullyPaidShort")}</span>
                <span className="hidden sm:inline">{t("client.historyCards.status.fullyPaid")}</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Cards List */}
        {filteredCombinedCards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t("client.historyCards.empty")}</p>
            <p className="text-sm mt-2">{t("client.historyCards.emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCombinedCards.map((card) => {
              const isMedical = card.type === "MEDICAL";
              
              return (
                <div 
                  key={`${card.type}-${card.id}`} 
                  className="rounded-xl border-2 p-5 hover:shadow-lg transition-all bg-card"
                >
                  {/* Card Header with Type Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isMedical ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-xs sm:text-sm px-2 sm:px-3 py-1 font-bold">
                            🏥 <span className="sm:hidden">{t("client.historyCards.badge.medicalShort")}</span>
                            <span className="hidden sm:inline">{t("client.historyCards.badge.medical")}</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200 text-xs sm:text-sm px-2 sm:px-3 py-1 font-bold">
                            💗 <span className="sm:hidden">{t("client.historyCards.badge.nurseCareShort")}</span>
                            <span className="hidden sm:inline">{t("client.historyCards.badge.nurseCare")}</span>
                          </Badge>
                        )}
                      </div>
                      
                      {isMedical ? (
                        <>
                          <div className="font-bold text-lg">
                            {(() => {
                              const detail = detailsByCard[card.id];
                              const petId = card.pet || card.animal || detail?.pet || detail?.animal;
                              const pet = typeof petId === 'number' ? petById[petId] : null;
                              const petName = pet && pet !== "unknown" ? (pet.name || pet.pet_name) : null;
                              
                              return petName || t("client.medicalCards.petFallback");
                            })()} — #{card.card_number}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {getDisplayDate(card)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                              {getDoctorLabel(card)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-lg">
                            {t("client.nurseCare.cardNumber", { id: card.id })}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {formatDateFancy(card.created_at || card.updated_at)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {t("client.nurseCare.nurseNumber", { id: card.nurse })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isMedical && card.is_hospitalized && (
                        <Badge variant="outline" className="text-xs">{t("client.medicalCards.stationaryBadge")}</Badge>
                      )}
                      <Badge variant="secondary" className="text-base px-3 py-1 font-bold">
                        {formatSum(isMedical ? (detailsByCard[card.id]?.total_fee ?? card.total_amount) : card.total_amount)}{" "}
                        {t("client.medicalCards.currency.sum").toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Nurse Care Quick Info */}
                  {!isMedical && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ListChecks className="w-4 h-4" />
                        <span className="font-medium">
                          {(card.services || []).map((s: any) => s.service_name).join(", ") || t("client.nurseCare.servicesEmpty")}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                        <div>{t("client.nurseCare.total")} {formatSum(card.total_amount)}</div>
                        <div>{t("client.nurseCare.paid")} {formatSum(card.amount_paid)}</div>
                        <div>{t("client.nurseCare.remain")} {formatSum(Math.max(0, Number(card.total_amount || 0) - Number(card.amount_paid || 0)))}</div>
                      </div>
                    </div>
                  )}

                  {/* Details toggle for Medical cards */}
                  {isMedical && (
                    <>
                      <button
                        onClick={() => toggleCard(card.id, true)}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <ListChecks className="w-4 h-4" />
                        {t("client.medicalCards.detailsToggle")}
                        {openIds[card.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {openIds[card.id] && (
                        <div className="mt-4 rounded-lg border bg-muted/20 p-4">
                          {loadingCardIds[card.id] ? (
                            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                          ) : (
                            <div className="space-y-4">
                              {/* Services */}
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                                  <ListChecks className="w-4 h-4 text-primary" />
                                  {t("client.medicalCards.services")}
                                </div>
                                {(() => {
                                  const d: any = detailsByCard[card.id] || {};
                                  const rawServices: any[] = d.service_usages || d.card_services || d.services || [];
                                  const services = (Array.isArray(rawServices) ? rawServices : [])
                                    .map((s: any) => ({
                                      id: s.id,
                                      name: s.service_name || s.name || s.service?.name || s.services?.name || s.title || "—",
                                      quantity: s.quantity || 1,
                                      price: s.total_price || s.price || null,
                                    }))
                                    .filter((s) => !!s.name && s.name !== "—");
                                  return services.length > 0 ? (
                                    <ul className="text-sm space-y-1 ml-6">
                                      {services.map((s) => (
                                        <li key={s.id || s.name} className="list-disc">
                                          {s.name} ({s.quantity}x){s.price ? ` — ${formatSum(s.price)} ${t("client.medicalCards.currency.sum").toUpperCase()}` : ""}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-sm text-muted-foreground ml-6">{t("client.medicalCards.services.empty")}</div>
                                  );
                                })()}
                              </div>

                              {/* Prescriptions */}
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                                  <Pill className="w-4 h-4 text-primary" />
                                  {t("client.medicalCards.prescriptions")}
                                </div>
                                {detailsByCard[card.id]?.medicine_usages && detailsByCard[card.id].medicine_usages.length > 0 ? (
                                  <ul className="text-sm space-y-1 ml-6">
                                    {detailsByCard[card.id].medicine_usages.map((m: any) => (
                                      <li key={m.id} className="list-disc">
                                        {m.name} ({m.quantity || 1}x)
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-sm text-muted-foreground ml-6">{t("client.medicalCards.prescriptions.empty")}</div>
                                )}
                              </div>

                              {/* Stationary Room Payment */}
                              {(() => {
                                const d: any = detailsByCard[card.id] || {};
                                const stationaryFee = d.stationary_fee || d.stationary_total || null;
                                if (!stationaryFee || stationaryFee === "0" || stationaryFee === 0) return null;
                                return (
                                  <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                                      <Home className="w-4 h-4 text-primary" />
                                      {t("client.medicalCards.stationaryRoom.title")}
                                    </div>
                                    <div className="p-3 rounded-md border bg-background ml-6">
                                      <p className="text-xs text-muted-foreground mb-1">{t("client.medicalCards.stationaryRoom.payment")}</p>
                                      <p className="font-bold text-sm">{formatSum(stationaryFee)} {t("client.medicalCards.currency.sum").toUpperCase()}</p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Attachments */}
                              {(() => {
                                const attachments = getAttachments(card.id);
                                if (!attachments.length) return null;
                                const xrays = attachments.filter((a: any) => (a?.type || "").toString().toUpperCase() === "XRAY");
                                const others = attachments.filter((a: any) => (a?.type || "").toString().toUpperCase() !== "XRAY");
                                if (!xrays.length && !others.length) return null;
                                return (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Paperclip className="w-4 h-4 text-primary" />
                                        {t("client.medicalCards.attachments")}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => handleDownloadAll(card.id)}
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        {t("client.medicalCards.attachments.downloadAll")}
                                      </Button>
                                    </div>

                                    {xrays.length > 0 && (
                                      <div className="ml-6">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                          <ImageIcon className="w-3 h-3" />
                                          {t("client.medicalCards.attachments.xrays")}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          {xrays.map((att: any) => (
                                            <button
                                              key={att.id || att.file}
                                              type="button"
                                              onClick={() => window.open(att.file, "_blank", "noopener,noreferrer")}
                                              className="group relative aspect-square overflow-hidden rounded-lg border bg-black/5"
                                            >
                                              <img
                                                src={att.file}
                                                alt="x-ray"
                                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {others.length > 0 && (
                                      <div className="ml-6 space-y-1">
                                        {others.map((att: any) => {
                                          const url: string = att.file || "";
                                          const name = url.split("/").filter(Boolean).slice(-1)[0] || "file";
                                          return (
                                            <button
                                              key={att.id || url}
                                              type="button"
                                              onClick={() => downloadFile(url, name)}
                                              className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/80 text-sm"
                                            >
                                              <span className="truncate pr-2">{name}</span>
                                              <Download className="w-4 h-4 text-primary flex-shrink-0" />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
