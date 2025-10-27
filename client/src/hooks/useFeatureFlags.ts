import { useQuery } from "@tanstack/react-query";

interface FeatureFlags {
  enableBulkBooking: boolean;
  enableDataReset: boolean;
}

export function useFeatureFlags() {
  const { data, isLoading } = useQuery<FeatureFlags>({
    queryKey: ["/api/feature-flags"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    flags: data || { enableBulkBooking: false, enableDataReset: false },
    isLoading,
    isBulkBookingEnabled: data?.enableBulkBooking ?? false,
    isDataResetEnabled: data?.enableDataReset ?? false,
  };
}
