import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle } from "lucide-react";

export const StaffAccountInitializer = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const initializeAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-staff-accounts');

      if (error) throw error;

      setInitialized(true);
      toast({
        title: "✅ Аккаунты инициализированы!",
        description: "Все тестовые аккаунты сотрудников созданы",
      });

      console.log('Initialization results:', data);
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
    <Card className="border-0 shadow-elegant animate-fade-in">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold text-center">Первый запуск системы</CardTitle>
        <CardDescription className="text-center text-base">
          Создайте тестовые аккаунты для всех ролей
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border border-primary/10">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Администратор</p>
            <p className="text-xs text-muted-foreground">ID: <code className="text-primary font-mono font-bold">1000001</code></p>
            <p className="text-xs text-muted-foreground">Пароль: <code className="font-mono">admin123</code></p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Модератор</p>
            <p className="text-xs text-muted-foreground">ID: <code className="text-primary font-mono font-bold">1000002</code></p>
            <p className="text-xs text-muted-foreground">Пароль: <code className="font-mono">moderator123</code></p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Врач</p>
            <p className="text-xs text-muted-foreground">ID: <code className="text-primary font-mono font-bold">1000003</code></p>
            <p className="text-xs text-muted-foreground">Пароль: <code className="font-mono">doctor123</code></p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Медсестра</p>
            <p className="text-xs text-muted-foreground">ID: <code className="text-primary font-mono font-bold">1000004</code></p>
            <p className="text-xs text-muted-foreground">Пароль: <code className="font-mono">nurse123</code></p>
          </div>
        </div>

        <Button 
          onClick={initializeAccounts} 
          disabled={loading || initialized}
          className="w-full h-12 text-base hover-scale shadow-md"
          variant={initialized ? "outline" : "default"}
        >
          {initialized ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Аккаунты созданы
            </>
          ) : (
            <>
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Создание аккаунтов...' : 'Создать тестовые аккаунты'}
            </>
          )}
        </Button>

        {initialized && (
          <p className="text-sm text-center text-primary font-medium">
            ✅ Теперь можно войти используя ID выше
          </p>
        )}
      </CardContent>
    </Card>
  );
};