import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { MeResponse } from "@/lib/api";

type Role = MeResponse["role"];

function rolePath(role: Role): string {
  switch (role) {
    case "CLIENT":
      return "clients/";
    case "DOCTOR":
      return "doctors/";
    case "NURSE":
      return "nurses/";
    case "MODERATOR":
      return "moderators/";
    case "ADMIN":
      return "admins/";
    default:
      return "users/";
  }
}

interface ChangePasswordDialogProps {
  userId: number | string;
  role: Role;
  onPasswordChanged: () => void;
  onCancel: () => void;
}

export const ChangePasswordDialog = ({ userId, role, onPasswordChanged, onCancel }: ChangePasswordDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пароли не совпадают",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
      });
      return;
    }

    setLoading(true);
    try {
      await api.patch(`${rolePath(role)}${userId}/`, { password: newPassword });
      toast({ title: "Пароль изменен!" });
      onPasswordChanged();
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Установите постоянный пароль</DialogTitle>
          <DialogDescription className="text-center">
            Это ваш первый вход. Пожалуйста, создайте постоянный пароль для вашего аккаунта.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Новый пароль</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Минимум 6 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Подтвердите пароль</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12"
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Важно:</strong> Запомните этот пароль. Он будет использоваться для всех последующих входов.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить пароль
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
