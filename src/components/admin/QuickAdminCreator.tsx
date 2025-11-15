import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

export const QuickAdminCreator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://uddmqtplpfmtnrvrazbd.supabase.co/functions/v1/create-admin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Админ создан!",
          description: `ID: 9322531, Пароль: 932253100`,
          duration: 10000,
        });
      } else {
        throw new Error(data.message || data.error || 'Ошибка создания админа');
      }
    } catch (error: any) {
      console.error('Error:', error);
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
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Быстрое создание админа
        </CardTitle>
        <CardDescription>
          Создать админа с ID: 9322531 и паролем: 932253100
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm"><strong>ID:</strong> <code className="text-lg font-mono">9322531</code></p>
            <p className="text-sm"><strong>Пароль:</strong> <code className="text-lg font-mono">932253100</code></p>
          </div>

          <Button
            onClick={createAdmin}
            disabled={loading}
            className="w-full bg-gradient-hero hover:shadow-glow h-12"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                Создать админа
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
