import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  medical_data_processing: boolean;
}

interface ConsentStatus {
  success: boolean;
  consents: ConsentPreferences;
  hasResponded: boolean;
}

/**
 * Hook to manage consent banner visibility
 * Shows banner for ALL visitors (authenticated and unauthenticated) who haven't set consent preferences
 */
export function useConsentBanner() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Fetch current consent status from backend
  const { data: consentStatus, isLoading: consentLoading } = useQuery<ConsentStatus>({
    queryKey: ["/api/user/consent"],
    enabled: !authLoading, // Enable for ALL visitors, not just authenticated
    retry: false,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (authLoading || consentLoading) return;

    // GDPR consent required for ALL visitors (authenticated and unauthenticated)
    // Check localStorage first for quick UI response
    const localConsentGiven = localStorage.getItem("gdpr_consent_given");

    if (localConsentGiven === "true") {
      // User has already interacted with consent banner in this session
      setShowBanner(false);
      return;
    }

    // Check if backend has consent records
    if (consentStatus) {
      // Backend explicitly tracks whether user has responded (even if they rejected all)
      if (consentStatus.hasResponded) {
        // User has made a choice previously (accept, reject, or custom)
        setShowBanner(false);
      } else {
        // User hasn't made a choice yet - show banner
        setIsFirstTime(true);
        setShowBanner(true);
      }
    } else {
      // No consent data - first time user
      setIsFirstTime(true);
      setShowBanner(true);
    }
    // Use consentStatus.hasResponded instead of the whole object to avoid unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, consentLoading, consentStatus?.hasResponded]);

  const handleClose = () => {
    // Only hide banner, don't mark as completed
    // User must explicitly accept/reject/save for consent to be recorded
    setShowBanner(false);
  };

  const markConsentAsGiven = () => {
    // Mark consent as given in localStorage after explicit choice
    localStorage.setItem("gdpr_consent_given", "true");
    localStorage.setItem("gdpr_consent_timestamp", new Date().toISOString());
    setShowBanner(false);
  };

  return {
    showBanner,
    isFirstTime,
    handleClose,
    markConsentAsGiven,
    isLoading: authLoading || consentLoading,
  };
}
