import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Salary, type StaffSalaryEntry, type StaffSalarySummary } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Banknote, CheckCircle2, DollarSign, Loader2, RefreshCcw, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const StaffSalaryDashboard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [salaryData, setSalaryData] = useState<StaffSalarySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [disbursingId, setDisbursingId] = useState<number | null>(null);

  const loadSalaryData = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const data = await Salary.dailyStaffSummary(date ?? selectedDate);
      setSalaryData(data as StaffSalarySummary);
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error?.response?.data?.detail || error?.message || t("moderator.staffIncome.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t, selectedDate]);

  useEffect(() => {
    loadSalaryData();
  }, [loadSalaryData]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleApplyDate = () => {
    loadSalaryData(selectedDate);
  };

  const handleDisburse = async (staff: StaffSalaryEntry) => {
    setDisbursingId(staff.user_id);
    try {
      await Salary.disburse(staff.user_id, selectedDate);
      toast({ title: t("moderator.staffIncome.paySuccess") });
      await loadSalaryData(selectedDate);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || t("moderator.staffIncome.payError");
      toast({ title: t("moderator.staffIncome.payError"), description: msg, variant: "destructive" });
    } finally {
      setDisbursingId(null);
    }
  };

  const filteredStaff = (salaryData?.staff_salaries || []).filter((staff) => {
    if (roleFilter !== "ALL" && staff.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return staff.name.toLowerCase().includes(query) || String(staff.user_id).includes(query);
    }
    return true;
  });

  const totalSalary = filteredStaff.reduce((sum, staff) => sum + (parseFloat(staff.amount) || 0), 0);
  const totalDisbursed = filteredStaff.filter((s) => s.is_disbursed).length;

  const getRoleBadge = (role: string) => {
    if (role === "DOCTOR") return <Badge className="bg-blue-500 text-white">{t("moderator.staffIncome.role.doctor")}</Badge>;
    if (role === "NURSE") return <Badge className="bg-emerald-500 text-white">{t("moderator.staffIncome.role.nurse")}</Badge>;
    return <Badge variant="outline">{role}</Badge>;
  };

  const getStatusBadge = (isDisbursed: boolean) => {
    if (isDisbursed) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t("moderator.staffIncome.status.paid")}
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
        {t("moderator.staffIncome.status.unpaid")}
      </Badge>
    );
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {t("moderator.staffIncome.title")}
            </CardTitle>
            <CardDescription>
              {t("moderator.staffIncome.description")}
              {salaryData?.date && ` — ${new Date(salaryData.date).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSalaryData(selectedDate)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("moderator.staffIncome.refresh")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date picker + filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="incomeDate">{t("moderator.staffIncome.date")}</Label>
            <div className="flex gap-2">
              <Input
                id="incomeDate"
                type="date"
                value={selectedDate}
                max={todayStr()}
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleApplyDate} disabled={loading} className="px-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("moderator.staffIncome.go")}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("moderator.staffIncome.search")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("moderator.staffIncome.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("moderator.staffIncome.filterRole")}</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("moderator.staffIncome.filterRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("moderator.staffIncome.allRoles")}</SelectItem>
                <SelectItem value="DOCTOR">{t("moderator.staffIncome.doctors")}</SelectItem>
                <SelectItem value="NURSE">{t("moderator.staffIncome.nurses")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t("moderator.staffIncome.totalStaff")}</div>
              <div className="text-2xl font-bold text-primary">{filteredStaff.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t("moderator.staffIncome.totalEarned")}</div>
              <div className="text-2xl font-bold text-primary">
                {totalSalary.toLocaleString("ru-RU")} сум
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t("moderator.staffIncome.paidOut")}</div>
              <div className="text-2xl font-bold text-green-600">{totalDisbursed}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t("moderator.staffIncome.pendingPay")}</div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredStaff.length - totalDisbursed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <div className="rounded-lg border overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                {salaryData?.staff_salaries?.length === 0
                  ? t("moderator.staffIncome.empty.noData")
                  : t("moderator.staffIncome.empty.noMatch")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("moderator.staffIncome.col.id")}</TableHead>
                  <TableHead>{t("moderator.staffIncome.col.name")}</TableHead>
                  <TableHead>{t("moderator.staffIncome.col.role")}</TableHead>
                  <TableHead className="text-right">{t("moderator.staffIncome.col.earned")}</TableHead>
                  <TableHead className="text-center">{t("moderator.staffIncome.col.status")}</TableHead>
                  <TableHead className="text-center">{t("moderator.staffIncome.col.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => {
                  const isDisbursing = disbursingId === staff.user_id;
                  return (
                    <TableRow key={staff.user_id}>
                      <TableCell className="font-medium">#{staff.user_id}</TableCell>
                      <TableCell>{staff.name}</TableCell>
                      <TableCell>{getRoleBadge(staff.role)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {parseFloat(staff.amount).toLocaleString("ru-RU")} сум
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(staff.is_disbursed)}
                      </TableCell>
                      <TableCell className="text-center">
                        {staff.is_disbursed ? (
                          <Button size="sm" variant="ghost" disabled className="gap-1 text-green-600 cursor-not-allowed opacity-60">
                            <CheckCircle2 className="w-4 h-4" />
                            {t("moderator.staffIncome.alreadyPaid")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1 bg-green-500 hover:bg-green-600 text-white"
                            disabled={isDisbursing}
                            onClick={() => handleDisburse(staff)}
                          >
                            {isDisbursing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Banknote className="w-4 h-4" />
                            )}
                            {isDisbursing ? t("moderator.staffIncome.paying") : t("moderator.staffIncome.pay")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
