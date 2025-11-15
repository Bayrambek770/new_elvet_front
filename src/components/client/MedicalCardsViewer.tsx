import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MedicalCards, Doctors } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Pill, ListChecks, ChevronDown, ChevronUp, User as UserIcon, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const MedicalCardsViewer = ({ userId }: { userId: string | number }) => {
  const [medicalCards, setMedicalCards] = useState<any[]>([]);
  const { t } = useTranslation();
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [detailsByCard, setDetailsByCard] = useState<Record<number, any>>({});
  const [loadingCardIds, setLoadingCardIds] = useState<Record<number, boolean>>({});
  const [doctorById, setDoctorById] = useState<Record<number, any | "unknown">>({});
  const [loadingDoctorIds, setLoadingDoctorIds] = useState<Record<number, boolean>>({});

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
      setMedicalCards(toArray(data));
    } catch (e) {
      console.error("Error fetching medical cards:", e);
      setMedicalCards([]);
    }
  };

  const formatSum = (n: number | string | null | undefined) => {
    const num = typeof n === "string" ? Number(n) : (n ?? 0);
    if (!isFinite(num as number)) return "0";
    return (num as number).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const toggleCard = async (id: number) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
    if (!detailsByCard[id]) {
      try {
        setLoadingCardIds((p) => ({ ...p, [id]: true }));
        const detail = await MedicalCards.get<any>(id);
        setDetailsByCard((prev) => ({ ...prev, [id]: detail }));
        // Fetch doctor details if present and not yet loaded
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

  const isPaid = (card: any) => {
    const status = (card?.status || "").toString().toUpperCase();
    return !!card?.is_paid || status === "CLOSED";
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
    // For paid/closed cards prefer closed_at
    const preferClosed = isPaid(card);
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
    // Fallback to list data if available
    const name = card?.doctor?.full_name || card?.doctor_name;
  return name ? `${t("client.medicalCards.doctor.prefix")} ${name}` : t("client.medicalCards.doctor.unknown");
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t("client.medicalCards.title")}
        </CardTitle>
        <CardDescription>
          {t("client.medicalCards.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {medicalCards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("client.medicalCards.empty")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pending Column */}
            <div>
              <h3 className="text-base font-semibold mb-3">{t("client.medicalCards.column.pending")}</h3>
              <div className="space-y-3">
                {medicalCards.filter((c) => !isPaid(c)).map((card) => (
                  <div key={card.id} className="rounded-lg border p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{card.animal?.name || t("client.medicalCards.petFallback")} — {t("client.medicalCards.title")} #{card.card_number}</div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{getDisplayDate(card)}</span>
                          <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" />{getDoctorLabel(card)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.is_hospitalized && <Badge variant="outline">Стационар</Badge>}
                        <Badge variant="secondary">{formatSum(detailsByCard[card.id]?.total_fee ?? card.total_amount)} SUM</Badge>
                      </div>
                    </div>

                    {/* Details toggle */}
                    <button
                      onClick={() => toggleCard(card.id)}
                      className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ListChecks className="w-4 h-4" /> {t("client.medicalCards.detailsToggle")}
                      {openIds[card.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openIds[card.id] && (
                      <div className="mt-3 rounded-md border bg-muted/30 p-3">
                        {loadingCardIds[card.id] ? (
                          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                        ) : (
                          <div className="space-y-3">
                            {/* Services used */}
                            <div>
                              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <ListChecks className="w-4 h-4 text-primary" /> {t("client.medicalCards.services")}
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
                                  <ul className="text-sm space-y-1">
                                    {services.map((s) => (
                                      <li key={s.id || s.name}>• {s.name} ({s.quantity}x){s.price ? ` — ${formatSum(s.price)} SUM` : ""}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-sm text-muted-foreground">{t("client.medicalCards.services.empty")}</div>
                                );
                              })()}
                            </div>

                            {/* Prescriptions */}
                            <div>
                              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <Pill className="w-4 h-4 text-primary" /> {t("client.medicalCards.prescriptions")}
                              </div>
                              {detailsByCard[card.id]?.medicine_usages && detailsByCard[card.id].medicine_usages.length > 0 ? (
                                <ul className="text-sm space-y-1">
                                  {detailsByCard[card.id].medicine_usages.map((m: any) => (
                                    <li key={m.id}>• {m.name} ({m.quantity || 1}x)</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm text-muted-foreground">{t("client.medicalCards.prescriptions.empty")}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Paid Column */}
            <div>
              <h3 className="text-base font-semibold mb-3">{t("client.medicalCards.column.paid")}</h3>
              <div className="space-y-3">
                {medicalCards.filter((c) => isPaid(c)).map((card) => (
                  <div key={card.id} className="rounded-lg border p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{card.animal?.name || t("client.medicalCards.petFallback")} — {t("client.medicalCards.title")} #{card.card_number}</div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(card.visit_date).toLocaleDateString('ru-RU')}</span>
                          <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" />{card.doctor?.full_name || "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.is_hospitalized && <Badge variant="outline">Стационар</Badge>}
                        <Badge>{formatSum(detailsByCard[card.id]?.total_fee ?? card.total_amount)} SUM</Badge>
                      </div>
                    </div>

                    {/* Details toggle */}
                    <button
                      onClick={() => toggleCard(card.id)}
                      className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ListChecks className="w-4 h-4" /> {t("client.medicalCards.detailsToggle")}
                      {openIds[card.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openIds[card.id] && (
                      <div className="mt-3 rounded-md border bg-muted/30 p-3">
                        {loadingCardIds[card.id] ? (
                          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                        ) : (
                          <div className="space-y-3">
                            {/* Services used */}
                            <div>
                              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <ListChecks className="w-4 h-4 text-primary" /> {t("client.medicalCards.services")}
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
                                  <ul className="text-sm space-y-1">
                                    {services.map((s) => (
                                      <li key={s.id || s.name}>• {s.name} ({s.quantity}x){s.price ? ` — ${formatSum(s.price)} SUM` : ""}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-sm text-muted-foreground">{t("client.medicalCards.services.empty")}</div>
                                );
                              })()}
                            </div>

                            {/* Prescriptions */}
                            <div>
                              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <Pill className="w-4 h-4 text-primary" /> {t("client.medicalCards.prescriptions")}
                              </div>
                              {detailsByCard[card.id]?.medicine_usages && detailsByCard[card.id].medicine_usages.length > 0 ? (
                                <ul className="text-sm space-y-1">
                                  {detailsByCard[card.id].medicine_usages.map((m: any) => (
                                    <li key={m.id}>• {m.name} ({m.quantity || 1}x)</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm text-muted-foreground">{t("client.medicalCards.prescriptions.empty")}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};