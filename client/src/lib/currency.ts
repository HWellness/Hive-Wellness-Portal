/**
 * Currency formatting utilities for consistent display across the application
 */

export type SupportedCurrency = "GBP" | "USD";

export interface CurrencyAmount {
  amount: number;
  currency: SupportedCurrency;
}

/**
 * Format a currency amount using Intl.NumberFormat for proper localization
 */
export function formatCurrency(
  amount: number | CurrencyAmount,
  currency?: SupportedCurrency,
  locale: string = "en-GB"
): string {
  // Handle CurrencyAmount object
  if (typeof amount === "object" && amount.amount !== undefined) {
    currency = amount.currency;
    amount = amount.amount;
  }

  // Default to GBP if no currency specified
  const targetCurrency = currency || "GBP";

  // Ensure amount is a valid number
  const numericAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(numericAmount);
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const symbol = targetCurrency === "GBP" ? "£" : "$";
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
}

/**
 * Format a currency amount with abbreviated units (K, M, etc.)
 */
export function formatCurrencyCompact(
  amount: number | CurrencyAmount,
  currency?: SupportedCurrency,
  locale: string = "en-GB"
): string {
  // Handle CurrencyAmount object
  if (typeof amount === "object" && amount.amount !== undefined) {
    currency = amount.currency;
    amount = amount.amount;
  }

  const targetCurrency = currency || "GBP";
  const numericAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: targetCurrency,
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });

    return formatter.format(numericAmount);
  } catch (error) {
    // Fallback with manual abbreviation
    const symbol = targetCurrency === "GBP" ? "£" : "$";

    if (numericAmount >= 1000000) {
      return `${symbol}${(numericAmount / 1000000).toFixed(1)}M`;
    } else if (numericAmount >= 1000) {
      return `${symbol}${(numericAmount / 1000).toFixed(1)}K`;
    } else {
      return `${symbol}${numericAmount.toFixed(2)}`;
    }
  }
}

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  switch (currency) {
    case "GBP":
      return "£";
    case "USD":
      return "$";
    default:
      return "£"; // Default to GBP
  }
}

/**
 * Parse a currency string back to numeric amount
 */
export function parseCurrencyString(currencyString: string): number {
  // Remove currency symbols and spaces, then parse as float
  const numericString = currencyString.replace(/[£$,\s]/g, "");
  return parseFloat(numericString) || 0;
}

/**
 * Determine the default currency for the application
 */
export function getDefaultCurrency(): SupportedCurrency {
  return "GBP"; // Default to GBP for UK-based business
}

/**
 * Format percentage values consistently
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format cost per unit (e.g., cost per appointment, per therapist)
 */
export function formatCostPerUnit(
  totalAmount: number | CurrencyAmount,
  units: number,
  unitLabel: string,
  currency?: SupportedCurrency
): string {
  const amount = typeof totalAmount === "object" ? totalAmount.amount : totalAmount;
  const targetCurrency =
    currency || (typeof totalAmount === "object" ? totalAmount.currency : "GBP");

  const perUnitCost = units > 0 ? amount / units : 0;

  return `${formatCurrency(perUnitCost, targetCurrency)} per ${unitLabel}`;
}
