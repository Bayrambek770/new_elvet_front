import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const AllMedicalCards = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);

  useEffect(() => {
    // Supabase removed. TODO: Load via DRF medical-cards/ endpoint.
    setLoading(false);
  }, []);

  const fetchCards = async () => {
    // Placeholder: no-op without Supabase
    setLoading(false);
  };

  const viewCardDetails = async (card: any) => {
    setSelectedCard(card);
    setServices([]);
    setMedications([]);
  };

  const filteredCards = cards.filter(
    (card) =>
      card.card_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.animals?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card className="border-2 hover:shadow-glow transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Все медицинские карты
          </CardTitle>
          <CardDescription>
            Просмотр всех медицинских карт в системе
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру карты, питомцу или владельцу..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Загрузка...
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Медицинские карты не найдены</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№ Карты</TableHead>
                    <TableHead>Питомец</TableHead>
                    <TableHead>Владелец</TableHead>
                    <TableHead>Врач</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium">{card.card_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{card.animals?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {card.animals?.animal_type}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{card.profiles?.full_name}</TableCell>
                      <TableCell className="text-sm">
                        {card.profiles?.full_name || "-"}
                      </TableCell>
                      <TableCell>
                        {card.is_hospitalized ? (
                          <Badge variant="destructive">Стационар</Badge>
                        ) : (
                          <Badge variant="outline">{card.status || "Активна"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{card.total_amount} сум</p>
                          <Badge variant={card.is_paid ? "default" : "secondary"} className="text-xs">
                            {card.is_paid ? "Оплачено" : "Не оплачено"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewCardDetails(card)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Просмотр
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Медицинская карта #{selectedCard?.card_number}
            </DialogTitle>
            <DialogDescription>
              Детальная информация о медицинской карте
            </DialogDescription>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Питомец</p>
                  <p className="text-lg font-semibold">
                    {selectedCard.animals?.name} ({selectedCard.animals?.animal_type})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Владелец</p>
                  <p className="text-lg font-semibold">{selectedCard.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Врач</p>
                  <p className="text-lg font-semibold">
                    {selectedCard.profiles?.full_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Статус</p>
                  <p className="text-lg font-semibold">{selectedCard.status || "Активна"}</p>
                </div>
              </div>

              {selectedCard.anamnesis && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Анамнез</p>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm">{selectedCard.anamnesis}</p>
                  </div>
                </div>
              )}

              {selectedCard.is_hospitalized && (
                <div className="p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
                  <p className="font-semibold text-destructive mb-2">Стационарное лечение</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Начало:</span>{" "}
                      {selectedCard.hospitalization_start
                        ? new Date(selectedCard.hospitalization_start).toLocaleDateString("ru-RU")
                        : "-"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Окончание:</span>{" "}
                      {selectedCard.hospitalization_end
                        ? new Date(selectedCard.hospitalization_end).toLocaleDateString("ru-RU")
                        : "-"}
                    </p>
                  </div>
                  {selectedCard.diet && (
                    <div className="mt-2">
                      <p className="text-muted-foreground text-xs">Диета:</p>
                      <p className="text-sm">{selectedCard.diet}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-3">Услуги ({services.length})</h3>
                {services.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Услуг пока нет</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Услуга</TableHead>
                          <TableHead>Количество</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Сумма</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell>{service.services?.name}</TableCell>
                            <TableCell>{service.quantity}</TableCell>
                            <TableCell>{service.price} сум</TableCell>
                            <TableCell className="font-semibold">
                              {service.quantity * service.price} сум
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Препараты ({medications.length})</h3>
                {medications.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Препаратов пока нет</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Препарат</TableHead>
                          <TableHead>Количество</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Сумма</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medications.map((med) => (
                          <TableRow key={med.id}>
                            <TableCell>{med.medications?.name}</TableCell>
                            <TableCell>{med.quantity}</TableCell>
                            <TableCell>{med.price} сум</TableCell>
                            <TableCell className="font-semibold">
                              {med.quantity * med.price} сум
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">Итого:</p>
                  <p className="text-2xl font-bold text-primary">{selectedCard.total_amount} сум</p>
                </div>
                <div className="mt-2">
                  <Badge variant={selectedCard.is_paid ? "default" : "secondary"} className="text-sm">
                    {selectedCard.is_paid ? "Оплачено" : "Ожидает оплаты"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
