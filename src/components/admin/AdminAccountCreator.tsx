import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, Copy, Check } from "lucide-react";

export const AdminAccountCreator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    adminId: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    adminId: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState<{ id: boolean; password: boolean }>({
    id: false,
    password: false,
  });

  const generateAdminId = () => {
    const randomId = Math.floor(1000000 + Math.random() * 9000000).toString();
    setFormData({ ...formData, adminId: randomId });
  };

  const copyToClipboard = (text: string, field: 'id' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [field]: true });
    setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    toast({
      title: "Скопировано!",
      description: `${field === 'id' ? 'ID' : 'Пароль'} скопирован в буфер обмена`,
    });
  };

  const createAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен быть не менее 6 символов",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
  const email = `${formData.adminId}@elvet.local`;

      // Create admin user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            admin_id: formData.adminId,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with admin details
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.fullName,
            staff_id: formData.adminId,
            is_temp_password: false,
            position: "Администратор",
          })
          .eq("user_id", authData.user.id);

        if (profileError) throw profileError;

        // Assign admin role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "admin",
          });

        if (roleError) throw roleError;

        setGeneratedCredentials({
          adminId: formData.adminId,
          password: formData.password,
        });

        toast({
          title: "✅ Админ аккаунт создан!",
          description: "Сохраните ваши данные для входа",
        });

        setFormData({
          adminId: "",
          password: "",
          confirmPassword: "",
          fullName: "",
        });
      }
    } catch (error: any) {
      console.error("Error creating admin:", error);
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
    <Card className="border-2 border-primary/30 shadow-glow">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Shield className="w-6 h-6 text-primary" />
          Создание Администратора
        </CardTitle>
        <CardDescription className="text-base">
          Создайте первый админ аккаунт с кастомным ID и паролем
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {generatedCredentials ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-700">Аккаунт создан!</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1">Ваш Admin ID</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-background rounded-lg border-2 border-green-500/30">
                      <code className="text-2xl font-bold text-green-600 font-mono">
                        {generatedCredentials.adminId}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.adminId, 'id')}
                      className="h-12 w-12"
                    >
                      {copied.id ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-1">Ваш Пароль</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-background rounded-lg border-2 border-green-500/30">
                      <code className="text-2xl font-bold text-green-600 font-mono">
                        {generatedCredentials.password}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                      className="h-12 w-12"
                    >
                      {copied.password ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-700 font-semibold">
                  ⚠️ ВАЖНО: Сохраните эти данные в надежном месте!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Используйте эти данные для входа в систему на странице /auth
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                setGeneratedCredentials(null);
                window.location.href = "/auth";
              }}
              className="w-full bg-gradient-hero hover:shadow-glow h-12"
            >
              Перейти к входу
            </Button>
          </div>
        ) : (
          <form onSubmit={createAdminAccount} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base">
                  ФИО Администратора *
                </Label>
                <Input
                  id="fullName"
                  placeholder="Иванов Иван Иванович"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="adminId" className="text-base">
                    Admin ID (7 цифр) *
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateAdminId}
                  >
                    Сгенерировать
                  </Button>
                </div>
                <Input
                  id="adminId"
                  type="text"
                  placeholder="1234567"
                  value={formData.adminId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                    setFormData({ ...formData, adminId: value });
                  }}
                  required
                  maxLength={7}
                  className="h-12 text-lg font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Используйте этот ID для входа в систему
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">
                  Пароль (минимум 6 символов) *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите надежный пароль"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base">
                  Подтвердите пароль *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Введите пароль еще раз"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className="h-12"
                />
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Совет:</strong> Выберите легко запоминающийся ID и надежный пароль. 
                Эти данные будут использоваться для входа в админ панель.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-hero hover:shadow-glow h-12 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Создание аккаунта...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Создать Админ Аккаунт
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
