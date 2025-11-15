import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Eye, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Client {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  client_id: string | null;
  created_at: string;
}

export const ClientsManager = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [animals, setAnimals] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    // Supabase removed. TODO: Load via DRF clients/ endpoint.
    setLoading(false);
  }, []);

  const fetchClients = async () => {
    // Placeholder: no-op without Supabase
    setLoading(false);
  };

  const viewClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setAnimals([]);
    setCards([]);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm) ||
      client.client_id?.includes(searchTerm)
  );

  return (
    <>
      <Card className="border-2 hover:shadow-glow transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Управление клиентами
          </CardTitle>
          <CardDescription>
            Просмотр и управление клиентской базой
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, телефону или ID..."
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
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Клиенты не найдены</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>ID клиента</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {client.phone || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.client_id || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewClientDetails(client)}
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

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Информация о клиенте
            </DialogTitle>
            <DialogDescription>
              Детальная информация о клиенте и его питомцах
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ФИО</p>
                  <p className="text-lg font-semibold">{selectedClient.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Телефон</p>
                  <p className="text-lg font-semibold">{selectedClient.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID клиента</p>
                  <p className="text-lg font-semibold">{selectedClient.client_id || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Дата регистрации</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedClient.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Питомцы ({animals.length})</h3>
                {animals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">У клиента пока нет питомцев</p>
                ) : (
                  <div className="space-y-2">
                    {animals.map((animal) => (
                      <div
                        key={animal.id}
                        className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{animal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {animal.animal_type} • {animal.breed || "Порода не указана"}
                          </p>
                        </div>
                        <Badge>{animal.animal_type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Медицинские карты ({cards.length})</h3>
                {cards.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Медицинских карт пока нет</p>
                ) : (
                  <div className="space-y-2">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Карта #{card.card_number}</p>
                          <Badge variant={card.is_hospitalized ? "destructive" : "outline"}>
                            {card.is_hospitalized ? "Стационар" : card.status || "Активна"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Питомец: {card.animals?.name} ({card.animals?.animal_type})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Сумма: {card.total_amount} сум • {card.is_paid ? "Оплачено" : "Не оплачено"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
