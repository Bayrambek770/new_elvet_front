import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCreateTaskFromMedicalCard } from "@/hooks/api";
import { useQuery } from "@tanstack/react-query";
import { Services } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MedicalCard = {
  id: number;
  client: { full_name?: string; first_name?: string; last_name?: string };
  pet: { name?: string };
};

type TaskCreationFromCardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalCard: MedicalCard;
  onTaskCreated?: () => void;
};

export const TaskCreationFromCardModal = ({
  open,
  onOpenChange,
  medicalCard,
  onTaskCreated,
}: TaskCreationFromCardModalProps) => {
  const { toast } = useToast();
  const createTask = useCreateTaskFromMedicalCard();
  
  // Fetch all services for selection
  const { data: servicesResponse, isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => Services.list(),
  });

  // Extract array from paginated response
  const servicesData = Array.isArray(servicesResponse) 
    ? servicesResponse 
    : (servicesResponse as any)?.results || [];

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [procedureDate, setProcedureDate] = useState("");

  // Default date to today
  useEffect(() => {
    if (open) {
      const today = new Date();
      const formattedDate = today.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      setProcedureDate(formattedDate);
    }
  }, [open]);

  // Filter services by search
  const filteredServices = servicesData.filter((service: any) =>
    service.name?.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServiceId) {
      toast({
        title: "Validation Error",
        description: "Please select a service",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTask.mutateAsync({
        medical_card: medicalCard.id,
        service: selectedServiceId,
        datetime: procedureDate,
      });

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      // Reset form
      setSelectedServiceId("");
      setServiceSearch("");

      // Call success callback
      onTaskCreated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.detail || error?.message || "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const getClientName = () => {
    const client = medicalCard.client;
    return client.full_name || `${client.first_name || ""} ${client.last_name || ""}`.trim() || "—";
  };

  const getPetName = () => {
    return medicalCard.pet?.name || "—";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PlusCircle className="w-5 h-5 text-primary" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            Create a procedure task from this medical card
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medical Card Info (Read-only) */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Client:</span>
              <span className="font-semibold">{getClientName()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Pet:</span>
              <span className="font-semibold">{getPetName()}</span>
            </div>
          </div>

          {/* Service Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="service" className="text-base font-semibold">
              Service *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Select
              value={selectedServiceId}
              onValueChange={setSelectedServiceId}
              disabled={servicesLoading}
            >
              <SelectTrigger id="service" className="h-12 text-base">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {servicesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading services...
                  </SelectItem>
                ) : filteredServices.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No services found
                  </SelectItem>
                ) : (
                  filteredServices.map((service: any) => (
                    <SelectItem key={service.id} value={String(service.id || service.pk)} className="text-base py-3">
                      {service.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Procedure Date */}
          <div className="space-y-2">
            <Label htmlFor="procedureDate" className="text-base font-semibold">
              Procedure Date & Time *
            </Label>
            <Input
              id="procedureDate"
              type="datetime-local"
              value={procedureDate}
              onChange={(e) => setProcedureDate(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTask.isPending}
              className="h-12 text-base px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || !selectedServiceId}
              className="h-12 text-base px-6 gap-2"
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
