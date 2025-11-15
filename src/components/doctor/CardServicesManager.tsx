import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const CardServicesManager = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [cardItems, setCardItems] = useState<any[]>([]);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isMedicationDialogOpen, setIsMedicationDialogOpen] = useState(false);

  const [serviceForm, setServiceForm] = useState({
    service_id: "",
    quantity: 1,
    notes: "",
  });

  const [medicationForm, setMedicationForm] = useState({
    medication_id: "",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

  useEffect(() => {
    if (selectedCard) {
      fetchCardItems();
    }
  }, [selectedCard]);

  const fetchData = async () => {
    const { data: cardsData } = await supabase
      .from("medical_cards")
      .select(`
        *,
        animals (name),
        profiles (full_name)
      `)
      .eq("doctor_id", userId)
      .order("created_at", { ascending: false });

    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true);

    const { data: medicationsData } = await supabase
      .from("medications")
      .select("*")
      .eq("is_active", true);

    setCards(cardsData || []);
    setServices(servicesData || []);
    setMedications(medicationsData || []);
  };

  const fetchCardItems = async () => {
    const [servicesResult, medicationsResult] = await Promise.all([
      supabase
        .from("card_services")
        .select(`
          *,
          services (name, price)
        `)
        .eq("card_id", selectedCard),
      supabase
        .from("card_medications")
        .select(`
          *,
          medications (name, price)
        `)
        .eq("card_id", selectedCard),
    ]);

    const allItems = [
      ...(servicesResult.data || []).map((item) => ({
        ...item,
        type: "service",
        name: item.services?.name,
        base_price: item.services?.price,
      })),
      ...(medicationsResult.data || []).map((item) => ({
        ...item,
        type: "medication",
        name: item.medications?.name,
        base_price: item.medications?.price,
      })),
    ];

    setCardItems(allItems);
  };

  const handleAddService = async () => {
    try {
      const service = services.find((s) => s.id === serviceForm.service_id);
      if (!service) return;

      const { error } = await supabase.from("card_services").insert({
        card_id: selectedCard,
        service_id: serviceForm.service_id,
        quantity: serviceForm.quantity,
        price: service.price,
        executor_id: userId,
        notes: serviceForm.notes,
      });

      if (error) throw error;

      // Update total
      const total = service.price * serviceForm.quantity;
      await updateCardTotal(total);

      toast({
        title: "Успешно!",
        description: "Услуга добавлена в карту",
      });

      setIsServiceDialogOpen(false);
      setServiceForm({ service_id: "", quantity: 1, notes: "" });
      fetchCardItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    }
  };

  const handleAddMedication = async () => {
    try {
      const medication = medications.find((m) => m.id === medicationForm.medication_id);
      if (!medication) return;

      const { error } = await supabase.from("card_medications").insert({
        card_id: selectedCard,
        medication_id: medicationForm.medication_id,
        quantity: medicationForm.quantity,
        price: medication.price,
        executor_id: userId,
        notes: medicationForm.notes,
      });

      if (error) throw error;

      // Update total
      const total = medication.price * medicationForm.quantity;
      await updateCardTotal(total);

      toast({
        title: "Успешно!",
        description: "Препарат добавлен в карту",
      });

      setIsMedicationDialogOpen(false);
      setMedicationForm({ medication_id: "", quantity: 1, notes: "" });
      fetchCardItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    }
  };

  const updateCardTotal = async (additionalAmount: number) => {
    const { data: card } = await supabase
      .from("medical_cards")
      .select("total_amount")
      .eq("id", selectedCard)
      .single();

    if (card) {
      await supabase
        .from("medical_cards")
        .update({ total_amount: Number(card.total_amount) + additionalAmount })
        .eq("id", selectedCard);
    }
  };

  const totalAmount = cardItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Услуги и препараты
        </CardTitle>
        <CardDescription>Добавление услуг и препаратов в медицинскую карту</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Выберите карту</Label>
          <Select value={selectedCard} onValueChange={setSelectedCard}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите медицинскую карту" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.card_number} - {card.animals?.name} ({card.profiles?.full_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCard && (
          <>
            <div className="flex gap-2">
              <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 bg-gradient-hero">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить услугу
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить услугу</DialogTitle>
                    <DialogDescription>Выберите услугу для добавления в карту</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Услуга</Label>
                      <Select
                        value={serviceForm.service_id}
                        onValueChange={(val) => setServiceForm({ ...serviceForm, service_id: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите услугу" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {service.price} ₽
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Количество</Label>
                      <Input
                        type="number"
                        min="1"
                        value={serviceForm.quantity}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, quantity: parseInt(e.target.value) })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Примечания</Label>
                      <Textarea
                        placeholder="Дополнительная информация"
                        value={serviceForm.notes}
                        onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                      />
                    </div>

                    <Button onClick={handleAddService} className="w-full bg-gradient-hero">
                      Добавить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isMedicationDialogOpen} onOpenChange={setIsMedicationDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить препарат
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить препарат</DialogTitle>
                    <DialogDescription>Выберите препарат для добавления в карту</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Препарат</Label>
                      <Select
                        value={medicationForm.medication_id}
                        onValueChange={(val) =>
                          setMedicationForm({ ...medicationForm, medication_id: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите препарат" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications.map((med) => (
                            <SelectItem key={med.id} value={med.id}>
                              {med.name} - {med.price} ₽
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Количество</Label>
                      <Input
                        type="number"
                        min="1"
                        value={medicationForm.quantity}
                        onChange={(e) =>
                          setMedicationForm({ ...medicationForm, quantity: parseInt(e.target.value) })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Примечания</Label>
                      <Textarea
                        placeholder="Дополнительная информация"
                        value={medicationForm.notes}
                        onChange={(e) =>
                          setMedicationForm({ ...medicationForm, notes: e.target.value })
                        }
                      />
                    </div>

                    <Button onClick={handleAddMedication} className="w-full bg-gradient-hero">
                      Добавить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {cardItems.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тип</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardItems.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell className="capitalize">{item.type === "service" ? "Услуга" : "Препарат"}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.price} ₽</TableCell>
                        <TableCell className="font-semibold">
                          {(Number(item.price) * item.quantity).toFixed(2)} ₽
                        </TableCell>
                        <TableCell>{new Date(item.executed_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Итого</p>
                    <p className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)} ₽</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Услуги и препараты не добавлены</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
