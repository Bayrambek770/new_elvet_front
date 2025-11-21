import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Auth, Clients, MedicalCards, Schedules, ServiceUsages, Payments, Me, NurseCareCards, type MeResponse } from "@/lib/api";
import { api, tokenStore } from "@/lib/apiClient";

export const useLogin = () =>
  useMutation({
    mutationFn: async (payload: { phone_number: string; password: string }) => {
      return await Auth.login(payload);
    },
  });

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => Clients.list(),
  });

export const useCreateMedicalCard = () =>
  useMutation({
    mutationFn: async (payload: Record<string, unknown>) => MedicalCards.create(payload),
  });

export const useCreateSchedule = () =>
  useMutation({
    mutationFn: async (payload: { medical_card: number; date: string; status?: string }) =>
      Schedules.create(payload),
  });

export const useAddServiceUsage = () =>
  useMutation({
    mutationFn: async (payload: { medical_card: number; service: number; quantity?: number; description?: string }) =>
      ServiceUsages.create(payload),
  });

export const useWeeklyIncome = () =>
  useQuery({
    queryKey: ["payments", "weekly"],
    queryFn: async () => Payments.weekly(),
  });

export const useAuthGuard = () => {
  const access = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return { isAuthenticated: !!access };
};

export const useMe = () => {
  const query = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => Me.get(),
  });

  useEffect(() => {
    const role = query.data?.role;
    if (role) {
      tokenStore.setRole(String(role).toUpperCase());
    }
  }, [query.data?.role]);

  return query;
};

// Profile update hooks for /me/
type MePatch = {
  first_name?: string;
  last_name?: string;
  address?: string; // client only
  extra_number1?: string; // client only
  extra_number2?: string; // client only
};

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MePatch) => (await api.patch("me/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
};

export const useUpdateMyImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return (
        await api.patch("me/", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
};

// Nurse Care Cards hooks
export const useNurseCareMine = () =>
  useQuery({
    queryKey: ["nurseCareCards", "mine"],
    queryFn: async () => NurseCareCards.mine(),
  });

export const useNurseCareClient = () =>
  useQuery({
    queryKey: ["nurseCareCards", "client"],
    queryFn: async () => NurseCareCards.client(),
  });

export const useCreateNurseCareCard = () =>
  useMutation({
    mutationFn: (payload: { nurse: number | string; client: number | string; pet: number | string; description?: string; service_ids?: Array<number | string>; created_by?: number | string }) =>
      NurseCareCards.create(payload),
  });

export const useUpdateNurseCareInfo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: { description?: string; service_ids?: Array<number | string> } }) =>
      NurseCareCards.updateInfo(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurseCareCards"] });
    },
  });
};

export const useRecordNurseCarePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount_paid, method }: { id: number | string; amount_paid: string; method: "CASH" | "CLICK" | "PAYME" | "OTHER" }) =>
      NurseCareCards.recordPayment(id, { amount_paid, method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurseCareCards"] });
    },
  });
};
