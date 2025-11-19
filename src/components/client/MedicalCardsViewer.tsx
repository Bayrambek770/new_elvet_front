import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MedicalCards, Doctors } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Pill, ListChecks, ChevronDown, ChevronUp, User as UserIcon, Calendar as CalendarIcon, Image as ImageIcon, Paperclip, Download } from "lucide-react";
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

  // Payment status helpers for three columns
  const getStatus = (card: any) => (card?.status || "").toString().toUpperCase();
  const isWaitingForPayment = (card: any) => {
    const s = getStatus(card);
    return s === "WAITING_FOR_PAYMENT" || s === "WAITING" || s === "PENDING_PAYMENT";
  };
  const isPartlyPaid = (card: any) => {
    const s = getStatus(card);
    return s === "PARTLY_PAID" || s === "PARTLY";
  };
  const isFullyPaid = (card: any) => {
    const s = getStatus(card);
    return s === "FULL_PAID" || s === "FULLY_PAID" || s === "PAID" || !!card?.is_paid;
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
    const preferClosed = isFullyPaid(card);
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
          <div className="grid md:grid-cols-3 gap-6">
            {/* Waiting for Payment Column */}
            <div>
              <h3 className="text-base font-semibold mb-3">Waiting for Payment</h3>
              <div className="space-y-3">
                {medicalCards.filter((c) => isWaitingForPayment(c)).map((card) => (
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
                          <div className="space-y-4">
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

                            {/* Attachments: X-rays & PDFs */}
                            {(() => {
                              const attachments = getAttachments(card.id);
                              if (!attachments.length) return null;
                              const xrays = attachments.filter((a: any) => (a?.type || "").toString().toUpperCase() === "XRAY");
                              const prescriptions = attachments.filter((a: any) => (a?.type || "").toString().toUpperCase() === "PRESCRIPTION");
                              const others = attachments.filter((a: any) => ["XRAY", "PRESCRIPTION"].indexOf((a?.type || "").toString().toUpperCase()) === -1);
                              const allNonEmpty = xrays.length || prescriptions.length || others.length;
                              if (!allNonEmpty) return null;
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                      <Paperclip className="w-4 h-4 text-primary" /> {t("client.medicalCards.attachments", { defaultValue: "Вложения" })}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs flex items-center gap-1"
                                      onClick={() => handleDownloadAll(card.id)}
                                    >
                                      <Download className="w-3 h-3" />
                                      {t("client.medicalCards.attachments.downloadAll", { defaultValue: "Скачать всё" })}
                                    </Button>
                                  </div>

                                  {/* X-rays as image thumbnails */}
                                  {xrays.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ImageIcon className="w-3 h-3" /> {t("client.medicalCards.attachments.xrays", { defaultValue: "Рентген-снимки" })}
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        {xrays.map((att: any) => (
                                          <div
                                            key={att.id || att.file}
                                            className="group relative flex flex-col gap-1"
                                          >
                                            <div className="aspect-square overflow-hidden rounded-lg border bg-black/10">
                                              <img
                                                src={att.file}
                                                alt="x-ray"
                                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                              />
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const url: string = att.file || "";
                                                if (!url) return;
                                                const name = url.split("/").filter(Boolean).slice(-1)[0] || "attachment";
                                                downloadFile(url, name);
                                              }}
                                              className="inline-flex items-center justify-center rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-muted/80"
                                            >
                                              <Download className="mr-1 h-3 w-3" />
                                              {t("client.medicalCards.attachments.download", { defaultValue: "Скачать" })}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* PDFs and other files */}
                                  {(prescriptions.length > 0 || others.length > 0) && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <FileText className="w-3 h-3" /> {t("client.medicalCards.attachments.files", { defaultValue: "Файлы" })}
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        {[...prescriptions, ...others].map((att: any) => {
                                          const url: string = att.file || "";
                                          const name = url.split("/").filter(Boolean).slice(-1)[0] || "file";
                                          return (
                                            <div
                                              key={att.id || url}
                                              className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-left hover:bg-muted/80"
                                            >
                                              <span className="truncate pr-2 text-xs">{name}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (!url) return;
                                                  downloadFile(url, name);
                                                }}
                                                className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] text-primary hover:bg-muted"
                                              >
                                                <Download className="mr-1 h-3 w-3" />
                                                {t("client.medicalCards.attachments.download", { defaultValue: "Скачать" })}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Partly Paid Column */}
            <div>
              <h3 className="text-base font-semibold mb-3">Partly Paid</h3>
              <div className="space-y-3">
                {medicalCards.filter((c) => isPartlyPaid(c)).map((card) => (
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
                          <div className="space-y-4">
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

                            {/* Attachments: X-rays & PDFs */}
                            {(() => {
                              const attachments = getAttachments(card.id);
                              if (!attachments.length) return null;
                              const xrays = attachments.filter((a: any) => (a?.type || "").toString().toUpperCase() === "XRAY");
                              const prescriptions = attachments.filter((a: any) => (a?.type || "").toString().toUpperCase() === "PRESCRIPTION");
                              const others = attachments.filter((a: any) => ["XRAY", "PRESCRIPTION"].indexOf((a?.type || "").toString().toUpperCase()) === -1);
                              const allNonEmpty = xrays.length || prescriptions.length || others.length;
                              if (!allNonEmpty) return null;
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                      <Paperclip className="w-4 h-4 text-primary" /> {t("client.medicalCards.attachments", { defaultValue: "Вложения" })}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs flex items-center gap-1"
                                      onClick={() => handleDownloadAll(card.id)}
                                    >
                                      <Download className="w-3 h-3" />
                                      {t("client.medicalCards.attachments.downloadAll", { defaultValue: "Скачать всё" })}
                                    </Button>
                                  </div>

                                  {/* X-rays as image thumbnails */}
                                  {xrays.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ImageIcon className="w-3 h-3" /> {t("client.medicalCards.attachments.xrays", { defaultValue: "Рентген-снимки" })}
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        {xrays.map((att: any) => (
                                          <button
                                            key={att.id || att.file}
                                            type="button"
                                            onClick={() => window.open(att.file, "_blank", "noopener,noreferrer")}
                                            className="group relative aspect-square overflow-hidden rounded-lg border bg-black/10"
                                          >
                                            <img
                                              src={att.file}
                                              alt="x-ray"
                                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                              <span className="text-xs font-medium text-white">{t("client.medicalCards.attachments.open", { defaultValue: "Открыть" })}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* PDFs and other files */}
                                  {(prescriptions.length > 0 || others.length > 0) && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <FileText className="w-3 h-3" /> {t("client.medicalCards.attachments.files", { defaultValue: "Файлы" })}
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        {[...prescriptions, ...others].map((att: any) => {
                                          const url: string = att.file || "";
                                          const name = url.split("/").filter(Boolean).slice(-1)[0] || "file";
                                          return (
                                            <button
                                              key={att.id || url}
                                              type="button"
                                              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                                              className="flex w-full items-center justify-between rounded-md border bg-background px-2 py-1.5 text-left hover:bg-muted/80"
                                            >
                                              <span className="truncate pr-2">{name}</span>
                                              <span className="text-[11px] text-primary">
                                                {t("client.medicalCards.attachments.openFile", { defaultValue: "Открыть" })}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Fully Paid Column */}
            <div>
              <h3 className="text-base font-semibold mb-3">Fully Paid</h3>
              <div className="space-y-3">
                {medicalCards.filter((c) => isFullyPaid(c)).map((card) => (
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