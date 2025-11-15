import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pets } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Plus, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PetsManager = ({ userId, role = "CLIENT" }: { userId: string | number; role?: string }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    species: "dog" as "dog" | "cat" | "bird" | "reptile" | "other",
    gender: "male" as "male" | "female",
    breed: "",
    birth_date: "",
    color: "",
    weight_kg: "" as string | number,
    description: "",
    image: undefined as File | undefined,
  });

  useEffect(() => {
    fetchPets();
  }, [userId]);

  const toArray = (maybe: any) => (Array.isArray(maybe) ? maybe : Array.isArray(maybe?.results) ? maybe.results : []);

  const fetchPets = async () => {
    try {
      const data = await Pets.list<any>({ owner: userId, ordering: "-created_at" });
      setPets(toArray(data));
    } catch (e) {
      console.error("Error fetching pets:", e);
      setPets([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate birth date: only past dates allowed
    if (formData.birth_date) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (formData.birth_date > todayStr) {
  toast({ title: t("client.pets.invalidBirthDateTitle"), description: t("client.pets.invalidBirthDateDescription"), variant: "destructive" });
        return;
      }
    }
    setLoading(true);

    try {
      if (editingPet) {
        // Update existing pet
        const id = editingPet.id;
        if (formData.image instanceof File) {
          const form = new FormData();
          Object.entries(formData).forEach(([k, v]) => {
            if (v !== undefined && v !== null && k !== "image") form.append(k, String(v));
          });
          form.append("image", formData.image);
          await Pets.patch(id, form as any);
        } else {
          const { image, ...json } = formData as any;
          await Pets.patch(id, { ...json, birth_date: json.birth_date || null } as any);
        }

  toast({ title: t("client.pets.toast.updateSuccess") });
      } else {
        // Create new pet; owner is set on backend for CLIENT
        if (formData.image instanceof File) {
          const form = new FormData();
          Object.entries(formData).forEach(([k, v]) => {
            if (v !== undefined && v !== null && k !== "image") form.append(k, String(v));
          });
          form.append("image", formData.image);
          await Pets.create(form as any);
        } else {
          const { image, ...json } = formData as any;
          await Pets.create({ ...json, birth_date: json.birth_date || null } as any);
        }

  toast({ title: t("client.pets.toast.createSuccess"), description: t("client.pets.toast.createDescription", { name: formData.name }) });
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        species: "dog",
        gender: "male",
        breed: "",
        birth_date: "",
        color: "",
        weight_kg: "",
        description: "",
        image: undefined,
      });
      setEditingPet(null);
      // Close dialog after a short delay to ensure state updates
      setTimeout(() => {
        setDialogOpen(false);
      }, 100);
      await fetchPets();
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

  const deletePet = async (id: string | number, name: string) => {
  if (!confirm(t("client.pets.deleteConfirm", { name }))) return;

    try {
      await Pets.remove(id);

      toast({
        title: t("client.pets.toast.deleteSuccess"),
        description: t("client.pets.toast.deleteDescription", { name }),
      });
      await fetchPets();
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAnimalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dog: "🐕 Собака",
      cat: "🐈 Кошка",
      bird: "🦜 Птица",
      other: "🐾 Другое"
    };
    return labels[type] || type;
  };

  return (
    <Card className="border-0 shadow-elegant overflow-hidden">
      <div className="bg-gradient-card border-b p-6">
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-gradient-hero rounded-lg shadow-md">
                  <PawPrint className="w-6 h-6 text-primary-foreground" />
                </div>
                {t("client.pets.title")}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {t("client.pets.emptyHelp")}
              </CardDescription>
            </div>
            {role === "CLIENT" && (
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingPet(null); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2 h-11 shadow-md hover-scale">
                    <Plus className="w-5 h-5" />
                    {t("client.pets.addPet")}
                  </Button>
                </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPet ? t("client.pets.updatePet") : t("client.pets.addNew")}</DialogTitle>
                <DialogDescription>{t("client.pets.dialog.description")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("client.pets.name.label")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("client.pets.namePlaceholder")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">{t("client.pets.species.label")}</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(v: any) => setFormData({ ...formData, species: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">{t("doctor.pet.species.dog")}</SelectItem>
                      <SelectItem value="cat">{t("doctor.pet.species.cat")}</SelectItem>
                      <SelectItem value="bird">{t("doctor.pet.species.bird")}</SelectItem>
                      <SelectItem value="reptile">{t("client.pets.reptile")}</SelectItem>
                      <SelectItem value="other">{t("doctor.pet.species.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">{t("client.pets.gender.label")}</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(v: any) => setFormData({ ...formData, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("doctor.pet.gender.male")}</SelectItem>
                      <SelectItem value="female">{t("doctor.pet.gender.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">{t("client.pets.breed.label")}</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder={t("client.pets.breedPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">{t("client.pets.birthDate.label")}</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    max={new Date().toLocaleDateString('en-CA')}
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="color">{t("client.pets.color.label")}</Label>
                    <Input id="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="Рыжий" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">{t("client.pets.weight.label")}</Label>
                    <Input id="weight" type="number" step="0.1" value={formData.weight_kg as any} onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })} placeholder="4.2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("client.pets.notes.label")}</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Особенности, аллергии..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">{t("client.pets.photo.label")}</Label>
                  <Input id="image" type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] })} />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (editingPet ? t("client.pets.saving") : t("client.pets.creating")) : editingPet ? t("common.save") : t("client.pets.addPet")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </CardHeader>
      </div>

      <CardContent className="p-6">
        {pets.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-block p-6 bg-primary/5 rounded-3xl mb-4">
              <PawPrint className="w-16 h-16 text-primary/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("client.pets.empty")}</h3>
            <p className="text-muted-foreground mb-6">{t("client.pets.emptyHelp")}</p>
            {role === "CLIENT" && (
              <Button onClick={() => setDialogOpen(true)} className="hover-scale shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              {t("client.pets.addPet")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet, index) => (
              <Card 
                key={pet.id} 
                className="group relative hover:shadow-glow transition-all duration-300 border-2 hover:border-primary/30 animate-scale-in overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-3 bg-gradient-hero rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <PawPrint className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate">{pet.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {getAnimalTypeLabel(pet.species)}
                          {pet.breed && ` • ${pet.breed}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {role === "CLIENT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingPet(pet); setFormData({
                            name: pet.name || "",
                            species: pet.species || "dog",
                            gender: pet.gender || "male",
                            breed: pet.breed || "",
                            birth_date: pet.birth_date || "",
                            color: pet.color || "",
                            weight_kg: pet.weight_kg ?? "",
                            description: pet.description || "",
                            image: undefined,
                          }); setDialogOpen(true); }}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {role === "CLIENT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePet(pet.id, pet.name)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 relative">
                  {pet.birth_date && (
                    <div className="flex items-center gap-3 p-3 bg-gradient-card rounded-lg border">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("client.pets.age.label")}</div>
                        <div className="font-semibold">
                          {Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))} {t("client.pets.age.yearsSuffix")}
                        </div>
                      </div>
                    </div>
                  )}
                  {pet.description && (
                    <div className="p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
                      <div className="font-medium text-foreground mb-1">{t("client.pets.notes.heading")}</div>
                      {pet.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};