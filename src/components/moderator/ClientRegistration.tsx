import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy } from "lucide-react";

export const ClientRegistration = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    loginId: string;
    password: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
  });

  const generateRandomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleRegister = async () => {
    if (!formData.fullName || !formData.phone) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Заполните все поля",
      });
      return;
    }

    setLoading(true);
    try {
      const loginId = generateRandomId();
      const tempPassword = generateRandomPassword();
  const email = `${loginId}@elvet.local`;

      // Create user account with temporary password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            login_id: loginId,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with client_id and temporary password flag
        await supabase.from("profiles").update({
          full_name: formData.fullName,
          phone: formData.phone,
          client_id: loginId,
          temp_password: tempPassword,
          is_temp_password: true,
        }).eq("user_id", authData.user.id);

        setGeneratedCredentials({
          loginId,
          password: tempPassword,
        });

        toast({
          title: "Успешно!",
          description: `Клиент ${formData.fullName} зарегистрирован с временным паролем`,
        });

        setFormData({ fullName: "", phone: "" });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано!",
      description: `${label} скопирован в буфер обмена`,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 hover:shadow-glow transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Регистрация нового клиента
          </CardTitle>
          <CardDescription>
            Создайте новую учетную запись клиента с автоматической генерацией ID и пароля
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">ФИО клиента</Label>
            <Input
              id="fullName"
              placeholder="Иванов Иван Иванович"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              placeholder="+998 90 123 45 67"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-hero hover:shadow-glow"
          >
            {loading ? "Регистрация..." : "Зарегистрировать клиента"}
          </Button>
        </CardContent>
      </Card>

      {generatedCredentials && (
        <Card className="border-2 border-primary shadow-glow animate-fade-in">
          <CardHeader>
            <CardTitle className="text-primary">Данные для входа созданы!</CardTitle>
            <CardDescription>
              Сохраните или передайте эти данные клиенту. Они больше не будут отображаться.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID клиента</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedCredentials.loginId}
                  readOnly
                  className="font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedCredentials.loginId, "ID")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Пароль</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedCredentials.password}
                  readOnly
                  className="font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedCredentials.password, "Пароль")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>⚠️ Важно:</strong> Это временный пароль действует только один раз! После первого входа клиент должен будет создать свой постоянный пароль.
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Инструкция для клиента:</strong>
                <br />1. Войти с ID и временным паролем
                <br />2. Создать свой постоянный пароль
                <br />3. Войти заново с новым паролем
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
