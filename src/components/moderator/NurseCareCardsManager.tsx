import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Clients, Nurses, Pets, Services, NurseCareCards } from "@/lib/api";
import { useCreateNurseCareCard, useMe, useRecordNurseCarePayment } from "@/hooks/api";
import { Wallet, PlusCircle, RefreshCcw, ListChecks } from "lucide-react";

export const ModeratorNurseCareCardsManager = () => {
  const { toast } = useToast();
  const { data: me } = useMe();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => cards.find((x) => x.id === selectedId) || null, [cards, selectedId]);

  // Create form state
  const [clientId, setClientId] = useState<string>("");
  const [petId, setPetId] = useState<string>("");
  const [nurseId, setNurseId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const createMutation = useCreateNurseCareCard();
  const paymentMutation = useRecordNurseCarePayment();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CLICK" | "PAYME" | "OTHER" | "">("");

  const loadCards = async () => {
    setLoading(true);
    try {
      const d = await NurseCareCards.list<any>();
      const arr = Array.isArray(d) ? d : (d as any)?.results || [];
      setCards(arr);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to load cards", variant: "destructive" });
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCards(); }, []);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [c, n, s] = await Promise.all([
          Clients.list<any>().catch(() => []),
          Nurses.list<any>().catch(() => []),
          Services.list<any>().catch(() => []),
        ]);
        setClients(Array.isArray(c) ? c : (c as any)?.results || []);
        setNurses(Array.isArray(n) ? n : (n as any)?.results || []);
        setServices(Array.isArray(s) ? s : (s as any)?.results || []);
      } catch {
        setClients([]); setNurses([]); setServices([]);
      }
    };
    loadRefs();
  }, []);

  useEffect(() => {
    const loadPets = async () => {
      if (!clientId) { setPets([]); setPetId(""); return; }
      try {
        const p = await Pets.list<any>({ client: clientId } as any);
        setPets(Array.isArray(p) ? p : (p as any)?.results || []);
      } catch { setPets([]); }
    };
    void loadPets();
  }, [clientId]);

  const toggleService = (id: number) => setServiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    try {
      if (!clientId || !petId || !nurseId) {
        toast({ title: "Missing fields", description: "Select client, pet and nurse", variant: "destructive" });
        return;
      }
      const payload: any = {
        client: Number(clientId),
        pet: Number(petId),
        nurse: Number(nurseId),
        description,
      };
      if (me?.id) payload.created_by = me.id;
      await createMutation.mutateAsync(payload);
      toast({ title: "Created", description: "Nurse care card created" });
      setDescription("");
      await loadCards();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create", variant: "destructive" });
    }
  };

  const handlePayment = async () => {
    if (!selectedId) return;
    if (!paymentAmount || !paymentMethod) {
      toast({ title: "Missing fields", description: "Enter amount and method", variant: "destructive" });
      return;
    }
    try {
      await paymentMutation.mutateAsync({ id: selectedId, amount_paid: paymentAmount, method: paymentMethod });
      toast({ title: "Recorded", description: "Payment recorded" });
      setPaymentAmount("");
      setPaymentMethod("");
      await loadCards();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to record payment", variant: "destructive" });
    }
  };

  const remaining = (c: any) => Math.max(0, Number(c?.total_amount || 0) - Number(c?.amount_paid || 0));

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> Nurse Care Cards</CardTitle>
        <CardDescription>Create cards and record payments.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cards list */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">All Cards</h3>
              <Button size="sm" variant="outline" onClick={loadCards}><RefreshCcw className="w-4 h-4 mr-1" />Refresh</Button>
            </div>
            <div className="border rounded-lg divide-y max-h-[520px] overflow-auto">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : cards.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No cards</div>
              ) : (
                cards.map((c) => (
                  <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left p-3 hover:bg-muted/50 ${selectedId === c.id ? 'bg-muted/60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Card #{c.id}</div>
                      <div className="text-xs text-muted-foreground">{c.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Paid {c.amount_paid} / {c.total_amount} · Remain {remaining(c).toLocaleString("ru-RU")}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Create & Payment panels */}
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            {/* Create */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Create Card</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={(v) => setClientId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.first_name || c.full_name || c.name || `#${c.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Pet</Label>
                  <Select value={petId} onValueChange={(v) => setPetId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                    <SelectContent>
                      {pets.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name || p.nickname || `#${p.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Nurse</Label>
                  <Select value={nurseId} onValueChange={(v) => setNurseId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select nurse" /></SelectTrigger>
                    <SelectContent>
                      {nurses.map((n) => (
                        <SelectItem key={n.id} value={String(n.id)}>{n.full_name || n.first_name ? `${n.first_name ?? ''} ${n.last_name ?? ''}`.trim() : `#${n.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>Create</Button>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Record Payment</h3>
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select a card to record a payment.</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm">Total: {Number(selected.total_amount || 0).toLocaleString("ru-RU")} · Paid: {Number(selected.amount_paid || 0).toLocaleString("ru-RU")} · Remain: {remaining(selected).toLocaleString("ru-RU")}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Amount</Label>
                      <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="e.g. 40000" />
                    </div>
                    <div className="space-y-1">
                      <Label>Method</Label>
                      <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                        <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">CASH</SelectItem>
                          <SelectItem value="CLICK">CLICK</SelectItem>
                          <SelectItem value="PAYME">PAYME</SelectItem>
                          <SelectItem value="OTHER">OTHER</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Button onClick={handlePayment} disabled={paymentMutation.isPending}>Record</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModeratorNurseCareCardsManager;
