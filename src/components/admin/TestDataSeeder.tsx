import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, UserCheck, Stethoscope, Heart, User, ExternalLink } from "lucide-react";

const testAccounts = [
  {
    role: "Admin",
    roleRu: "Админ",
    icon: Shield,
    phone: "+998 90 000 00 01",
    password: "Admin@123",
    path: "/dashboard/admin",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30"
  },
  {
    role: "Moderator",
    roleRu: "Модератор",
    icon: UserCheck,
    phone: "+998 90 000 00 02",
    password: "Mod@123",
    path: "/dashboard/moderator",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30"
  },
  {
    role: "Doctor",
    roleRu: "Доктор",
    icon: Stethoscope,
    phone: "+998 90 000 00 03",
    password: "Doc@123",
    path: "/dashboard/doctor",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30"
  },
  {
    role: "Nurse",
    roleRu: "Медсестра",
    icon: Heart,
    phone: "+998 90 000 00 04",
    password: "Nurse@123",
    path: "/dashboard/nurse",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/20 hover:bg-pink-100 dark:hover:bg-pink-950/30"
  },
  {
    role: "Client",
    roleRu: "Клиент",
    icon: User,
    phone: "+998 90 000 00 05",
    password: "Client@123",
    path: "/dashboard/client",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30"
  }
];

export const TestDataSeeder = () => {

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl">Тестовые аккаунты</CardTitle>
        <CardDescription>
          Быстрый доступ к тестовым профилям системы
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testAccounts.map((account) => {
            const Icon = account.icon;
            return (
              <Link
                key={account.role}
                to={account.path}
                className={`block p-4 rounded-lg border-2 transition-all ${account.bgColor} border-transparent hover:border-primary/50`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${account.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{account.roleRu}</h3>
                    <p className="text-xs text-muted-foreground">{account.role}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Телефон:</span>
                    <span className="font-mono font-medium">{account.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Пароль:</span>
                    <span className="font-mono font-medium">{account.password}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
