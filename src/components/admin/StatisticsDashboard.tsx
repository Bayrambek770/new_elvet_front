import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ArrowUp, ArrowDown, AlertCircle, CheckCircle, Clock, DollarSign, Users, BedDouble, TrendingUp } from "lucide-react";

export const StatisticsDashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueChange: 0,
    newClients: 0,
    clientsChange: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    canceledAppointments: 0,
    hospitalizedAnimals: 0,
    paidPercentage: 0,
    unpaidPercentage: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Current month revenue
    const { data: currentRevenue } = await supabase
      .from("medical_cards")
      .select("total_amount, created_at")
      .eq("is_paid", true)
      .gte("created_at", currentMonth.toISOString());

    // Last month revenue
    const { data: lastMonthRevenue } = await supabase
      .from("medical_cards")
      .select("total_amount")
      .eq("is_paid", true)
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", currentMonth.toISOString());

    const currentTotal = currentRevenue?.reduce((sum, card) => sum + (card.total_amount || 0), 0) || 0;
    const lastTotal = lastMonthRevenue?.reduce((sum, card) => sum + (card.total_amount || 0), 0) || 0;
    const revenueChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // New clients
    const { count: currentClients } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("client_id", "is", null)
      .gte("created_at", currentMonth.toISOString());

    const { count: lastClients } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("client_id", "is", null)
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", currentMonth.toISOString());

    const clientsChange = lastClients && lastClients > 0 ? ((currentClients || 0) - lastClients) / lastClients * 100 : 0;

    // Appointments by status
    const { count: pending } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: completed } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: canceled } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "canceled");

    // Hospitalized
    const { count: hospitalized } = await supabase
      .from("medical_cards")
      .select("*", { count: "exact", head: true })
      .eq("is_hospitalized", true);

    // Paid vs Unpaid cards
    const { count: paidCards } = await supabase
      .from("medical_cards")
      .select("*", { count: "exact", head: true })
      .eq("is_paid", true);

    const { count: unpaidCards } = await supabase
      .from("medical_cards")
      .select("*", { count: "exact", head: true })
      .eq("is_paid", false);

    const totalCards = (paidCards || 0) + (unpaidCards || 0);
    const paidPercentage = totalCards > 0 ? ((paidCards || 0) / totalCards) * 100 : 0;
    const unpaidPercentage = 100 - paidPercentage;

    // Revenue chart data - last 7 days
    const revenueByDay: any = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      revenueByDay[dateKey] = 0;
    }

    currentRevenue?.forEach((card) => {
      const date = new Date(card.created_at);
      const dateKey = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      if (revenueByDay[dateKey] !== undefined) {
        revenueByDay[dateKey] += card.total_amount || 0;
      }
    });

    const revenueChartData = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount: Math.round(amount as number / 1000), // в тысячах
    }));

    // Appointments chart data
    const appointmentsChartData = [
      { name: 'Ожидают', value: pending || 0, color: '#f59e0b' },
      { name: 'Завершены', value: completed || 0, color: '#10b981' },
      { name: 'Отменены', value: canceled || 0, color: '#ef4444' },
    ];

    setStats({
      totalRevenue: currentTotal,
      revenueChange,
      newClients: currentClients || 0,
      clientsChange,
      pendingAppointments: pending || 0,
      completedAppointments: completed || 0,
      canceledAppointments: canceled || 0,
      hospitalizedAnimals: hospitalized || 0,
      paidPercentage,
      unpaidPercentage,
    });

    setRevenueData(revenueChartData);
    setAppointmentsData(appointmentsChartData);
  };

  const paymentData = [
    { name: 'Оплачено', value: stats.paidPercentage, color: '#3b82f6' },
    { name: 'Не оплачено', value: stats.unpaidPercentage, color: '#e5e7eb' },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards - Large and Prominent */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <Card className="border-2 hover:shadow-lg transition-all bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700 font-medium">Выручка за месяц</CardDescription>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-700">{stats.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${stats.revenueChange >= 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                {stats.revenueChange >= 0 ? <ArrowUp className="w-3 h-3 inline mr-1" /> : <ArrowDown className="w-3 h-3 inline mr-1" />}
                {Math.abs(stats.revenueChange).toFixed(1)}%
              </span>
              <p className="text-xs text-green-600">сум за текущий месяц</p>
            </div>
          </CardContent>
        </Card>

        {/* New Clients Card */}
        <Card className="border-2 hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700 font-medium">Новые клиенты</CardDescription>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-700">{stats.newClients}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${stats.clientsChange >= 0 ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                {stats.clientsChange >= 0 ? <ArrowUp className="w-3 h-3 inline mr-1" /> : <ArrowDown className="w-3 h-3 inline mr-1" />}
                {Math.abs(stats.clientsChange).toFixed(1)}%
              </span>
              <p className="text-xs text-blue-600">за последний месяц</p>
            </div>
          </CardContent>
        </Card>

        {/* Hospitalized Animals Card */}
        <Card className="border-2 hover:shadow-lg transition-all bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-orange-700 font-medium">В клинике сейчас</CardDescription>
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <BedDouble className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-700">{stats.hospitalizedAnimals}</div>
            <div className="mt-2">
              <p className="text-xs text-orange-600">животных на стационаре</p>
              <p className="text-xs text-orange-500 mt-1">Круглосуточный уход</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Success Rate Card */}
        <Card className="border-2 hover:shadow-lg transition-all bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-700 font-medium">Процент оплаты</CardDescription>
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-700">{stats.paidPercentage.toFixed(0)}%</div>
            <div className="mt-2">
              <p className="text-xs text-purple-600">услуг оплачено</p>
              <p className="text-xs text-purple-500 mt-1">{stats.unpaidPercentage.toFixed(0)}% в ожидании</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.completedAppointments}</div>
                <p className="text-sm text-green-600">Завершенных записей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-700">{stats.pendingAppointments}</div>
                <p className="text-sm text-yellow-600">Ожидают приема</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-700">{stats.canceledAppointments}</div>
                <p className="text-sm text-red-600">Отмененных записей</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="col-span-1 lg:col-span-2 border-2">
          <CardHeader>
            <CardTitle>Динамика выручки</CardTitle>
            <CardDescription>Последние 7 дней (в тысячах сум)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments Pie Chart */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Статус записей</CardTitle>
            <CardDescription>Распределение по статусам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={appointmentsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {appointmentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Оплата услуг</CardTitle>
            <CardDescription>Процент оплаченных карт</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.paidPercentage.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Оплачено</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">{stats.unpaidPercentage.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Не оплачено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
