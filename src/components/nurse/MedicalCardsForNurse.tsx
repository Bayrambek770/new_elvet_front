import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MedicalCards } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Loader2, 
  RefreshCcw, 
  Search,
  PlusCircle,
  X
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskCreationFromCardModal } from "./TaskCreationFromCardModal";

type MedicalCard = {
  id: number;
  client: number | { id: number; full_name?: string; first_name?: string; last_name?: string };
  pet: number | { id: number; name?: string; nickname?: string };
  doctor: number | { id: number; full_name?: string; first_name?: string; last_name?: string };
  assigned_nurse?: number | { id: number; full_name?: string; first_name?: string; last_name?: string };
  diagnosis?: string;
  status: string;
  total_fee?: string;
  created_at?: string;
  service_usages?: any[];
  medicine_usages?: any[];
};

export const MedicalCardsForNurse = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<MedicalCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<MedicalCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<MedicalCard | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MedicalCards.list<any>();
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      setCards(arr);
      setFilteredCards(arr);
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error?.response?.data?.detail || error?.message || "Failed to load medical cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Apply filters whenever cards or filter values change
  useEffect(() => {
    let filtered = [...cards];

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((card) => {
        const status = (card.status || "").toString().toUpperCase();
        return status === statusFilter;
      });
    }

    // Search filter (search in client name, pet name, diagnosis)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((card) => {
        const clientName = typeof card.client === "object" 
          ? (card.client.full_name || `${card.client.first_name || ""} ${card.client.last_name || ""}`.trim())
          : "";
        const petName = typeof card.pet === "object" ? (card.pet.name || card.pet.nickname || "") : "";
        const diagnosis = card.diagnosis || "";
        
        return (
          clientName.toLowerCase().includes(query) ||
          petName.toLowerCase().includes(query) ||
          diagnosis.toLowerCase().includes(query) ||
          String(card.id).includes(query)
        );
      });
    }

    setFilteredCards(filtered);
  }, [cards, statusFilter, searchQuery]);

  const getClientName = (card: MedicalCard) => {
    if (typeof card.client === "object") {
      return card.client.full_name || `${card.client.first_name || ""} ${card.client.last_name || ""}`.trim() || "—";
    }
    return card.client || "—";
  };

  const getPetName = (card: MedicalCard) => {
    if (typeof card.pet === "object") {
      return card.pet.name || card.pet.nickname || "—";
    }
    return card.pet || "—";
  };

  const getAssignedNurseName = (card: MedicalCard) => {
    if (!card.assigned_nurse) return "—";
    if (typeof card.assigned_nurse === "object") {
      return card.assigned_nurse.full_name || `${card.assigned_nurse.first_name || ""} ${card.assigned_nurse.last_name || ""}`.trim() || "—";
    }
    return `Nurse #${card.assigned_nurse}`;
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = (status || "").toString().toUpperCase();
    
    if (statusUpper === "FULLY_PAID" || statusUpper === "PAID") {
      return <Badge className="bg-green-500 text-white">Paid</Badge>;
    }
    if (statusUpper === "PARTLY_PAID") {
      return <Badge className="bg-yellow-500 text-white">Partly Paid</Badge>;
    }
    return <Badge variant="destructive">Waiting</Badge>;
  };

  const handleViewCard = async (card: MedicalCard) => {
    setSelectedCard(card);
    setDetailDialogOpen(true);
  };

  const handleCreateTask = () => {
    if (!selectedCard) return;
    setDetailDialogOpen(false);
    setTaskModalOpen(true);
  };

  const handleTaskCreated = () => {
    setTaskModalOpen(false);
    setSelectedCard(null);
    toast({
      title: "Task Created",
      description: "The task has been successfully created and assigned to you.",
    });
  };

  return (
    <>
      <Card className="border-2 hover:shadow-glow transition-all">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Medical Cards
              </CardTitle>
              <CardDescription>
                View medical cards and create tasks from prescribed services
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCards}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, client, pet, or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="WAITING_FOR_PAYMENT">Waiting</SelectItem>
                <SelectItem value="PARTLY_PAID">Partly Paid</SelectItem>
                <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards Grid */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{cards.length === 0 ? "No medical cards found" : "No cards match your filters"}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCards.map((card) => (
                  <Card key={card.id} className="hover:shadow-lg transition-shadow border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">Card #{card.id}</CardTitle>
                            {getStatusBadge(card.status)}
                          </div>
                          <CardDescription className="text-xs text-muted-foreground">
                            {card.created_at ? new Date(card.created_at).toLocaleDateString() : "—"}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Names Grid */}
                      <div className="space-y-2">
                        <div className="rounded-lg bg-primary/5 p-2.5">
                          <p className="text-xs text-muted-foreground">Pet Name</p>
                          <p className="text-sm font-semibold mt-0.5">{getPetName(card)}</p>
                        </div>
                        <div className="rounded-lg bg-primary/5 p-2.5">
                          <p className="text-xs text-muted-foreground">Client Name</p>
                          <p className="text-sm font-semibold mt-0.5">{getClientName(card)}</p>
                        </div>
                        <div className="rounded-lg bg-primary/5 p-2.5">
                          <p className="text-xs text-muted-foreground">Assigned Nurse</p>
                          <p className="text-sm font-semibold mt-0.5">{getAssignedNurseName(card)}</p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Diagnosis */}
                      {card.diagnosis && (
                        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                          <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                          <p className="text-sm font-medium">{card.diagnosis}</p>
                        </div>
                      )}
                      
                      {/* Services and Medicines Count */}
                      <div className="flex gap-3 text-xs">
                        {card.service_usages && card.service_usages.length > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{card.service_usages.length} service(s)</span>
                          </div>
                        )}
                        {card.medicine_usages && card.medicine_usages.length > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>{card.medicine_usages.length} medicine(s)</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCard(card)}
                          className="flex-1"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(card);
                            setTaskModalOpen(true);
                          }}
                          className="flex-1 gap-2"
                          disabled={!card.service_usages || card.service_usages.length === 0}
                        >
                          <PlusCircle className="w-4 h-4" />
                          Create Task
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Medical Card #{selectedCard?.id}
            </DialogTitle>
            <DialogDescription>
              View card details and prescribed services
            </DialogDescription>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="text-base font-semibold">{getClientName(selectedCard)}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm text-muted-foreground">Pet</p>
                  <p className="text-base font-semibold">{getPetName(selectedCard)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm text-muted-foreground">Diagnosis</p>
                  <p className="text-base font-semibold">{selectedCard.diagnosis || "—"}</p>
                </div>
                <div className="rounded-lg border bg-primary/10 p-3">
                  <p className="text-sm text-muted-foreground">Assigned Nurse</p>
                  <p className="text-base font-semibold">{getAssignedNurseName(selectedCard)}</p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-2">{getStatusBadge(selectedCard.status)}</div>
              </div>

              {/* Service Usages */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  Prescribed Services
                  {selectedCard.service_usages && selectedCard.service_usages.length > 0 && (
                    <Badge variant="outline">{selectedCard.service_usages.length}</Badge>
                  )}
                </h3>
                {!selectedCard.service_usages || selectedCard.service_usages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services prescribed</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCard.service_usages.map((usage: any, idx: number) => (
                      <div key={idx} className="rounded-lg border p-3 bg-muted/20">
                        <p className="font-medium">
                          {usage.service_name || usage.service?.name || usage.service || "—"}
                        </p>
                        {usage.description && (
                          <p className="text-sm text-muted-foreground mt-1">{usage.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Quantity: {usage.quantity || 1}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medicines */}
              {selectedCard.medicine_usages && selectedCard.medicine_usages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    Prescribed Medicines
                    <Badge variant="outline">{selectedCard.medicine_usages.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {selectedCard.medicine_usages.map((usage: any, idx: number) => (
                      <div key={idx} className="rounded-lg border p-3 bg-muted/20">
                        <p className="font-medium">
                          {usage.name || "—"}
                        </p>
                        {usage.dosage && (
                          <p className="text-sm text-muted-foreground mt-1">Dosage: {usage.dosage}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Quantity: {usage.quantity || 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Creation Modal */}
      {selectedCard && (
        <TaskCreationFromCardModal
          open={taskModalOpen}
          onOpenChange={setTaskModalOpen}
          medicalCard={selectedCard}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </>
  );
};
