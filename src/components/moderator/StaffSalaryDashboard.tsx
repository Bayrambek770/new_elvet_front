import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Salary, type StaffSalarySummary } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Loader2, RefreshCcw, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export const StaffSalaryDashboard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [salaryData, setSalaryData] = useState<StaffSalarySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const loadSalaryData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Salary.dailyStaffSummary();
      setSalaryData(data);
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error?.response?.data?.detail || error?.message || "Failed to load staff salary data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadSalaryData();
  }, [loadSalaryData]);

  const filteredStaff = (salaryData?.staff_salaries || []).filter((staff) => {
    // Role filter
    if (roleFilter !== "ALL" && staff.role !== roleFilter) {
      return false;
    }

    // Search filter (name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return staff.name.toLowerCase().includes(query) || String(staff.user_id).includes(query);
    }

    return true;
  });

  const totalSalary = filteredStaff.reduce((sum, staff) => {
    const amount = parseFloat(staff.amount) || 0;
    return sum + amount;
  }, 0);

  const getRoleBadge = (role: string) => {
    if (role === "DOCTOR") {
      return <Badge className="bg-blue-500 text-white">Doctor</Badge>;
    }
    if (role === "NURSE") {
      return <Badge className="bg-emerald-500 text-white">Nurse</Badge>;
    }
    return <Badge variant="outline">{role}</Badge>;
  };

  return (
    <Card className="border-2 hover:shadow-glow transition-all">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Staff Salary Summary
            </CardTitle>
            <CardDescription>
              Daily earnings for all doctors and nurses
              {salaryData?.date && ` - ${new Date(salaryData.date).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSalaryData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="DOCTOR">Doctors</SelectItem>
              <SelectItem value="NURSE">Nurses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Staff</div>
              <div className="text-2xl font-bold text-primary">
                {filteredStaff.length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Salary (Today)</div>
              <div className="text-2xl font-bold text-primary">
                {totalSalary.toLocaleString("ru-RU")} сум
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-fuchsia-50 to-transparent">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Average Salary</div>
              <div className="text-2xl font-bold text-primary">
                {filteredStaff.length > 0
                  ? (totalSalary / filteredStaff.length).toLocaleString("ru-RU", {
                      maximumFractionDigits: 0,
                    })
                  : "0"}{" "}
                сум
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
                  ? "No staff salary data available"
                  : "No staff match your filters"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.user_id}>
                    <TableCell className="font-medium">#{staff.user_id}</TableCell>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>{getRoleBadge(staff.role)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {parseFloat(staff.amount).toLocaleString("ru-RU")} сум
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
