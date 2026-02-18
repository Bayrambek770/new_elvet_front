import { api, tokenStore } from "./apiClient";

// Basic types (extend as needed)
export type ID = number | string;

export type AuthResponse = {
  access: string;
  refresh: string;
};

export const Auth = {
  login: async (payload: { phone_number: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("auth/jwt/token/", payload);
    tokenStore.set(data.access, data.refresh);
    return data;
  },
  refresh: async (refresh: string): Promise<{ access: string }> => {
    const { data } = await api.post<{ access: string }>("auth/jwt/token/refresh/", { refresh });
    return data;
  },
  logout: () => tokenStore.clear(),
};

// Generic helpers
const list = async <T>(path: string, params?: Record<string, unknown>) => (await api.get<T>(path, { params })).data;
const get = async <T>(path: string, id: ID) => (await api.get<T>(`${path}${id}/`)).data;
const post = async <T, B = any>(path: string, body: B) => (await api.post<T>(path, body)).data;
const put = async <T, B = any>(path: string, id: ID, body: B) => (await api.put<T>(`${path}${id}/`, body)).data;
const patch = async <T, B = any>(path: string, id: ID, body: B) => (await api.patch<T>(`${path}${id}/`, body)).data;
const del = async <T = void>(path: string, id: ID) => (await api.delete<T>(`${path}${id}/`)).data;

// Users and roles
export const Users = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("users/", params),
  get: <T = unknown>(id: ID) => get<T>("users/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("users/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("users/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("users/", id, body),
  remove: (id: ID) => del("users/", id),
  roles: {
    list: <T = unknown>() => list<T[]>("roles/"),
    get: <T = unknown>(id: ID) => get<T>("roles/", id),
    create: <T = unknown>(body: Record<string, unknown>) => post<T>("roles/", body),
    update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("roles/", id, body),
    patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("roles/", id, body),
    remove: (id: ID) => del("roles/", id),
  },
};

// Doctors & Nurses
export const Doctors = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("doctors/", params),
  get: <T = unknown>(id: ID) => get<T>("doctors/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("doctors/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("doctors/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("doctors/", id, body),
  remove: (id: ID) => del("doctors/", id),
};

export const Nurses = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("nurses/", params),
  get: <T = unknown>(id: ID) => get<T>("nurses/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("nurses/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("nurses/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("nurses/", id, body),
  remove: (id: ID) => del("nurses/", id),
};

// Clients & Pets
export const Clients = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("clients/", params),
  get: <T = unknown>(id: ID) => get<T>("clients/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("clients/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("clients/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("clients/", id, body),
  remove: (id: ID) => del("clients/", id),
};

export const Pets = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("pets/", params),
  get: <T = unknown>(id: ID) => get<T>("pets/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("pets/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("pets/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("pets/", id, body),
  remove: (id: ID) => del("pets/", id),
  count: async <T = { count: number }>() => (await api.get<T>("pets/count/")).data,
};

// Medical cards and usages
export const MedicalCards = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("medical-cards/", params),
  get: <T = unknown>(id: ID) => get<T>("medical-cards/", id),
  byUser: async <T = unknown>(userId: ID, params?: Record<string, unknown>) => {
    const { data } = await api.get<T | T[]>(`medical-cards/by-user/${userId}/`, { params });
    // Normalize: some backends may return a single object
    return data as any;
  },
  totalFeeByUser: async <T = { client: number; total_all: string; total_unpaid: string; total_waiting_for_payment: string }>(
    userId: ID
  ) => {
    const { data } = await api.get<T>(`medical-cards/total-fee/by-user/${userId}/`);
    return data;
  },
  confirmPayment: async <T = any>(id: ID, body?: { method?: "CASH" | "CLICK" | "PAYME" | "OTHER"; note?: string }) => {
    const { data } = await api.post<T>(`medical-cards/${id}/confirm-payment/`, body ?? {});
    return data;
  },
  receivePayment: async <T = any>(
    id: ID,
    body: { amount: string; method: "CASH" | "CLICK" | "PAYME" | "OTHER"; note?: string }
  ) => {
    const { data } = await api.post<T>(`medical-cards/${id}/receive-payment/`, body);
    return data;
  },
  partlyPaid: async <T = any>() => {
    const { data } = await api.get<T>("medical-cards/partly-paid/");
    return data;
  },
  attachments: {
    list: async <T = any>(cardId: ID) => {
      const { data } = await api.get<T | T[]>(`medical-cards/${cardId}/attachments/`);
      return data as any;
    },
    upload: async <T = any>(cardId: ID, formData: FormData) => {
      const { data } = await api.post<T | T[]>(`medical-cards/${cardId}/attachments/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      } as any);
      return data as any;
    },
  },
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("medical-cards/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("medical-cards/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("medical-cards/", id, body),
  remove: (id: ID) => del("medical-cards/", id),
};

// Catalogs (services, medicines, pet feeds)
export const Services = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("services/", params),
  get: <T = unknown>(id: ID) => get<T>("services/", id),
  count: async <T = { count: number }>() => (await api.get<T>("services/count/")).data,
};

export const Medicines = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("medicines/", params),
  get: <T = unknown>(id: ID) => get<T>("medicines/", id),
  availableCount: async <T = { count: number }>() => (await api.get<T>("medicines/available-count/")).data,
};

export type PetFeed = {
  id: number;
  name: string; // consolidated display name (if backend provides)
  factory_name: string;
  brand_name: string;
  product_name: string;
  animal_type: "DOG" | "CAT";
  age_group: "JUNIOR" | "ADULT" | "SENIOR";
  package_weight_kg: string; // package weight for reference
  price_per_kg: string; // inventory pricing basis
  available_weight_kg: string; // current stock in kg
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const PetFeeds = {
  list: <T = PetFeed[]>(params?: Record<string, unknown>) => list<T>("pet-feeds/", params),
  get: <T = PetFeed>(id: ID) => get<T>("pet-feeds/", id),
};

export type FeedSaleItem = {
  id: number;
  feed: number;
  quantity_kg: string;
  unit_price: string;
  line_total: string;
  created_at: string;
};

export type FeedSaleStatus = "WAITING" | "PARTLY_PAID" | "PAID";

export type FeedSale = {
  id: number;
  client: number;
  pet: number | null;
  moderator: number;
  status: FeedSaleStatus;
  total_amount: string;
  amount_paid: string;
  created_at: string;
  updated_at: string;
  items: FeedSaleItem[];
};

export const FeedSales = {
  list: <T = FeedSale[]>(params?: Record<string, unknown>) => list<T>("feed-sales/", params),
  get: <T = FeedSale>(id: ID) => get<T>("feed-sales/", id),
  create: <T = FeedSale>(body: { client: ID; pet?: ID | null; moderator?: ID | null; items: { feed: ID; quantity_kg: string }[] }) =>
    post<T>("feed-sales/", body),
  pay: <T = FeedSale>(id: ID, body: { amount: string }) => post<T>(`feed-sales/${id}/pay/`, body),
};

export const ServiceUsages = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("service-usages/", params),
  get: <T = unknown>(id: ID) => get<T>("service-usages/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("service-usages/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("service-usages/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("service-usages/", id, body),
  remove: (id: ID) => del("service-usages/", id),
};

export const MedicineUsages = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("medicine-usages/", params),
  get: <T = unknown>(id: ID) => get<T>("medicine-usages/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("medicine-usages/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("medicine-usages/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("medicine-usages/", id, body),
  remove: (id: ID) => del("medicine-usages/", id),
};

// Payment transactions
export const PaymentTransactions = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("payment-transactions/", params),
  methodTotals: async <T = { totals: Record<string, string>; grand_total: string }>(params?: Record<string, unknown>) =>
    (await api.get<T>("payment-transactions/method-totals/", { params })).data,
};

// Legacy FeedUsages API kept for historical data (no longer used in new flows)
// FeedUsages API removed from backend; historical data not queried by frontend anymore.

// Schedule
export const Schedules = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("schedules/", params),
  get: <T = unknown>(id: ID) => get<T>("schedules/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("schedules/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("schedules/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("schedules/", id, body),
  remove: (id: ID) => del("schedules/", id),
};

// Stationary rooms
export const StationaryRooms = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("stationary-rooms/", params),
  get: <T = unknown>(id: ID) => get<T>("stationary-rooms/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("stationary-rooms/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("stationary-rooms/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("stationary-rooms/", id, body),
  remove: (id: ID) => del("stationary-rooms/", id),
  free: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("stationary-rooms/free/", params),
  taken: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("stationary-rooms/taken/", params),
};

// Tasks
export const Tasks = {
  list: <T = unknown>(params?: Record<string, unknown>) => list<T[]>("tasks/", params),
  get: <T = unknown>(id: ID) => get<T>("tasks/", id),
  create: <T = unknown>(body: Record<string, unknown>) => post<T>("tasks/", body),
  update: <T = unknown>(id: ID, body: Record<string, unknown>) => put<T>("tasks/", id, body),
  patch: <T = unknown>(id: ID, body: Record<string, unknown>) => patch<T>("tasks/", id, body),
  remove: (id: ID) => del("tasks/", id),
  
  // Nurse creates task from medical card
  createFromMedicalCard: async <T = unknown>(body: {
    medical_card: ID;
    service: ID;
    datetime?: string;
  }) => (await api.post<T>("tasks/create-from-medical-card/", body)).data,
  
  // Nurse-specific task endpoints (optional - may use payment-transactions paths per API guide)
  getToDoByNurseId: async <T = any>(nurseId: ID) => 
    (await api.get<T>(`payment-transactions/to-do/by_id/${nurseId}/`)).data,
  getDoneByNurseId: async <T = any>(nurseId: ID) => 
    (await api.get<T>(`payment-transactions/done/by_id/${nurseId}/`)).data,
  getDoneTodayByNurseId: async <T = any>(nurseId: ID) => 
    (await api.get<T>(`payment-transactions/done/today/by_id/${nurseId}/`)).data,
};

// Payments (read-only)
export const Payments = {
  list: <T = any>() => list<T[]>("payments/"),
  get: <T = any>(id: ID) => get<T>("payments/", id),
  daily: <T = any>() => (api.get<T>("payments/daily/").then((r) => r.data)),
  weekly: <T = any>() => (api.get<T>("payments/weekly/").then((r) => r.data)),
  monthly: <T = any>() => (api.get<T>("payments/monthly/").then((r) => r.data)),
  yearly: <T = any>() => (api.get<T>("payments/yearly/").then((r) => r.data)),
};

// Salary API - includes staff summary for moderators and individual history
export type StaffSalaryEntry = {
  user_id: number;
  name: string;
  role: "DOCTOR" | "NURSE" | string;
  amount: string;
  is_disbursed: boolean;
  daily_salary_id: number | null;
};

export type StaffSalarySummary = {
  date: string;
  staff_salaries: StaffSalaryEntry[];
};

export const Salary = {
  // Moderators/Admins only - daily summary of all staff salaries; optional date param (YYYY-MM-DD)
  dailyStaffSummary: async <T = StaffSalarySummary>(date?: string) => {
    const params = date ? { date } : undefined;
    return (await api.get<T>("salary/daily/staff-summary/", { params })).data;
  },

  // Moderators/Admins only - mark a staff member's salary as disbursed
  disburse: async (userId: ID, date?: string) =>
    (await api.post(`salary/daily/${userId}/pay/`, date ? { date } : {})).data,

  // Individual salary history (user can view their own, moderators/admins can view anyone's)
  history: {
    daily: async <T = any>(userId: ID) =>
      (await api.get<T>(`salary/history/${userId}/daily/`)).data,
    weekly: async <T = any>(userId: ID) =>
      (await api.get<T>(`salary/history/${userId}/weekly/`)).data,
    monthly: async <T = any>(userId: ID) =>
      (await api.get<T>(`salary/history/${userId}/monthly/`)).data,
  },
};

// Legacy export for backward compatibility
export const SalaryHistory = Salary.history;

// /me endpoint
export type ClientProfile = {
  type?: "CLIENT";
  address?: string;
  extra_number1?: string;
  extra_number2?: string;
};

export type MeResponse = {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  image: string | null;
  role: "ADMIN" | "MODERATOR" | "DOCTOR" | "NURSE" | "CLIENT" | null;
  is_staff: boolean;
  is_active: boolean;
  profile?: ClientProfile | Record<string, unknown>;
};

export const Me = {
  get: async (): Promise<MeResponse> => {
    const { data } = await api.get<MeResponse>("me/");
    return data;
  },
};

// Visits
export const Visits = {
  list: async <T = any>(params?: Record<string, unknown>) => (await api.get<T>("visits/", { params })).data,
  create: async <T = any>(body: Record<string, unknown>) => (await api.post<T>("visits/", body)).data,
};

// Client management (moderator/admin)
export const Moderator = {
  setClientPassword: async (clientId: ID, new_password: string) =>
    (await api.post<{ detail: string }>(`clients/${clientId}/set-password/`, { new_password })).data,
};

// Requests inbox
export const Requests = {
  list: async <T = any>(params?: Record<string, unknown>) => (await api.get<T>("requests/", { params })).data,
  create: async <T = any>(body: { first_name: string; last_name: string; phone_number: string; description: string }) =>
    (await api.post<T>("requests/", body)).data,
};

// Utility endpoints
export const Utils = {
  usedPhones: async (): Promise<{ count: number; results: string[] }> => {
    const { data } = await api.get<{ count: number; results: string[] }>("users/used-phones/");
    return data;
  },
};

// Nurse Care Cards
export type NurseCareServiceSnapshot = {
  id: number;
  service: number;
  service_name: string;
  price: string; // decimal as string
  nurse_share_percent?: string;
  created_at?: string;
};

export type NurseCareCard = {
  id: number;
  created_by: number;
  nurse: number;
  client: number;
  pet: number;
  description: string | null;
  status: "WAITING_FOR_PAYMENT" | "PARTLY_PAID" | "FULLY_PAID" | string;
  total_amount: string; // decimal as string
  amount_paid: string; // decimal as string
  last_payment_method?: "CASH" | "CLICK" | "PAYME" | "OTHER" | null | string;
  created_at?: string;
  updated_at?: string;
  services: NurseCareServiceSnapshot[];
};

export const NurseCareCards = {
  list: <T = NurseCareCard[]>(params?: Record<string, unknown>) => list<T>("nurse-care-cards/", params),
  get: <T = NurseCareCard>(id: ID) => get<T>("nurse-care-cards/", id),
  create: <T = NurseCareCard>(body: {
    nurse: ID;
    client: ID;
    pet: ID;
    description?: string;
    service_ids?: ID[];
  }) => post<T>("nurse-care-cards/", body),
  mine: async <T = NurseCareCard[]>() => (await api.get<T>("nurse-care-cards/mine/")).data,
  client: async <T = NurseCareCard[]>() => (await api.get<T>("nurse-care-cards/client/")).data,
  updateInfo: async <T = NurseCareCard>(id: ID, body: { description?: string; service_ids?: ID[] }) =>
    (await api.patch<T>(`nurse-care-cards/${id}/info/`, body)).data,
  recordPayment: async <T = NurseCareCard>(
    id: ID,
    body: { amount_paid: string; method: "CASH" | "CARD" | "TRANSFER" }
  ) => (await api.patch<T>(`nurse-care-cards/${id}/payment/`, body)).data,
};
