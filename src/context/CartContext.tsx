import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, Product, CustomizationOption, Offer, OrderType } from '../types';
import { useSettings } from './SettingsContext';
import { calculateOrderPricing } from '../utils/pricing';

interface CartContextType {
  cart: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    selectedAddons?: CustomizationOption[],
    specialInstructions?: string
  ) => void;
  removeFromCart: (idOrIndex: string | number) => void;
  updateQuantity: (idOrIndex: string | number, quantity: number) => void;
  clearCart: () => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  appliedOffer: Offer | null;
  appliedCoupon: Offer | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  weightCharge: number;
  packagingCharge: number;
  gstAmount: number;
  grandTotal: number;
  totalItemsCount: number;
  estimatedDistanceKm: number;
  setEstimatedDistanceKm: (dist: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, offers } = useSettings();
  const [orderType, setOrderType] = useState<OrderType>('Delivery');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [estimatedDistanceKm, setEstimatedDistanceKm] = useState<number>(0);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kc_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kc_cart', JSON.stringify(cart));
    } catch (err) {
      console.error('Could not save cart to localStorage:', err);
    }
  }, [cart]);

  // Subtotal calculation - sum of product prices * quantities
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemBasePrice = item.price || item.product?.discountPrice || item.product?.price || 0;
      const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price, 0) || 0;
      return acc + (itemBasePrice + addonsTotal) * item.quantity;
    }, 0);
  }, [cart]);

  // Total weight in grams (retained for metadata)
  const totalWeightGrams = useMemo(() => {
    return cart.reduce((acc, item) => {
      return acc + (item.product?.weight || 250) * item.quantity;
    }, 0);
  }, [cart]);

  // Coupon Discount calculation
  const discount = useMemo(() => {
    if (!appliedOffer || subtotal < appliedOffer.minimumOrder) return 0;
    if (appliedOffer.discountType === 'percentage') {
      const calculated = Math.round((subtotal * appliedOffer.discountValue) / 100);
      return appliedOffer.maximumDiscount ? Math.min(calculated, appliedOffer.maximumDiscount) : calculated;
    }
    return appliedOffer.discountValue;
  }, [appliedOffer, subtotal]);

  // Unified mathematical pricing calculation:
  // Subtotal = sum of product prices * quantities
  // Delivery Charge = Admin-configured distance-based delivery charge (or 0 if not configured/pickup)
  // GST = Admin-configured GST percentage applied to taxable subtotal (or 0 if not configured)
  // Grand Total = Subtotal - Discount + Delivery Charge + GST
  const pricing = useMemo(() => {
    return calculateOrderPricing({
      subtotal,
      discount,
      orderType,
      distanceKm: estimatedDistanceKm,
      settings,
    });
  }, [subtotal, discount, orderType, estimatedDistanceKm, settings]);

  const deliveryCharge = pricing.deliveryCharge;
  const gstAmount = pricing.gstAmount;
  const grandTotal = pricing.grandTotal;
  const packagingCharge = 0;
  const weightCharge = 0;

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const addToCart = (
    product: Product,
    quantity = 1,
    selectedAddons: CustomizationOption[] = [],
    specialInstructions = ''
  ) => {
    setCart((prev) => {
      const addonKey = [...selectedAddons].map((a) => a.id).sort().join('-');
      const existingIdx = prev.findIndex(
        (it) =>
          (it.productId === product.id || it.product.id === product.id) &&
          [...(it.selectedAddons || [])].map((a) => a.id).sort().join('-') === addonKey &&
          (it.specialInstructions || '') === specialInstructions
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: copy[existingIdx].quantity + quantity,
        };
        return copy;
      }

      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product.image,
        isVeg: product.isVeg,
        product,
        quantity,
        selectedAddons,
        specialInstructions,
      };

      return [...prev, newItem];
    });
  };

  const removeFromCart = (idOrIndex: string | number) => {
    if (typeof idOrIndex === 'number') {
      setCart((prev) => prev.filter((_, i) => i !== idOrIndex));
    } else {
      setCart((prev) => prev.filter((it) => it.id !== idOrIndex && it.productId !== idOrIndex));
    }
  };

  const updateQuantity = (idOrIndex: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(idOrIndex);
      return;
    }
    setCart((prev) =>
      prev.map((item, i) => {
        if (typeof idOrIndex === 'number' ? i === idOrIndex : (item.id === idOrIndex || item.productId === idOrIndex)) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedOffer(null);
    localStorage.removeItem('kc_cart');
  };

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = offers.find((o) => o.couponCode.toUpperCase() === cleanCode && o.active);
    if (!found) {
      return { success: false, message: 'Invalid or expired coupon code' };
    }
    if (subtotal < found.minimumOrder) {
      return {
        success: false,
        message: `Add ₹${found.minimumOrder - subtotal} more to apply this coupon`,
      };
    }
    setAppliedOffer(found);
    return { success: true, message: `Coupon ${found.couponCode} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedOffer(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        orderType,
        setOrderType,
        appliedOffer,
        appliedCoupon: appliedOffer,
        applyCoupon,
        removeCoupon,
        subtotal,
        discount,
        deliveryCharge,
        weightCharge,
        packagingCharge,
        gstAmount,
        grandTotal,
        totalItemsCount,
        estimatedDistanceKm,
        setEstimatedDistanceKm,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
