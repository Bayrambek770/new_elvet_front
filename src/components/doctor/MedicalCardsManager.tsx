import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Edit, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const MedicalCardsManager = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    owner_id: "",
    animal_id: "",
    anamnesis: "",
    status: "",
    diet: "",
    recommended_feed_text: "",
    recommendations: "",
    is_hospitalized: false,
    hospitalization_start: "",
    hospitalization_end: "",
  });

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, [userId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('medical-cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_cards' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      const { data: cardsData } = await supabase
        .from("medical_cards")
        .select(`
          *,
          animals (name, animal_type),
          profiles!medical_cards_owner_id_fkey (full_name)
        `)
        .eq("doctor_id", userId)
        .order("created_at", { ascending: false });

      const { data: clientsData } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role)")
        .eq("user_roles.role", "client");

      setCards(cardsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, owner_id: clientId, animal_id: "" });
    
    const { data } = await supabase
      .from("animals")
      .select("*")
      .eq("owner_id", clientId);
    
    setAnimals(data || []);
  };

  const handleCreateCard = async () => {
    try {
      const cardNumber = `MC-${Date.now()}`;
      
      const { error } = await supabase.from("medical_cards").insert({
        ...formData,
        card_number: cardNumber,
        doctor_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Медицинская карта создана",
      });

      setIsCreateDialogOpen(false);
      setFormData({
        owner_id: "",
        animal_id: "",
        anamnesis: "",
        status: "",
        diet: "",
        recommended_feed_text: "",
        recommendations: "",
        is_hospitalized: false,
        hospitalization_start: "",
        hospitalization_end: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    }
  };

  const handleUpdateCard = async () => {
    try {
      const { error } = await supabase
        .from("medical_cards")
        .update({
          anamnesis: formData.anamnesis,
          status: formData.status,
          diet: formData.diet,
          recommendations: formData.recommendations,
          recommended_feed_text: formData.recommended_feed_text,
          is_hospitalized: formData.is_hospitalized,
          hospitalization_start: formData.hospitalization_start || null,
          hospitalization_end: formData.hospitalization_end || null,
        })
        .eq("id", selectedCard.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Карта обновлена",
      });

      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    }
  };

  const openEditDialog = (card: any) => {
    setSelectedCard(card);
    setFormData({
      owner_id: card.owner_id,
      animal_id: card.animal_id,
      anamnesis: card.anamnesis || "",
      status: card.status || "",
      diet: card.diet || "",
      recommendations: card.recommendations || "",
      recommended_feed_text: card.recommended_feed_text || "",
      is_hospitalized: card.is_hospitalized,
      hospitalization_start: card.hospitalization_start || "",
      hospitalization_end: card.hospitalization_end || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Медицинские карты
            </CardTitle>
            <CardDescription>Ведение медицинских карт пациентов</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-hero hover:shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                Создать карту
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать медицинскую карту</DialogTitle>
                <DialogDescription>Заполните информацию для новой карты</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Select value={formData.owner_id} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.user_id} value={client.user_id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Животное</Label>
                  <Select value={formData.animal_id} onValueChange={(val) => setFormData({ ...formData, animal_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите животное" />
                    </SelectTrigger>
                    <SelectContent>
                      {animals.map((animal) => (
                        <SelectItem key={animal.id} value={animal.id}>
                          {animal.name} ({animal.animal_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Анамнез</Label>
                  <Textarea
                    placeholder="Описание симптомов и истории болезни"
                    value={formData.anamnesis}
                    onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Анализы</Label>
                  <Textarea
                    placeholder="Общий анализ крови: ..."
                    value={formData.diet}
                    onChange={(e) => setFormData({ ...formData, diet: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Рекомендованный корм</Label>
                  <Textarea
                    placeholder="Например: JOSERA Catelux, 0.5 кг в день на 14 дней"
                    value={formData.recommended_feed_text}
                    onChange={(e) => setFormData({ ...formData, recommended_feed_text: e.target.value })}
                  />
                </div>

                <Button onClick={handleCreateCard} className="w-full bg-gradient-hero">
                  Создать карту
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нет медицинских карт</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер карты</TableHead>
                  <TableHead>Владелец</TableHead>
                  <TableHead>Животное</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Стационар</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono text-sm">{card.card_number}</TableCell>
                    <TableCell>{card.profiles?.full_name}</TableCell>
                    <TableCell>
                      {card.animals?.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({card.animals?.animal_type})
                      </span>
                    </TableCell>
                    <TableCell>{card.status || "-"}</TableCell>
                    <TableCell>
                      {card.is_hospitalized ? (
                        <Badge className="bg-orange-500">В стационаре</Badge>
                      ) : (
                        <Badge variant="outline">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(card.visit_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(card)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать карту {selectedCard?.card_number}</DialogTitle>
              <DialogDescription>Обновите информацию медицинской карты</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Анамнез</Label>
                <Textarea
                  placeholder="Описание симптомов и истории болезни"
                  value={formData.anamnesis}
                  onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Статус</Label>
                <Input
                  placeholder="Текущее состояние"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Диета</Label>
                <Textarea
                  placeholder="Рекомендации по питанию"
                  value={formData.diet}
                  onChange={(e) => setFormData({ ...formData, diet: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Рекомендованный корм</Label>
                <Textarea
                  placeholder="Например: JOSERA Catelux, 0.5 кг в день на 14 дней"
                  value={formData.recommended_feed_text}
                  onChange={(e) => setFormData({ ...formData, recommended_feed_text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Рекомендации</Label>
                <Textarea
                  placeholder="Рекомендации по уходу"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hospitalized"
                  checked={formData.is_hospitalized}
                  onChange={(e) => setFormData({ ...formData, is_hospitalized: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="hospitalized">В стационаре</Label>
              </div>

              {formData.is_hospitalized && (
                <>
                  <div className="space-y-2">
                    <Label>Дата поступления</Label>
                    <Input
                      type="date"
                      min={new Date().toLocaleDateString('en-CA')}
                      value={formData.hospitalization_start}
                      onChange={(e) => setFormData({ ...formData, hospitalization_start: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Дата выписки (планируемая)</Label>
                    <Input
                      type="date"
                      min={new Date().toLocaleDateString('en-CA')}
                      value={formData.hospitalization_end}
                      onChange={(e) => setFormData({ ...formData, hospitalization_end: e.target.value })}
                    />
                  </div>
                </>
              )}

              <Button onClick={handleUpdateCard} className="w-full bg-gradient-hero">
                Сохранить изменения
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
