import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Doctors, Pets, Schedules } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const AppointmentsManager = ({ userId }: { userId: string | number }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    animal_id: "",
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    service_type: "",
    notes: ""
  });

  useEffect(() => {
    // Initial load of pets, doctors, and appointments
    loadAll();
  }, [userId]);

  const fetchAppointments = async () => {
    // Fetch raw schedules (appointments) for this client
    const data = await Schedules.list<any>({ client_id: userId, ordering: "appointment_date" });

    // Enrich with already-fetched pets and doctors where possible
    const petsById = new Map(pets.map((p: any) => [String(p.id), p]));
    const doctorsById = new Map(doctors.map((d: any) => [String(d.id ?? d.user_id), d]));

    const enriched = (data || []).map((apt: any) => {
      const pet = petsById.get(String(apt.animal_id));
      const doc = doctorsById.get(String(apt.doctor_id));
      const doctorFullName = doc?.full_name || [doc?.first_name, doc?.last_name].filter(Boolean).join(" ");
      return {
        ...apt,
        animal: pet ? { name: pet.name, animal_type: pet.animal_type || pet.type } : undefined,
        doctor: doc ? { full_name: doctorFullName || "" } : undefined,
      };
    });

    setAppointments(enriched);
  };

  const fetchPets = async () => {
    const data = await Pets.list<any>({ owner_id: userId });
    setPets(data || []);
  };

  const fetchDoctors = async () => {
    const data = await Doctors.list<any>();
    setDoctors(data || []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [petsData, doctorsData] = await Promise.all([
        Pets.list<any>({ owner_id: userId }),
        Doctors.list<any>()
      ]);
      setPets(petsData || []);
      setDoctors(doctorsData || []);

      // Now that we have pets and doctors, fetch appointments and enrich
      await fetchAppointments();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;

      await Schedules.create({
        client_id: userId,
        animal_id: formData.animal_id || null,
        doctor_id: formData.doctor_id || null,
        appointment_date: appointmentDateTime,
        service_type: formData.service_type,
        notes: formData.notes,
        status: 'pending'
      });

      toast({
        title: t("client.appointments.toast.createSuccess"),
        description: t("client.appointments.create"),
      });

      setFormData({
        animal_id: "",
        doctor_id: "",
        appointment_date: "",
        appointment_time: "",
        service_type: "",
        notes: ""
      });
      setDialogOpen(false);
      // Reload with the new appointment
      await fetchAppointments();
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id: string | number) => {
  if (!confirm(t("client.appointments.cancel.confirmTitle"))) return;

    try {
      // Prefer delete via API; alternatively could patch status to 'cancelled'
      await Schedules.remove(id);

      toast({
        title: t("client.appointments.toast.cancelSuccess"),
        description: t("client.appointments.cancel.confirmDescription"),
      });
      await fetchAppointments();
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", label: t("client.appointments.status.waiting") },
      confirmed: { variant: "default", label: t("client.appointments.status.confirmed") },
      completed: { variant: "secondary", label: t("client.appointments.status.completed") },
      cancelled: { variant: "destructive", label: t("client.appointments.status.cancelled") }
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {t("client.appointments.title")}
          </span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-hero hover:shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                {t("client.appointments.create")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("client.appointments.dialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("client.appointments.dialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pet">{t("client.appointments.pet.label")}</Label>
                  <Select
                    value={formData.animal_id}
                    onValueChange={(v) => setFormData({ ...formData, animal_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("client.appointments.pet.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.animal_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor">{t("client.appointments.doctor.label")}</Label>
                  <Select
                    value={formData.doctor_id}
                    onValueChange={(v) => setFormData({ ...formData, doctor_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("client.appointments.doctor.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.user_id} value={doctor.user_id}>
                          {doctor.full_name} {doctor.specialization && `(${doctor.specialization})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">{t("client.appointments.date.label")}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">{t("client.appointments.time.label")}</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">{t("client.appointments.service.label")}</Label>
                  <Input
                    id="service"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    placeholder={t("client.appointments.service.placeholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("client.appointments.notes.label")}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("client.appointments.notes.placeholder")}
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? t("client.appointments.submitting") : t("client.appointments.submit")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          {t("client.appointments.manageDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("client.appointments.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <Card key={apt.id} className="border">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {new Date(apt.appointment_date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(apt.appointment_date).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {apt.animal && (
                        <p className="text-sm">{t("client.appointments.petPrefix")} <strong>{apt.animal.name}</strong></p>
                      )}
                      {apt.doctor && (
                        <p className="text-sm">{t("client.appointments.doctorPrefix")} <strong>{apt.doctor.full_name}</strong></p>
                      )}
                      {apt.service_type && (
                        <p className="text-sm text-muted-foreground">{apt.service_type}</p>
                      )}
                      <div>{getStatusBadge(apt.status)}</div>
                    </div>
                    {apt.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelAppointment(apt.id)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};