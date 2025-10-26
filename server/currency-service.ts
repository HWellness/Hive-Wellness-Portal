import { z } from "zod";

// Exchange rates - in production this would come from a live API
export const EXCHANGE_RATES = {
  USD_TO_GBP: 0.80, // $1 USD = £0.80 GBP (configurable)
  GBP_TO_USD: 1.25  // £1 GBP = $1.25 USD
} as const;

// Currency validation schema
export const currencySchema = z.enum(['GBP', 'USD']).default('GBP');

export type SupportedCurrency = z.infer<typeof currencySchema>;

export interface CurrencyAmount {
  amount: number;
  currency: SupportedCurrency;
}

export interface ConvertedAmount extends CurrencyAmount {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  exchangeRate: number;
  convertedAt: Date;
}

export class CurrencyService {
  private readonly defaultCurrency: SupportedCurrency = 'GBP';

  /**
   * Convert USD to GBP using current exchange rate
   */
  convertUSDtoGBP(usdAmount: number): number {
    if (typeof usdAmount !== 'number' || isNaN(usdAmount)) {
      throw new Error('Invalid USD amount provided');
    }
    return Math.round(usdAmount * EXCHANGE_RATES.USD_TO_GBP * 100) / 100;
  }

  /**
   * Convert GBP to USD using current exchange rate
   */
  convertGBPtoUSD(gbpAmount: number): number {
    if (typeof gbpAmount !== 'number' || isNaN(gbpAmount)) {
      throw new Error('Invalid GBP amount provided');
    }
    return Math.round(gbpAmount * EXCHANGE_RATES.GBP_TO_USD * 100) / 100;
  }

  /**
   * Convert between currencies with full metadata
   */
  convertCurrency(
    amount: number, 
    fromCurrency: SupportedCurrency, 
    toCurrency: SupportedCurrency
  ): ConvertedAmount {
    if (fromCurrency === toCurrency) {
      return {
        amount,
        currency: toCurrency,
        originalAmount: amount,
        originalCurrency: fromCurrency,
        exchangeRate: 1.0,
        convertedAt: new Date()
      };
    }

    let convertedAmount: number;
    let exchangeRate: number;

    if (fromCurrency === 'USD' && toCurrency === 'GBP') {
      convertedAmount = this.convertUSDtoGBP(amount);
      exchangeRate = EXCHANGE_RATES.USD_TO_GBP;
    } else if (fromCurrency === 'GBP' && toCurrency === 'USD') {
      convertedAmount = this.convertGBPtoUSD(amount);
      exchangeRate = EXCHANGE_RATES.GBP_TO_USD;
    } else {
      throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
    }

    return {
      amount: convertedAmount,
      currency: toCurrency,
      originalAmount: amount,
      originalCurrency: fromCurrency,
      exchangeRate,
      convertedAt: new Date()
    };
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(
    amount: number, 
    currency: SupportedCurrency = this.defaultCurrency,
    locale: string = 'en-GB'
  ): string {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return `${this.getCurrencySymbol(currency)}0.00`;
    }

    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return formatter.format(amount);
    } catch (error) {
      // Fallback formatting if Intl fails
      return `${this.getCurrencySymbol(currency)}${amount.toFixed(2)}`;
    }
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: SupportedCurrency): string {
    switch (currency) {
      case 'GBP':
        return '£';
      case 'USD':
        return '$';
      default:
        return '';
    }
  }

  /**
   * Get Google Workspace plan costs in specified currency
   */
  getWorkspacePlanCosts(currency: SupportedCurrency = 'GBP') {
    // Base costs in USD (Google Workspace pricing)
    const baseCostsUSD = {
      'business-starter': 6.00,
      'business-standard': 12.00,
      'business-plus': 18.00
    } as const;

    if (currency === 'USD') {
      return baseCostsUSD;
    }

    // Convert to GBP
    const costsGBP = {
      'business-starter': this.convertUSDtoGBP(baseCostsUSD['business-starter']),
      'business-standard': this.convertUSDtoGBP(baseCostsUSD['business-standard']),
      'business-plus': this.convertUSDtoGBP(baseCostsUSD['business-plus'])
    } as const;

    return costsGBP;
  }

  /**
   * Get overage costs in specified currency
   */
  getOverageCosts(currency: SupportedCurrency = 'GBP') {
    // Base overage costs in USD
    const baseOverageCostsUSD = {
      storagePerGB: 0.04,        // $0.04 per GB over quota
      apiCallsPer1000: 0.002,    // $0.002 per 1000 API calls over limit
      meetRecordingPerHour: 5.00 // $5 per hour of recorded meetings
    } as const;

    if (currency === 'USD') {
      return baseOverageCostsUSD;
    }

    // Convert to GBP
    const overageCostsGBP = {
      storagePerGB: this.convertUSDtoGBP(baseOverageCostsUSD.storagePerGB),
      apiCallsPer1000: this.convertUSDtoGBP(baseOverageCostsUSD.apiCallsPer1000),
      meetRecordingPerHour: this.convertUSDtoGBP(baseOverageCostsUSD.meetRecordingPerHour)
    } as const;

    return overageCostsGBP;
  }

  /**
   * Validate currency parameter from request
   */
  validateCurrency(currency: unknown): SupportedCurrency {
    return currencySchema.parse(currency);
  }

  /**
   * Create currency amount object
   */
  createCurrencyAmount(amount: number, currency: SupportedCurrency = 'GBP'): CurrencyAmount {
    return {
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      currency: this.validateCurrency(currency)
    };
  }

  /**
   * Add two currency amounts (converts to same currency if needed)
   */
  addCurrencyAmounts(
    amount1: CurrencyAmount, 
    amount2: CurrencyAmount, 
    targetCurrency?: SupportedCurrency
  ): CurrencyAmount {
    const target = targetCurrency || amount1.currency;
    
    let convertedAmount1 = amount1.amount;
    let convertedAmount2 = amount2.amount;
    
    if (amount1.currency !== target) {
      convertedAmount1 = this.convertCurrency(amount1.amount, amount1.currency, target).amount;
    }
    
    if (amount2.currency !== target) {
      convertedAmount2 = this.convertCurrency(amount2.amount, amount2.currency, target).amount;
    }
    
    return this.createCurrencyAmount(convertedAmount1 + convertedAmount2, target);
  }

  /**
   * Calculate percentage change between two currency amounts
   */
  calculatePercentageChange(current: CurrencyAmount, previous: CurrencyAmount): number {
    if (previous.amount === 0) return 0;
    
    // Convert to same currency for comparison
    const currentConverted = previous.currency !== current.currency 
      ? this.convertCurrency(current.amount, current.currency, previous.currency).amount
      : current.amount;
    
    return ((currentConverted - previous.amount) / previous.amount) * 100;
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();

// Export currency constants for use in other modules
export const WORKSPACE_PLAN_COSTS_GBP = currencyService.getWorkspacePlanCosts('GBP');
export const WORKSPACE_PLAN_COSTS_USD = currencyService.getWorkspacePlanCosts('USD');
export const OVERAGE_COSTS_GBP = currencyService.getOverageCosts('GBP');
export const OVERAGE_COSTS_USD = currencyService.getOverageCosts('USD');