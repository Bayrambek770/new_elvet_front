import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tasks } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type MedicalCard = {
  id: number;
  client: number | { id: number; full_name?: string; first_name?: string; last_name?: string };
  pet: number | { id: number; name?: string; nickname?: string };
  diagnosis?: string;
  service_usages?: any[];
};

type TaskCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalCard: MedicalCard;
  onTaskCreated?: () => void;
};

export const TaskCreationModal = ({ open, onOpenChange, medicalCard, onTaskCreated }: TaskCreationModalProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

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

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Validation Error",
        description: "Please select a due date",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create task - assigned_nurse is auto-filled by backend
      await Tasks.create({
        medical_card: medicalCard.id,
        service: Number(selectedServiceId),
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
      });

      toast({
        title: "Success",
        description: "Task created and assigned to you successfully",
      });

      // Reset form
      setSelectedServiceId("");
      setTitle("");
      setDescription("");
      setDueDate("");

      // Call success callback
      onTaskCreated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error?.response?.data?.detail || error?.message || "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            Create a new task from medical card #{medicalCard.id}. The task will be automatically assigned to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medical Card Info (Read-only) */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{getClientName(medicalCard)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pet:</span>
              <span className="font-medium">{getPetName(medicalCard)}</span>
            </div>
            {medicalCard.diagnosis && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diagnosis:</span>
                <span className="font-medium">{medicalCard.diagnosis}</span>
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Service *</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId} required>
              <SelectTrigger id="service">
                <SelectValue placeholder="Select a prescribed service" />
              </SelectTrigger>
              <SelectContent>
                {!medicalCard.service_usages || medicalCard.service_usages.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No services available
                  </SelectItem>
                ) : (
                  medicalCard.service_usages.map((usage: any, idx: number) => {
                    const serviceId = usage.service?.id || usage.service || idx;
                    const serviceName = usage.service_name || usage.service?.name || usage.service || `Service ${idx + 1}`;
                    return (
                      <SelectItem key={idx} value={String(serviceId)}>
                        {serviceName}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Administer rabies vaccine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional notes or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date & Time *</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
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
