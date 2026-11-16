import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Country, State, City, Pincode, Locality } from '@/types';

// Re-export Locality as CityRecord so the rest of the app keeps compiling
// (City model = what was Locality; District model = what was City)
export type District = City;       // old City type reused for District
export type CityRecord = Locality; // old Locality type reused for City

// ─── API layer ────────────────────────────────────────────────────────────────

export interface LocationPage<T> {
  data: T[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export interface LocationListParams {
  page?: number;
  limit?: number;
  search?: string;
  country_id?: number;
  state_id?: number;
}

const locationsApi = {
  // Countries
  getCountries: async (): Promise<Country[]> => {
    const response = await apiClient.get('/locations/countries', { params: { limit: 1000, is_active: 1 } });
    return response.data.data || [];
  },
  getCountriesPaginated: async (params: LocationListParams): Promise<LocationPage<Country>> => {
    const response = await apiClient.get('/locations/countries', { params });
    return { data: response.data.data || [], pagination: response.data.pagination };
  },
  createCountry: async (data: Partial<Country>): Promise<Country> => {
    const response = await apiClient.post('/locations/countries', data);
    return response.data.data?.country || response.data.country;
  },
  updateCountry: async ({ id, data }: { id: number; data: Partial<Country> }): Promise<Country> => {
    const response = await apiClient.put(`/locations/countries/${id}`, data);
    return response.data.data?.country || response.data.country;
  },
  deleteCountry: async (id: number): Promise<void> => {
    await apiClient.delete(`/locations/countries/${id}`);
  },

  // States
  getStates: async (countryId?: number, hasDistricts?: boolean): Promise<State[]> => {
    const url = countryId ? `/locations/states/${countryId}` : '/locations/states';
    const params: Record<string, unknown> = { limit: 1000, is_active: 1 };
    if (hasDistricts) params.has_districts = 1;
    const response = await apiClient.get(url, { params });
    return response.data.data || [];
  },
  getStatesPaginated: async (params: LocationListParams): Promise<LocationPage<State>> => {
    const response = await apiClient.get('/locations/states', { params });
    return { data: response.data.data || [], pagination: response.data.pagination };
  },
  createState: async (data: Partial<State>): Promise<State> => {
    const response = await apiClient.post('/locations/states', data);
    return response.data.data?.state || response.data.state;
  },
  updateState: async ({ id, data }: { id: number; data: Partial<State> }): Promise<State> => {
    const response = await apiClient.put(`/locations/states/${id}`, data);
    return response.data.data?.state || response.data.state;
  },
  deleteState: async (id: number): Promise<void> => {
    await apiClient.delete(`/locations/states/${id}`);
  },

  // Districts (was Cities → /cities → now /districts)
  getDistricts: async (stateId?: number): Promise<City[]> => {
    const url = stateId ? `/locations/districts/${stateId}` : '/locations/districts';
    const response = await apiClient.get(url, { params: { limit: 1000, is_active: 1, has_cities: 1 } });
    return response.data.data || [];
  },
  getDistrictsPaginated: async (params: LocationListParams): Promise<LocationPage<City>> => {
    const response = await apiClient.get('/locations/districts', { params });
    return { data: response.data.data || [], pagination: response.data.pagination };
  },
  createDistrict: async (data: Partial<City>): Promise<City> => {
    const response = await apiClient.post('/locations/districts', data);
    return response.data.data?.district || response.data.district;
  },
  updateDistrict: async ({ id, data }: { id: number; data: Partial<City> }): Promise<City> => {
    const response = await apiClient.put(`/locations/districts/${id}`, data);
    return response.data.data?.district || response.data.district;
  },
  deleteDistrict: async (id: number): Promise<void> => {
    await apiClient.delete(`/locations/districts/${id}`);
  },

  // Pincodes
  getPincodes: async (districtId: number): Promise<Pincode[]> => {
    const response = await apiClient.get(`/locations/pincodes/${districtId}`, { params: { limit: 1000 } });
    return response.data.data || [];
  },
  createPincode: async (data: Partial<Pincode>): Promise<Pincode> => {
    const response = await apiClient.post('/locations/pincodes', data);
    return response.data.data?.pincode || response.data.pincode;
  },
  updatePincode: async ({ id, data }: { id: number; data: Partial<Pincode> }): Promise<Pincode> => {
    const response = await apiClient.put(`/locations/pincodes/${id}`, data);
    return response.data.data?.pincode || response.data.pincode;
  },
  deletePincode: async (id: number): Promise<void> => {
    await apiClient.delete(`/locations/pincodes/${id}`);
  },

  // Cities (was Localities → /localities → now /cities)
  // districtId=0 or undefined → fetch ALL cities
  getCities: async (districtId?: number): Promise<Locality[]> => {
    const url = districtId ? `/locations/cities/${districtId}` : '/locations/cities';
    const response = await apiClient.get(url, { params: { limit: 1000 } });
    return response.data.data || [];
  },
  getCitiesPaginated: async (params: LocationListParams): Promise<LocationPage<Locality>> => {
    const response = await apiClient.get('/locations/cities', { params });
    return { data: response.data.data || [], pagination: response.data.pagination };
  },
  createCity: async (data: Partial<Locality>): Promise<Locality> => {
    const response = await apiClient.post('/locations/cities', data);
    return response.data.data?.city || response.data.city;
  },
  updateCity: async ({ id, data }: { id: number; data: Partial<Locality> }): Promise<Locality> => {
    const response = await apiClient.put(`/locations/cities/${id}`, data);
    return response.data.data?.city || response.data.city;
  },
  deleteCity: async (id: number): Promise<void> => {
    await apiClient.delete(`/locations/cities/${id}`);
  },
};

// ─── Country hooks ────────────────────────────────────────────────────────────

export function useCountries() {
  return useQuery({
    queryKey: queryKeys.locations.countries(),
    queryFn: locationsApi.getCountries,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createCountry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.countries() });
      toast.success('Country created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create country');
    },
  });
}

export function useUpdateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.updateCountry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.countries() });
      toast.success('Country updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update country');
    },
  });
}

export function useDeleteCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteCountry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.countries() });
      toast.success('Country deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete country');
    },
  });
}

export function useCountriesPaginated(params: LocationListParams) {
  return useQuery({
    queryKey: [...queryKeys.locations.countries(), params],
    queryFn: () => locationsApi.getCountriesPaginated(params),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── State hooks ──────────────────────────────────────────────────────────────

export function useStates(countryId?: number, hasDistricts?: boolean) {
  return useQuery({
    queryKey: [...queryKeys.locations.states(countryId), ...(hasDistricts ? ['has_districts'] : [])],
    queryFn: () => locationsApi.getStates(countryId, hasDistricts),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('State created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create state');
    },
  });
}

export function useUpdateState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.updateState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('State updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update state');
    },
  });
}

export function useDeleteState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('State deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete state');
    },
  });
}

export function useStatesPaginated(params: LocationListParams) {
  return useQuery({
    queryKey: [...queryKeys.locations.states(), params],
    queryFn: () => locationsApi.getStatesPaginated(params),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── District hooks (was City hooks, now call /districts) ────────────────────

/** Load all districts or filter by stateId */
export function useCities(stateId?: number) {
  return useQuery({
    queryKey: queryKeys.locations.cities(stateId),
    queryFn: () => locationsApi.getDistricts(stateId || undefined),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistrictsPaginated(params: LocationListParams) {
  return useQuery({
    queryKey: [...queryKeys.locations.cities(), params],
    queryFn: () => locationsApi.getDistrictsPaginated(params),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createDistrict,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('District created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create district');
    },
  });
}

export function useUpdateCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.updateDistrict,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('District updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update district');
    },
  });
}

export function useDeleteCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteDistrict,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('District deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete district');
    },
  });
}

// ─── Pincode hooks ────────────────────────────────────────────────────────────

export function usePincodes(districtId: number) {
  return useQuery({
    queryKey: queryKeys.locations.pincodes(districtId),
    queryFn: () => locationsApi.getPincodes(districtId),
    enabled: !!districtId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePincode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createPincode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('Pincode created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create pincode');
    },
  });
}

export function useUpdatePincode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.updatePincode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('Pincode updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update pincode');
    },
  });
}

export function useDeletePincode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deletePincode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('Pincode deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete pincode');
    },
  });
}

export function useLocalitiesPaginated(params: LocationListParams) {
  return useQuery({
    queryKey: [...queryKeys.locations.localities(0), params],
    queryFn: () => locationsApi.getCitiesPaginated(params),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── City hooks (was Locality hooks, now call /cities) ───────────────────────
// KEY FIX: districtId=0 now loads ALL cities (no gate). List always shows data.

export function useLocalities(districtId: number) {
  return useQuery({
    queryKey: queryKeys.locations.localities(districtId),
    queryFn: () => locationsApi.getCities(districtId || undefined),
    // Always enabled — districtId=0 fetches all, specific id filters by district
    enabled: true,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLocality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createCity,
    onSuccess: (newCity) => {
      // Invalidate both the specific district's list and the "all" list
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.localities(newCity.city_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.localities(0) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('City created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create city');
    },
  });
}

export function useUpdateLocality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.updateCity,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.localities(updated.city_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.localities(0) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('City updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update city');
    },
  });
}

export function useDeleteLocality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteCity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.localities(0) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success('City deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete city');
    },
  });
}