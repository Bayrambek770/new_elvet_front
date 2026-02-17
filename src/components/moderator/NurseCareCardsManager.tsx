import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Clients, Nurses, Pets, NurseCareCards } from "@/lib/api";
import { useCreateNurseCareCard, useMe, useRecordNurseCarePayment } from "@/hooks/api";
import { Wallet, PlusCircle, RefreshCcw, ListChecks, Heart, Loader2 } from "lucide-react";
import { SearchableCombobox, type ComboboxItem } from "@/components/ui/SearchableCombobox";

export const ModeratorNurseCareCardsManager = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: me } = useMe();

  // Cards list
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => cards.find((x) => x.id === selectedId) || null, [cards, selectedId]);

  // Create form state
  const [clientId, setClientId] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [nurseId, setNurseId] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // Client search state
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientItems, setClientItems] = useState<ComboboxItem[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);

  // Nurse and pet data
  const [nurses, setNurses] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [refLoading, setRefLoading] = useState(false);

  const createMutation = useCreateNurseCareCard();
  const paymentMutation = useRecordNurseCarePayment();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "">("");

  // Load cards
  const loadCards = async () => {
    setLoading(true);
    try {
      const d = await NurseCareCards.list<any>();
      const arr = Array.isArray(d) ? d : (d as any)?.results || [];
      setCards(arr);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e?.message || t("moderator.nurseCare.errors.loadFailed"), variant: "destructive" });
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  // Load nurses on mount
  useEffect(() => {
    const loadRefs = async () => {
      setRefLoading(true);
      try {
        const n = await Nurses.list<any>().catch(() => []);
        setNurses(Array.isArray(n) ? n : (n as any)?.results || []);
      } catch {
        setNurses([]);
      } finally {
        setRefLoading(false);
      }
    };
    void loadCards();
    void loadRefs();
  }, []);

  // Client searchable combobox
  const searchClients = useCallback(async (query: string) => {
    setClientSearchLoading(true);
    try {
      const params: Record<string, any> = { page_size: 20 };
      if (query.trim()) params.name = query.trim();
      const data = await Clients.list<any>(params as any);
      const results: any[] = Array.isArray(data) ? data : (data as any)?.results || [];
      setClientItems(results.map((c: any) => ({
        id: c.id,
        label: [c.full_name, c.name, c.username, [c.first_name, c.last_name].filter(Boolean).join(" ")].find((v) => v && String(v).trim()) || `#${c.id}`,
      })));
    } catch {
      setClientItems([]);
    } finally {
      setClientSearchLoading(false);
    }
  }, []);

  // Debounced client search
  useEffect(() => {
    const timer = setTimeout(() => { void searchClients(clientSearchQuery); }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchQuery, searchClients]);

  // Load pets when client selected
  useEffect(() => {
    setPetId(null);
    setPets([]);
    if (!clientId) return;
    setPetsLoading(true);
    Pets.list<any>({ client: clientId } as any)
      .then((p) => setPets(Array.isArray(p) ? p : (p as any)?.results || []))
      .catch(() => setPets([]))
      .finally(() => setPetsLoading(false));
  }, [clientId]);

  const handleCreate = async () => {
    if (!clientId || !nurseId) {
      toast({ title: t("moderator.nurseCare.errors.missingFields"), description: t("moderator.nurseCare.errors.selectClientPetNurse"), variant: "destructive" });
      return;
    }
    try {
      const payload: any = {
        client: Number(clientId),
        nurse: Number(nurseId),
        description,
      };
      if (petId) payload.pet = Number(petId);
      if (me?.id) payload.created_by = me.id;
      await createMutation.mutateAsync(payload);
      toast({ title: t("moderator.nurseCare.success.created"), description: t("moderator.nurseCare.success.createdDesc") });
      setClientId(null);
      setPetId(null);
      setNurseId(null);
      setDescription("");
      await loadCards();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e?.message || t("moderator.nurseCare.errors.createFailed"), variant: "destructive" });
    }
  };

  const handlePayment = async () => {
    if (!selectedId) return;
    if (!paymentAmount || !paymentMethod) {
      toast({ title: t("moderator.nurseCare.errors.missingFields"), description: t("moderator.nurseCare.errors.enterAmountMethod"), variant: "destructive" });
      return;
    }
    try {
      await paymentMutation.mutateAsync({ id: selectedId, amount_paid: paymentAmount, method: paymentMethod });
      toast({ title: t("moderator.nurseCare.success.recorded"), description: t("moderator.nurseCare.success.recordedDesc") });
      setPaymentAmount("");
      setPaymentMethod("");
      await loadCards();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e?.message || t("moderator.nurseCare.errors.recordFailed"), variant: "destructive" });
    }
  };

  const remaining = (c: any) => Math.max(0, Number(c?.total_amount || 0) - Number(c?.amount_paid || 0));

  const nurseItems: ComboboxItem[] = nurses.map((n) => ({
    id: n.id,
    label: n.full_name || ([n.first_name, n.last_name].filter(Boolean).join(" ").trim()) || `#${n.id}`,
  }));

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "FULLY_PAID") return <Badge className="bg-green-100 text-green-700 text-xs">{t("client.nurseCare.status.fullyPaid")}</Badge>;
    if (s === "PARTLY_PAID") return <Badge className="bg-yellow-100 text-yellow-700 text-xs">{t("client.nurseCare.status.partlyPaid")}</Badge>;
    return <Badge className="bg-red-100 text-red-700 text-xs">{t("client.nurseCare.status.waiting")}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Section A: Create Card ── */}
      <Card className="border-2 hover:shadow-glow transition-all bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            {t("moderator.nurseCare.createCard")}
          </CardTitle>
          <CardDescription>{t("moderator.nurseCare.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Row 1: Client + Nurse */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {t("moderator.nurseCare.client")} <span className="text-destructive">*</span>
              </Label>
              <SearchableCombobox
                value={clientId}
                onChange={(v) => setClientId(v ? String(v) : null)}
                items={clientItems}
                placeholder={t("moderator.nurseCare.selectClient")}
                searchPlaceholder={t("common.search")}
                emptyText={t("common.nothingFound")}
                onSearch={setClientSearchQuery}
                loading={clientSearchLoading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {t("moderator.nurseCare.nurse")} <span className="text-destructive">*</span>
              </Label>
              <SearchableCombobox
                value={nurseId}
                onChange={(v) => setNurseId(v ? String(v) : null)}
                items={nurseItems}
                placeholder={t("moderator.nurseCare.selectNurse")}
                searchPlaceholder={t("common.search")}
                emptyText={t("common.nothingFound")}
                loading={refLoading}
              />
            </div>
          </div>

          {/* Row 2: Pet (optional, conditional) */}
          {clientId && (
            <div className="max-w-sm space-y-2 animate-fade-in">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Heart className="w-4 h-4 text-rose-500" />
                {t("moderator.nurseCare.pet")}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({t("common.optional", "необязательно")})
                </span>
              </Label>
              <Select
                value={petId ?? ""}
                onValueChange={(v) => setPetId(v === "__none__" ? null : v)}
                disabled={petsLoading}
              >
                <SelectTrigger className={petsLoading ? "opacity-60" : ""}>
                  <SelectValue placeholder={
                    petsLoading
                      ? t("common.loading")
                      : t("moderator.nurseCare.selectPet")
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    — {t("common.optional", "без питомца")} —
                  </SelectItem>
                  {pets.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name || p.nickname || `#${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pets.length === 0 && !petsLoading && (
                <p className="text-xs text-muted-foreground italic">
                  {t("moderator.nurseCare.noPetsForClient", "Нет питомцев для этого клиента")}
                </p>
              )}
            </div>
          )}

          {/* Helper text when no client selected */}
          {!clientId && (
            <div className="max-w-sm p-3 rounded-lg bg-muted/50 border border-dashed">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Heart className="w-4 h-4 text-muted-foreground/60" />
                {t("moderator.nurseCare.selectClientFirst", "Выберите клиента, чтобы добавить питомца")}
              </p>
            </div>
          )}

          {/* Row 3: Description */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {t("moderator.nurseCare.descriptionLabel")}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({t("common.optional", "необязательно")})
              </span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("moderator.nurseCare.descriptionPlaceholder")}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="gap-2 hover-scale"
              size="lg"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              {t("moderator.nurseCare.create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Section B: Cards List + Payment ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cards list */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="w-4 h-4 text-primary" />
                {t("moderator.nurseCare.allCards")}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={loadCards} disabled={loading} className="gap-1">
                <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                {t("moderator.nurseCare.refresh")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[480px] overflow-auto rounded-b-lg">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : cards.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("moderator.nurseCare.noCards")}
                </div>
              ) : (
                cards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedId === c.id ? "bg-primary/5 border-l-4 border-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{t("moderator.nurseCare.cardNumber", { id: c.id })}</span>
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("moderator.nurseCare.paidInfo", {
                        paid: Number(c.amount_paid || 0).toLocaleString("ru-RU"),
                        total: Number(c.total_amount || 0).toLocaleString("ru-RU"),
                        remain: remaining(c).toLocaleString("ru-RU"),
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment panel */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-4 h-4 text-primary" />
              {t("moderator.nurseCare.recordPayment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                <Wallet className="w-10 h-10 opacity-30" />
                <p className="text-sm">{t("moderator.nurseCare.selectCardMessage")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("moderator.nurseCare.total")}</p>
                    <p className="font-bold text-sm">{Number(selected.total_amount || 0).toLocaleString("ru-RU")}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("moderator.nurseCare.paid")}</p>
                    <p className="font-bold text-sm text-green-600">{Number(selected.amount_paid || 0).toLocaleString("ru-RU")}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t("moderator.nurseCare.remain")}</p>
                    <p className="font-bold text-sm text-orange-600">{remaining(selected).toLocaleString("ru-RU")}</p>
                  </div>
                </div>

                {/* Progress */}
                {Number(selected.total_amount || 0) > 0 && (
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-green-500 transition-all"
                      style={{ width: `${Math.min(100, (Number(selected.amount_paid || 0) / Number(selected.total_amount || 1)) * 100)}%` }}
                    />
                  </div>
                )}

                {/* Payment form */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("moderator.nurseCare.amount")}</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={t("moderator.nurseCare.amountPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("moderator.nurseCare.method")}</Label>
                    <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("moderator.nurseCare.selectMethod")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">{t("moderator.card.modal.paymentMethod.cash")}</SelectItem>
                        <SelectItem value="CARD">{t("moderator.card.modal.paymentMethod.card")}</SelectItem>
                        <SelectItem value="TRANSFER">{t("moderator.card.modal.paymentMethod.transfer")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handlePayment}
                    disabled={paymentMutation.isPending}
                    className="w-full gap-2"
                  >
                    {paymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    {t("moderator.nurseCare.record")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModeratorNurseCareCardsManager;
