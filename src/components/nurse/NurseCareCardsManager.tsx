import { useEffect, useMemo, useState } from "react";
import { useNurseCareMine, useUpdateNurseCareInfo } from "@/hooks/api";
import { Services } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, Pencil, Save, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const NurseCareCardsManager = () => {
  const { data, isLoading, refetch } = useNurseCareMine();
  const items = Array.isArray(data) ? data : [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => items.find((x: any) => x.id === selectedId) || null, [items, selectedId]);
  const [description, setDescription] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const { toast } = useToast();
  const updateInfo = useUpdateNurseCareInfo();

  useEffect(() => {
    const load = async () => {
      try {
        const s = await Services.list<any>();
        const arr = Array.isArray(s) ? s : (s as any)?.results || [];
        setServices(arr);
      } catch {
        setServices([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDescription(selected?.description || "");
    setServiceIds((selected?.services || []).map((s: any) => s.service));
  }, [selectedId]);

  const toggleService = (id: number) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      await updateInfo.mutateAsync({ id: selectedId, payload: { description, service_ids: serviceIds } });
      toast({ title: "Saved", description: "Card updated successfully" });
      await refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to update", variant: "destructive" });
    }
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> My Nurse Care Cards</CardTitle>
        <CardDescription>Update description and service set. Payments are managed by moderators.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cards</h3>
              <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCcw className="w-4 h-4 mr-1" />Refresh</Button>
            </div>
            <div className="border rounded-lg divide-y max-h-[420px] overflow-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No cards yet.</div>
              ) : (
                items.map((c: any) => (
                  <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left p-3 hover:bg-muted/50 ${selectedId === c.id ? 'bg-muted/60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Card #{c.id}</div>
                      <div className="text-xs text-muted-foreground">{(c.services || []).length} services</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Paid {c.amount_paid} / {c.total_amount}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Selected</h3>
            {!selected ? (
              <div className="p-4 border rounded-lg text-sm text-muted-foreground">Select a card on the left to edit.</div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Update description" />
                </div>
                <div className="space-y-2">
                  <Label>Services</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-auto p-2 border rounded-lg">
                    {services.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={serviceIds.includes(s.id)} onCheckedChange={() => toggleService(Number(s.id))} />
                        <span>{s.service_name || s.name || `#${s.id}`}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={updateInfo.isPending}><Save className="w-4 h-4 mr-1" /> Save</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NurseCareCardsManager;
