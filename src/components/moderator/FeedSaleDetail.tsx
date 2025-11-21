import { useState } from "react";
import { useFeedSale, usePayFeedSale } from "@/hooks/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const FeedSaleDetail = ({ saleId }: { saleId: number | string }) => {
  const { data: sale, isLoading, error } = useFeedSale(saleId);
  const payMutation = usePayFeedSale();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  const outstanding = sale ? Number(sale.total_amount) - Number(sale.amount_paid) : 0;

  const handlePay = () => {
    if (!sale || !amount) return;

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "Неверная сумма", description: "Введите положительное число" });
      return;
    }

    if (numericAmount > outstanding) {
      toast({
        variant: "destructive",
        title: "Слишком большая сумма",
        description: `Остаток к оплате: ${outstanding.toFixed(2)}`,
      });
      return;
    }
    payMutation.mutate(
      { id: Number(sale.id), amount: numericAmount.toFixed(2) },
      {
        onSuccess: () => {
          toast({ title: "Оплата добавлена" });
          setAmount("");
        },
        onError: (err: any) => {
          const data = err?.response?.data;
          const msg = data?.amount || data?.detail || "Ошибка оплаты";
          toast({ variant: "destructive", title: "Ошибка", description: String(msg) });
        },
      }
    );
  };

  const statusBadge = (s?: string) => {
    const st = (s || "").toUpperCase();
    const variant = st === "PAID" ? "default" : st === "PARTLY_PAID" ? "secondary" : "outline";
    return <Badge variant={variant}>{st || "WAITING"}</Badge>;
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Продажа корма #{saleId}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Загрузка...</div>
        ) : error ? (
          <div className="text-red-500">Не удалось загрузить продажу</div>
        ) : !sale ? (
          <div>Продажа не найдена</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Клиент</span>
                <span className="font-medium">{sale.client}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Животное</span>
                <span className="font-medium">{sale.pet}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Модератор</span>
                <span className="font-medium">{sale.moderator}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Статус</span>
                {statusBadge(sale.status)}
              </div>
              <div>
                <span className="text-muted-foreground block">Итого</span>
                <span className="font-medium">{sale.total_amount}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Оплачено</span>
                <span className="font-medium">{sale.amount_paid}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Остаток</span>
                <span className="font-medium">{outstanding}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Создано</span>
                <span className="font-medium">{new Date(sale.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Позиции</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Корм</TableHead>
                    <TableHead>Кол-во (кг)</TableHead>
                    <TableHead>Цена за кг</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.id}</TableCell>
                      <TableCell>{it.feed}</TableCell>
                      <TableCell>{it.quantity_kg}</TableCell>
                      <TableCell>{it.unit_price}</TableCell>
                      <TableCell>{it.line_total}</TableCell>
                      <TableCell>{new Date(it.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {sale.status !== "PAID" && (
              <div className="space-y-2">
                <h3 className="font-semibold">Добавить оплату</h3>
                <div className="flex gap-2 items-end">
                  <Input
                    placeholder="Сумма"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-40"
                  />
                  <Button onClick={handlePay} disabled={payMutation.isPending || !amount}>Оплатить</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedSaleDetail;
