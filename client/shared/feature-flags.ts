export interface FeatureFlags {
  enableBulkBooking: boolean;
  enableSubscriptions: boolean;
  enableDataReset: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  if (typeof process !== "undefined" && process.env) {
    return {
      enableBulkBooking: process.env.ENABLE_BULK_BOOKING === "true",
      enableSubscriptions: process.env.ENABLE_SUBSCRIPTIONS === "true",
      enableDataReset: process.env.ENABLE_DATA_RESET === "true",
    };
  }

  if (typeof import.meta !== "undefined" && import.meta.env) {
    return {
      enableBulkBooking: import.meta.env.VITE_ENABLE_BULK_BOOKING === "true",
      enableSubscriptions: import.meta.env.VITE_ENABLE_SUBSCRIPTIONS === "true",
      enableDataReset: import.meta.env.VITE_ENABLE_DATA_RESET === "true",
    };
  }

  return {
    enableBulkBooking: true, // Enable by default for production readiness
    enableSubscriptions: true, // Enable by default for production readiness
    enableDataReset: false,
  };
}

export const isBulkBookingEnabled = (): boolean => {
  return getFeatureFlags().enableBulkBooking;
};

export const isSubscriptionsEnabled = (): boolean => {
  return getFeatureFlags().enableSubscriptions;
};

export const isDataResetEnabled = (): boolean => {
  return getFeatureFlags().enableDataReset;
};
