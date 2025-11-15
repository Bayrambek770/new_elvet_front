import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AppRole = "admin" | "doctor" | "moderator" | "nurse";

export const RegistrationCodeGenerator = () => {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<AppRole>("doctor");
  const [expiryDays, setExpiryDays] = useState<string>("7");
  const [isSingleUse, setIsSingleUse] = useState(true);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateCode = async () => {
    setLoading(true);
    try {
      // Call database function to generate unique code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_registration_code');

      if (codeError) throw codeError;

      const expiresAt = expiryDays === "never" 
        ? null 
        : new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString();

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('registration_codes')
        .insert({
          code: codeData,
          role: selectedRole,
          is_active: true,
          is_single_use: isSingleUse,
          expires_at: expiresAt,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedCodes([data, ...generatedCodes]);

      toast({
        title: "✅ Код успешно создан!",
        description: `Код: ${data.code} для роли ${selectedRole}`,
      });

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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Скопировано!",
      description: `Код ${code} скопирован в буфер обмена`,
    });
  };

  const deactivateCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('registration_codes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setGeneratedCodes(generatedCodes.filter(c => c.id !== id));

      toast({
        title: "Код деактивирован",
        description: "Код больше нельзя использовать",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Генератор кодов регистрации</CardTitle>
        <CardDescription>
          Создавайте одноразовые или многоразовые коды для регистрации сотрудников
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Роль</Label>
            <Select value={selectedRole} onValueChange={(v: AppRole) => setSelectedRole(v)}>
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
            <Label>Срок действия</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 день</SelectItem>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
                <SelectItem value="never">Бессрочно</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={isSingleUse ? "single" : "multi"} onValueChange={(v) => setIsSingleUse(v === "single")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Одноразовый</SelectItem>
                <SelectItem value="multi">Многоразовый</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={generateCode} disabled={loading} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Сгенерировать код
        </Button>

        {generatedCodes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Созданные коды</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-bold">{code.code}</TableCell>
                    <TableCell>
                      <Badge>{code.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {code.is_single_use ? "Одноразовый" : "Многоразовый"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyCode(code.code)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deactivateCode(code.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};