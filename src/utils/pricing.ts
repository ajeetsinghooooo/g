import { DeliveryRules, GstSettings, RestaurantSettings } from '../types';

export interface CalculateOrderPricingParams {
  subtotal: number;
  discount?: number;
  orderType?: 'Delivery' | 'Pickup';
  distanceKm?: number;
  settings?: RestaurantSettings;
}

export interface OrderPricingResult {
  subtotal: number;
  discount: number;
  taxableSubtotal: number;
  deliveryCharge: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
}

/**
 * Clean, consistent currency formatting:
 * Integer values: "138", "20", "0"
 * Decimal values: "6.90", "144.90", "164.90"
 */
export const formatCurrency = (amount: number): string => {
  const clean = Number(amount) || 0;
  if (isNaN(clean)) return '0';
  return clean % 1 === 0 ? clean.toFixed(0) : clean.toFixed(2);
};

/**
 * Pure calculation logic matching KITCHEN CRUZE specification:
 * SUBTOTAL = sum of product prices × quantities
 * DELIVERY CHARGE = Admin-configured distance-based delivery charge (or 0 if not configured/pickup)
 * GST = Admin-configured GST percentage applied to taxable subtotal (or 0 if disabled/not configured)
 * GRAND TOTAL = SUBTOTAL (- DISCOUNT) + DELIVERY CHARGE + GST
 */
export function calculateOrderPricing({
  subtotal,
  discount = 0,
  orderType = 'Delivery',
  distanceKm = 0,
  settings,
}: CalculateOrderPricingParams): OrderPricingResult {
  const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
  const cleanDiscount = Math.min(cleanSubtotal, Math.max(0, Number(discount) || 0));
  const taxableSubtotal = Math.max(0, cleanSubtotal - cleanDiscount);

  // 1. DELIVERY CHARGE CALCULATION
  // Admin-controlled. If Admin has not configured delivery charges, MUST be ₹0.
  let deliveryCharge = 0;
  if (orderType === 'Delivery' && settings && cleanSubtotal > 0) {
    const rules: DeliveryRules | undefined = settings.deliveryRules;

    // Check free delivery threshold if configured by Admin
    if (rules?.freeDeliveryThreshold && rules.freeDeliveryThreshold > 0 && cleanSubtotal >= rules.freeDeliveryThreshold) {
      deliveryCharge = 0;
    } else if (rules?.distanceSlabs && rules.distanceSlabs.length > 0) {
      // Find matching distance slab (e.g. 0-2 KM -> ₹0)
      const matchedSlab = rules.distanceSlabs.find(
        (s) => distanceKm >= s.minDistanceKm && (distanceKm < s.maxDistanceKm || (distanceKm === s.maxDistanceKm && s.maxDistanceKm === rules.distanceSlabs[rules.distanceSlabs.length - 1].maxDistanceKm))
      );
      if (matchedSlab) {
        deliveryCharge = Number(matchedSlab.charge) || 0;
      } else {
        const lastSlab = rules.distanceSlabs[rules.distanceSlabs.length - 1];
        if (distanceKm > lastSlab.maxDistanceKm) {
          deliveryCharge = Number(lastSlab.charge) || 0;
        } else if (distanceKm <= 0) {
          // If distance is 0 km, check if first slab starts at 0, otherwise ₹0
          const firstSlab = rules.distanceSlabs[0];
          deliveryCharge = firstSlab.minDistanceKm === 0 ? Number(firstSlab.charge) || 0 : 0;
        } else {
          deliveryCharge = Number(rules.distanceSlabs[0].charge) || 0;
        }
      }
    } else if (rules?.deliveryChargePerKm && rules.deliveryChargePerKm > 0 && distanceKm > 0) {
      deliveryCharge = Math.round(rules.deliveryChargePerKm * distanceKm);
    } else if (rules?.baseDeliveryCharge && rules.baseDeliveryCharge > 0) {
      deliveryCharge = Number(rules.baseDeliveryCharge) || 0;
    } else if (settings.deliveryCharge && settings.deliveryCharge > 0) {
      deliveryCharge = Number(settings.deliveryCharge) || 0;
    } else {
      // If Admin has not configured delivery charges: MUST be 0
      deliveryCharge = 0;
    }
  }

  // 2. GST CALCULATION
  let gstAmount = 0;
  let gstRate = 0;
  if (settings?.gst?.enabled && cleanSubtotal > 0) {
    gstRate = Number(settings.gst.percentage) || 0;
    if (gstRate > 0) {
      gstAmount = parseFloat(((taxableSubtotal * gstRate) / 100).toFixed(2));
    }
  }

  // 3. GRAND TOTAL CALCULATION
  const grandTotal = parseFloat((taxableSubtotal + deliveryCharge + gstAmount).toFixed(2));

  return {
    subtotal: cleanSubtotal,
    discount: cleanDiscount,
    taxableSubtotal,
    deliveryCharge,
    gstRate,
    gstAmount,
    grandTotal,
  };
}
