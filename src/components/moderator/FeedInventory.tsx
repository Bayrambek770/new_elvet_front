import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePetFeeds } from "@/hooks/api";

export const FeedInventory = () => {
  const { data: feeds, isLoading, error } = usePetFeeds();

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Склад кормов</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Загрузка...</div>
        ) : error ? (
          <div className="text-red-500">Ошибка загрузки кормов</div>
        ) : !feeds || feeds.length === 0 ? (
          <div>Нет данных по кормам</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Бренд</TableHead>
                <TableHead>Продукт</TableHead>
                <TableHead>Производитель</TableHead>
                <TableHead>Животное</TableHead>
                <TableHead>Возраст</TableHead>
                <TableHead>Вес упаковки, кг</TableHead>
                <TableHead>Цена за кг</TableHead>
                <TableHead>Доступно, кг</TableHead>
                <TableHead>Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeds.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell>{f.name || `${f.brand_name} ${f.product_name}`}</TableCell>
                  <TableCell>{f.brand_name}</TableCell>
                  <TableCell>{f.product_name}</TableCell>
                  <TableCell>{f.factory_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{f.animal_type === "DOG" ? "Собака" : "Кошка"}</Badge>
                  </TableCell>
                  <TableCell>{f.age_group}</TableCell>
                  <TableCell>{f.package_weight_kg}</TableCell>
                  <TableCell>{f.price_per_kg}</TableCell>
                  <TableCell>{f.available_weight_kg}</TableCell>
                  <TableCell className="max-w-[240px] truncate" title={f.description || ""}>{f.description || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedInventory;
