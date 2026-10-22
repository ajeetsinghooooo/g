export interface LoyaltyCalculation {
  eligibleAmount: number;
  isEligible: boolean;
  coinsEarned: number; // Also known as pointsEarned (3% of order total)
  pointsEarned: number;
  coinValueRupees: number;
  minEligibleOrderAmount: number;
  earningRate: number; // 0.03 = 3%
  conversionRate: number; // 1 = 1 point is ₹1 discount
  shortfall: number;
}

export interface LoyaltyRulesConfig {
  minEligibleOrderAmount?: number; // Default: 0 (all orders earn 3% points)
  earningRate?: number; // Default: 0.03 (3% of order total)
  conversionRate?: number; // Default: 1 (1 point = ₹1 discount)
  minCoinRedemption?: number; // Default: 1 point
  maxCoinRedemptionPerOrder?: number;
  minTopupAmount?: number; // Default: 10
  maxTopupAmount?: number; // Default: 10000
  excludeDelivery?: boolean; // Default: false (3% of full order total)
  excludePackaging?: boolean; // Default: false
  excludeTaxes?: boolean; // Default: false
  cashbackEnabled?: boolean; // Default: true
}

export const DEFAULT_LOYALTY_RULES: Required<LoyaltyRulesConfig> = {
  minEligibleOrderAmount: 0,
  earningRate: 0.03, // 3% of order total
  conversionRate: 1, // 1 point = ₹1 discount value
  minCoinRedemption: 1, // Start redeeming from 1 point
  maxCoinRedemptionPerOrder: 10000,
  minTopupAmount: 10,
  maxTopupAmount: 10000,
  excludeDelivery: false,
  excludePackaging: false,
  excludeTaxes: false,
  cashbackEnabled: true,
};

/**
 * Calculates loyalty points based on:
 * "Customers earn 3% of their order total as points, which can be redeemed for future discounts at checkout."
 *
 * Examples:
 * - ₹100 order -> 3 points (₹3 discount value)
 * - ₹250 order -> 7.5 points (₹7.50 discount value)
 * - ₹500 order -> 15 points (₹15 discount value)
 * - ₹1000 order -> 30 points (₹30 discount value)
 */
export function calculateRewardCoins(
  orderTotal: number,
  discount: number = 0,
  config?: LoyaltyRulesConfig
): LoyaltyCalculation {
  const minEligible = config?.minEligibleOrderAmount ?? DEFAULT_LOYALTY_RULES.minEligibleOrderAmount;
  const earningRate = config?.earningRate ?? DEFAULT_LOYALTY_RULES.earningRate;
  const conversionRate = config?.conversionRate ?? DEFAULT_LOYALTY_RULES.conversionRate;

  // Order total strictly after existing coupon discount
  const rawEligible = Math.max(0, (Number(orderTotal) || 0) - (Number(discount) || 0));
  const eligibleAmount = Number(rawEligible.toFixed(2));

  if (eligibleAmount < minEligible) {
    const shortfall = Number((minEligible - eligibleAmount).toFixed(2));
    return {
      eligibleAmount,
      isEligible: false,
      coinsEarned: 0,
      pointsEarned: 0,
      coinValueRupees: 0,
      minEligibleOrderAmount: minEligible,
      earningRate,
      conversionRate,
      shortfall,
    };
  }

  // Exact 3% proportional calculation with 2 decimal precision (e.g. ₹250 * 0.03 = 7.5 points)
  const rawPoints = eligibleAmount * earningRate;
  const pointsEarned = Math.round(rawPoints * 100) / 100;
  const coinValueRupees = Math.round((pointsEarned / (conversionRate || 1)) * 100) / 100;

  return {
    eligibleAmount,
    isEligible: true,
    coinsEarned: pointsEarned,
    pointsEarned,
    coinValueRupees,
    minEligibleOrderAmount: minEligible,
    earningRate,
    conversionRate,
    shortfall: 0,
  };
}

export const calculateLoyaltyPoints = calculateRewardCoins;

/**
 * Converts points to rupee value using configured conversion rate
 * Default: 1 point = ₹1 discount
 */
export function coinsToRupees(coins: number, conversionRate: number = DEFAULT_LOYALTY_RULES.conversionRate): number {
  const cleanCoins = Math.max(0, Number(coins) || 0);
  const cleanRate = Math.max(0.001, Number(conversionRate) || 1);
  return Math.round((cleanCoins / cleanRate) * 100) / 100;
}

export const pointsToRupees = coinsToRupees;

/**
 * Converts rupees to equivalent points using configured conversion rate
 */
export function rupeesToCoins(rupees: number, conversionRate: number = DEFAULT_LOYALTY_RULES.conversionRate): number {
  const cleanRupees = Math.max(0, Number(rupees) || 0);
  const cleanRate = Math.max(0.001, Number(conversionRate) || 1);
  return Math.round(cleanRupees * cleanRate * 100) / 100;
}

export const rupeesToPoints = rupeesToCoins;

/**
 * Formats points/coins amount:
 * If whole integer: "15", "30"
 * If decimal: "7.5", "10.25"
 */
export function formatCoins(coins: number): string {
  const clean = Number(coins) || 0;
  return clean % 1 === 0 ? clean.toFixed(0) : clean.toFixed(clean * 10 % 1 === 0 ? 1 : 2);
}

export const formatPoints = formatCoins;
