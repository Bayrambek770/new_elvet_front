import { useState } from "react";
import { usePetFeeds, useCreateFeedSale, useFeedSales, usePayFeedSale, useMe } from "@/hooks/api";
import FeedSaleDetail from "@/components/moderator/FeedSaleDetail";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type DraftItem = {
  feedId: string;
  quantityKg: string;
};

export const FeedSalesManager = () => {
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data: feeds } = usePetFeeds();
  const { data: sales } = useFeedSales();
  const createSale = useCreateFeedSale();
  const paySale = usePayFeedSale();

  const [clientId, setClientId] = useState("");
  const [petId, setPetId] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ feedId: "", quantityKg: "" }]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [detailSaleId, setDetailSaleId] = useState<number | null>(null);

  const addItemRow = () => setItems([...items, { feedId: "", quantityKg: "" }]);
  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleCreateSale = () => {
    const payloadItems = items
      .filter((it) => it.feedId && it.quantityKg)
      .map((it) => ({ feed: Number(it.feedId), quantity_kg: it.quantityKg }));

    if (!clientId || payloadItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Укажите клиента и хотя бы одну позицию корма",
      });
      return;
    }

    createSale.mutate(
      {
        client: Number(clientId),
        ...(petId ? { pet: Number(petId) } : {}),
        ...(me?.id ? { moderator: Number(me.id) } : {}),
        items: payloadItems,
      },
      {
        onSuccess: () => {
          toast({ title: "Продажа корма создана" });
          setIsDialogOpen(false);
          setClientId("");
          setPetId("");
          setItems([{ feedId: "", quantityKg: "" }]);
        },
        onError: (error: any) => {
          const data = error?.response?.data as any;
          const firstError =
            data?.quantity_kg ||
            data?.amount ||
            data?.detail ||
            "Не удалось создать продажу корма";
          toast({ variant: "destructive", title: "Ошибка", description: String(firstError) });
        },
      }
    );
  };

  const handlePay = () => {
    if (!selectedSaleId || !paymentAmount) return;

    paySale.mutate(
      { id: selectedSaleId, amount: paymentAmount },
      {
        onSuccess: () => {
          toast({ title: "Оплата зафиксирована" });
          setPaymentAmount("");
          setSelectedSaleId(null);
        },
        onError: (error: any) => {
          const data = error?.response?.data as any;
          const firstError = data?.amount || data?.detail || "Не удалось провести оплату";
          toast({ variant: "destructive", title: "Ошибка", description: String(firstError) });
        },
      }
    );
  };

  const computeLineTotal = (item: DraftItem) => {
    const feed = feeds?.find((f: any) => String(f.id) === item.feedId) as any;
    if (!feed || feed.price_per_kg == null) return "";
    const unit = Number(String(feed.price_per_kg).replace(/,/g, "."));
    if (!isFinite(unit) || unit <= 0) return "";
    const qty = Number((item.quantityKg || "0").replace(",", "."));
    if (!isFinite(qty) || qty <= 0) return "";
    return (unit * qty).toFixed(2);
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Продажа кормов</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Новая продажа</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать продажу корма</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID клиента</Label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Например, 42"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID животного</Label>
                  <Input
                    value={petId}
                    onChange={(e) => setPetId(e.target.value)}
                    placeholder="Например, 77"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Позиции</Label>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Корм</Label>
                      <Select
                        value={item.feedId}
                        onValueChange={(val) => updateItem(idx, { feedId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите корм" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeds?.map((f: any) => (
                            <SelectItem key={f.id} value={String(f.id)}>
                              {f.brand_name} {f.product_name} ({f.available_weight_kg} кг)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Кол-во, кг</Label>
                      <Input
                        value={item.quantityKg}
                        onChange={(e) => {
                          const v = e.target.value.replace(",", ".");
                          if (/^\d*(\.\d{0,3})?$/.test(v)) {
                            updateItem(idx, { quantityKg: v });
                          }
                        }}
                        placeholder="0.500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Сумма</Label>
                      <Input value={computeLineTotal(item)} disabled />
                    </div>
                    <div className="flex items-center justify-end pb-1">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addItemRow}>
                  Добавить позицию
                </Button>
              </div>

              <Button className="w-full" onClick={handleCreateSale} disabled={createSale.isPending}>
                Сохранить продажу
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!sales || sales.length === 0 ? (
          <div>Продажи кормов пока не созданы</div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Животное</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Оплачено</TableHead>
                  <TableHead>Итого</TableHead>
                  <TableHead>Оплата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.id}</TableCell>
                    <TableCell>{sale.client}</TableCell>
                    <TableCell>{sale.pet}</TableCell>
                    <TableCell>{sale.status}</TableCell>
                    <TableCell>{sale.amount_paid}</TableCell>
                    <TableCell>{sale.total_amount}</TableCell>
                    <TableCell>
                      {sale.status === "PAID" ? (
                        <span className="text-xs text-muted-foreground">Оплачено полностью</span>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            className="h-8 w-24"
                            placeholder="Сумма"
                            value={selectedSaleId === sale.id ? paymentAmount : ""}
                            onChange={(e) => {
                              setSelectedSaleId(sale.id);
                              setPaymentAmount(e.target.value);
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={handlePay}
                            disabled={paySale.isPending || selectedSaleId !== sale.id}
                          >
                            Оплатить
                          </Button>
                        </div>
                      )}
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailSaleId(sale.id)}
                        >
                          Детали
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {detailSaleId && (
              <FeedSaleDetail saleId={detailSaleId} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedSalesManager;
