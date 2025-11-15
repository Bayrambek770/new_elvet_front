import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
// Supabase-based admin tools disabled pending DRF rewrite
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const AdminSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    // TODO: Optionally check via DRF if an admin exists
    setLoading(false);
  }, []);

  const checkAdminExists = async () => {
    // Supabase removed. Implement DRF-based check if needed.
    setHasAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Heart className="w-12 h-12 text-primary" />
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center shadow-glow mx-auto">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Администратор уже существует</h1>
          <p className="text-muted-foreground">Перенаправляем на страницу входа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 animate-fade-in">
      <div className="w-full max-w-2xl">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="text-center mb-8 animate-scale-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center shadow-glow">
              <Heart className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">ELVET</h1>
          <p className="text-muted-foreground text-lg">Первоначальная настройка системы</p>
        </div>

        <Card className="border-2 hover:shadow-glow transition-all">
          <CardHeader>
            <CardTitle className="text-xl">Настройка администратора</CardTitle>
            <CardDescription>Раздел временно отключен. Используйте DRF админку для управления пользователями.</CardDescription>
          </CardHeader>
        </Card>

        <div className="flex justify-center mt-6">
          <Button variant="link" onClick={() => navigate("/")} className="text-base gap-2">
            <ArrowLeft className="w-4 h-4" />
            Вернуться на главную
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
