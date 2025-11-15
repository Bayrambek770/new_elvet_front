import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

type AppRole = "admin" | "doctor" | "moderator" | "nurse";

export const StaffAccountCreator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    role: "doctor" as AppRole,
    position: "",
    specialization: ""
  });
  const [generatedCredentials, setGeneratedCredentials] = useState<{ staffId: string; password: string } | null>(null);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const createStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate staff ID
      const { data: staffIdData, error: staffIdError } = await supabase.rpc('generate_staff_id');
      if (staffIdError) throw staffIdError;
      const staffId = staffIdData as string;

      // Generate temporary password
      const tempPassword = generateTempPassword();

      // Create authentication account
  const email = `${staffId}@elvet.local`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update role
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: formData.role })
          .eq("user_id", authData.user.id);

        if (roleError) throw roleError;

        // Update profile with staff info
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            staff_id: staffId,
            position: formData.position,
            specialization: formData.specialization,
            is_temp_password: true,
          })
          .eq("user_id", authData.user.id);

        if (profileError) throw profileError;

        setGeneratedCredentials({ staffId, password: tempPassword });

        toast({
          title: "✅ Аккаунт создан!",
          description: `Сотрудник ${formData.fullName} успешно добавлен`,
        });

        // Reset form
        setFormData({
          fullName: "",
          role: "doctor",
          position: "",
          specialization: ""
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создание аккаунта сотрудника</CardTitle>
        <CardDescription>
          Создайте аккаунт напрямую без регистрационного кода
        </CardDescription>
      </CardHeader>
      <CardContent>
        {generatedCredentials && (
          <div className="mb-6 p-4 bg-primary/10 border-2 border-primary rounded-lg">
            <h3 className="font-bold text-lg mb-2">✅ Учетные данные созданы</h3>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-sm">ID сотрудника:</span>
                <span className="text-lg font-bold text-primary">{generatedCredentials.staffId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Временный пароль:</span>
                <span className="text-lg font-bold text-primary">{generatedCredentials.password}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              ⚠️ Сохраните эти данные! Пароль действует только для первого входа.
            </p>
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={() => setGeneratedCredentials(null)}
            >
              Закрыть
            </Button>
          </div>
        )}

        <form onSubmit={createStaffAccount} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">ФИО *</Label>
              <Input
                id="fullName"
                placeholder="Иванов Иван Иванович"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль *</Label>
              <Select value={formData.role} onValueChange={(v: AppRole) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="doctor">Врач</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="nurse">Медсестра</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Должность</Label>
              <Input
                id="position"
                placeholder="Главный врач"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Специализация</Label>
              <Input
                id="specialization"
                placeholder="Хирургия, Терапия"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong>Примечание:</strong> ID сотрудника и временный пароль будут сгенерированы автоматически. 
              Сотрудник должен будет сменить пароль при первом входе.
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Создать аккаунт сотрудника
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};