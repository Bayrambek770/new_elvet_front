import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Auth,
  Clients,
  MedicalCards,
  Schedules,
  ServiceUsages,
  Payments,
  Me,
  NurseCareCards,
  PetFeeds,
  FeedSales,
  Tasks,
  type MeResponse,
} from "@/lib/api";
import { api, tokenStore } from "@/lib/apiClient";

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { phone_number: string; password: string }) => {
      return await Auth.login(payload);
    },
    onSuccess: () => {
      // Invalidate and clear all queries on login to prevent stale data from previous user
      qc.clear();
      // Specifically invalidate the "me" query to force refetch
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
};

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

export const usePetFeeds = () =>
  useQuery({
    queryKey: ["pet-feeds"],
    queryFn: async () => {
      const data = await PetFeeds.list();
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as any)?.results)) return (data as any).results;
      return [];
    },
  });

export const useAuthGuard = () => {
  const access = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return { isAuthenticated: !!access };
};

export const useMe = () => {
  const query = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await Me.get();
      } catch (error: any) {
        // If it's a 401/403, don't retry - user needs to re-authenticate
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          throw error;
        }
        // For other errors, retry
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff: 1s, 2s, 4s, max 5s
    staleTime: 0, // Always consider data stale - refetch on mount to ensure fresh data after login
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (reduced from 10)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
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
    mutationFn: ({ id, amount_paid, method }: { id: number | string; amount_paid: string; method: "CASH" | "CARD" | "TRANSFER" }) =>
      NurseCareCards.recordPayment(id, { amount_paid, method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nurseCareCards"] });
    },
  });
};

export const useFeedSales = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ["feed-sales", params],
    queryFn: async () => {
      const data = await FeedSales.list(params);
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as any)?.results)) return (data as any).results;
      return [];
    },
  });

export const useFeedSale = (id: number | string | null) =>
  useQuery({
    queryKey: ["feed-sales", id],
    queryFn: async () => (id ? FeedSales.get(id) : null),
    enabled: !!id,
  });

export const useCreateFeedSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { client: number; pet?: number | null; items: { feed: number; quantity_kg: string }[] }) =>
      FeedSales.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-sales"] });
      qc.invalidateQueries({ queryKey: ["pet-feeds"] });
    },
  });
};

export const usePayFeedSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: string }) => FeedSales.pay(id, { amount }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["feed-sales"] });
      qc.invalidateQueries({ queryKey: ["feed-sales", id] });
    },
  });
};

export const useCreateTaskFromMedicalCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      medical_card: number | string;
      service: number | string;
      datetime?: string;
    }) => Tasks.createFromMedicalCard(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["medical-cards"] });
    },
  });
};
