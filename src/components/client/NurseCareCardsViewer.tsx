import { useMemo } from "react";
import { useNurseCareClient } from "@/hooks/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User as UserIcon, Calendar as CalendarIcon, Wallet, ListChecks } from "lucide-react";

const formatMoney = (value?: string | number | null) => {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ru-RU");
};

const getStatusLabel = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s === "FULLY_PAID" || s === "PAID" || s === "FULL_PAID") return { label: "Fully Paid", variant: "default" as const };
  if (s === "PARTLY_PAID" || s === "PARTLY") return { label: "Partly Paid", variant: "secondary" as const };
  return { label: "Waiting for Payment", variant: "outline" as const };
};

const groupByStatus = (items: any[]) => {
  const waiting = [] as any[];
  const partly = [] as any[];
  const fully = [] as any[];
  for (const it of items) {
    const s = (it?.status || "").toUpperCase();
    if (s === "FULLY_PAID" || s === "PAID" || s === "FULL_PAID") fully.push(it);
    else if (s === "PARTLY_PAID" || s === "PARTLY") partly.push(it);
    else waiting.push(it);
  }
  return { waiting, partly, fully };
};

export const NurseCareCardsViewer = () => {
  const { data, isLoading, isError } = useNurseCareClient();
  const items = Array.isArray(data) ? data : [];
  const grouped = useMemo(() => groupByStatus(items), [items]);

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Nurse Care Cards
        </CardTitle>
        <CardDescription>Read-only view of your nurse care history.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : isError ? (
          <div className="text-center py-12 text-destructive">Failed to load.</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No nurse care cards yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Waiting */}
            <div>
              <h3 className="text-base font-semibold mb-3">Waiting for Payment</h3>
              <div className="space-y-3">
                {grouped.waiting.map((card) => (
                  <div key={card.id} className="rounded-lg border p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Card #{card.id}</div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(card.created_at || card.updated_at || Date.now()).toLocaleString()}</span>
                          <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" />Nurse #{card.nurse}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusLabel(card.status).variant}>{getStatusLabel(card.status).label}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ListChecks className="w-4 h-4" />
                        {(card.services || []).map((s: any) => s.service_name).join(", ") || "No services"}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1"><Wallet className="w-4 h-4" />Total: {formatMoney(card.total_amount)}</div>
                        <div className="flex items-center gap-1">Paid: {formatMoney(card.amount_paid)}</div>
                        <div className="flex items-center gap-1">Remain: {formatMoney(Math.max(0, (Number(card.total_amount||0) - Number(card.amount_paid||0))))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Partly */}
            <div>
              <h3 className="text-base font-semibold mb-3">Partly Paid</h3>
              <div className="space-y-3">
                {grouped.partly.map((card) => (
                  <div key={card.id} className="rounded-lg border p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Card #{card.id}</div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(card.created_at || card.updated_at || Date.now()).toLocaleString()}</span>
                          <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" />Nurse #{card.nurse}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusLabel(card.status).variant}>{getStatusLabel(card.status).label}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ListChecks className="w-4 h-4" />
                        {(card.services || []).map((s: any) => s.service_name).join(", ") || "No services"}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1"><Wallet className="w-4 h-4" />Total: {formatMoney(card.total_amount)}</div>
                        <div className="flex items-center gap-1">Paid: {formatMoney(card.amount_paid)}</div>
                        <div className="flex items-center gap-1">Remain: {formatMoney(Math.max(0, (Number(card.total_amount||0) - Number(card.amount_paid||0))))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Fully */}
            <div>
              <h3 className="text-base font-semibold mb-3">Fully Paid</h3>
              <div className="space-y-3">
                {grouped.fully.map((card) => (
                  <div key={card.id} className="rounded-lg border p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Card #{card.id}</div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(card.created_at || card.updated_at || Date.now()).toLocaleString()}</span>
                          <span className="inline-flex items-center gap-1"><UserIcon className="w-4 h-4" />Nurse #{card.nurse}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusLabel(card.status).variant}>{getStatusLabel(card.status).label}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ListChecks className="w-4 h-4" />
                        {(card.services || []).map((s: any) => s.service_name).join(", ") || "No services"}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1"><Wallet className="w-4 h-4" />Total: {formatMoney(card.total_amount)}</div>
                        <div className="flex items-center gap-1">Paid: {formatMoney(card.amount_paid)}</div>
                        <div className="flex items-center gap-1">Remain: {formatMoney(Math.max(0, (Number(card.total_amount||0) - Number(card.amount_paid||0))))}</div>
                      </div>
                    </div>
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

export default NurseCareCardsViewer;
