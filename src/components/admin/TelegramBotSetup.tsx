import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Copy, Check } from "lucide-react";

export const TelegramBotSetup = () => {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const webhookUrl = `https://uddmqtplpfmtnrvrazbd.supabase.co/functions/v1/telegram-bot`;

  const setupWebhook = async () => {
    if (!botToken) {
      toast({
        title: "Ошибка",
        description: "Введите токен бота",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
          }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Успешно!",
          description: "Webhook настроен. Бот готов к работе.",
        });
      } else {
        throw new Error(data.description || 'Ошибка настройки webhook');
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

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Скопировано!",
      description: "URL webhook скопирован в буфер обмена",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Настройка Telegram Бота
        </CardTitle>
        <CardDescription>
          Настройте Telegram бота для приема регистраций клиентов
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">Инструкция по настройке:</h3>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Создайте бота через <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a></li>
              <li>Отправьте команду <code className="bg-background px-1 py-0.5 rounded">/newbot</code> и следуйте инструкциям</li>
              <li>Скопируйте полученный токен и вставьте его ниже</li>
              <li>Нажмите "Настроить Webhook" для активации бота</li>
              <li>Убедитесь, что секрет TELEGRAM_BOT_TOKEN установлен в Backend</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL (для справки)</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyWebhookUrl}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-token">Токен бота</Label>
            <Input
              id="bot-token"
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Токен можно получить у @BotFather в Telegram
            </p>
          </div>

          <Button 
            onClick={setupWebhook} 
            disabled={loading || !botToken}
            className="w-full"
          >
            {loading ? "Настройка..." : "Настроить Webhook"}
          </Button>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Как работает бот:</h3>
          <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
            <li>Клиенты отправляют команду <code className="bg-background px-1 py-0.5 rounded">/start</code> боту</li>
            <li>Бот просит поделиться контактом</li>
            <li>После получения контакта создается запрос на регистрацию</li>
            <li>Модераторы видят запросы в панели и могут одобрить/отклонить</li>
            <li>При одобрении клиент получает ID и временный пароль</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
