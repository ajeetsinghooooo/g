import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Tag,
  CheckCircle,
  AlertCircle,
  X,
  Bike,
  Store,
  Sparkles,
  Coins,
  Wallet,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useWallet } from '../context/WalletContext';
import { calculateRewardCoins, formatCoins, coinsToRupees } from '../utils/loyalty';
import { formatCurrency } from '../utils/pricing';

interface CartViewProps {
  onNavigate: (path: string) => void;
}

export const CartView: React.FC<CartViewProps> = ({ onNavigate }) => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    orderType,
    setOrderType,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    deliveryCharge,
    gstAmount,
    discount,
    grandTotal,
  } = useCart();
  const { settings, coupons } = useSettings();
  const { wallet, rules } = useWallet();

  const rewardCalc = calculateRewardCoins(grandTotal, 0, rules);

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ success: boolean; text: string } | null>(
    null
  );

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = codeToApply || couponInput;
    if (!code.trim()) return;
    const res = applyCoupon(code);
    setCouponMessage({ success: res.success, text: res.message });
    if (res.success) {
      setCouponInput('');
    }
  };

  if (cart.length === 0) {
    return (
      <div
        id="empty-cart-container"
        className="max-w-xl mx-auto py-16 px-4 text-center space-y-4"
      >
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl mx-auto flex items-center justify-center border border-amber-200">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Explore Kitchen Cruze's rich selection of freshly prepared biryanis, pizzas, and starters.
        </p>
        <button
          id="empty-cart-browse-menu-btn"
          onClick={() => onNavigate('/menu')}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center space-x-2"
        >
          <span>Browse Fresh Menu</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const minOrder = settings.minimumOrder || 0;
  const isBelowMinOrder = minOrder > 0 && subtotal < minOrder;

  return (
    <div id="customer-cart-view" className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Food Cart</h1>
          <p className="text-xs text-slate-500">
            {cart.length} item{cart.length === 1 ? '' : 's'} added from Kitchen Cruze
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Items list and Order Type */}
        <div className="lg:col-span-7 space-y-5">
          {/* Order Type Selector */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Choose Order Mode
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="cart-order-type-delivery"
                onClick={() => setOrderType('Delivery')}
                className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                  orderType === 'Delivery'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    orderType === 'Delivery' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Doorstep Delivery</h4>
                  <p className="text-[11px] text-slate-500">
                    {deliveryCharge > 0 ? `₹${formatCurrency(deliveryCharge)} charge` : 'Free / At checkout'}
                  </p>
                </div>
              </button>

              <button
                id="cart-order-type-pickup"
                onClick={() => setOrderType('Pickup')}
                className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                  orderType === 'Pickup'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    orderType === 'Pickup' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Self Pickup</h4>
                  <p className="text-[11px] text-emerald-600 font-bold">Free (Counter)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {cart.map((item) => {
              const addonsTotal =
                item.selectedAddons?.reduce((sum, a) => sum + a.price, 0) || 0;
              const unitTotal = item.price + addonsTotal;
              const lineTotal = unitTotal * item.quantity;

              return (
                <div key={item.id} className="p-4 flex items-start gap-3.5">
                  {/* Item Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-18 h-18 rounded-2xl object-cover shrink-0 bg-slate-100 border border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <div
                            className={`h-3.5 w-3.5 rounded-xs border flex items-center justify-center ${
                              item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                          >
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                        </div>

                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Add-ons:{' '}
                            {item.selectedAddons
                              .map((a) => `${a.name} (+₹${a.price})`)
                              .join(', ')}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <p className="text-[11px] text-amber-700 italic mt-0.5">
                            Note: "{item.specialInstructions}"
                          </p>
                        )}
                      </div>

                      {/* Delete Item */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price and Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-extrabold text-sm text-slate-900">₹{lineTotal}</span>
                        {item.quantity > 1 && (
                          <span className="text-[11px] text-slate-400">
                            (₹{unitTotal} each)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-700 rounded-md transition shadow-2xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-700 rounded-md transition shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Bill Details & Coupons */}
        <div className="lg:col-span-5 space-y-5">
          {/* Coupon Code Input & Available Coupons */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>Coupons &amp; Offers</span>
            </span>

            {appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-xs text-emerald-900">
                      {appliedCoupon.couponCode || (appliedCoupon as any).code} Applied
                    </span>
                    <p className="text-[10px] text-emerald-700">You saved ₹{discount}!</p>
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  onClick={() => handleApplyCoupon()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-2xs transition"
                >
                  Apply
                </button>
              </div>
            )}

            {couponMessage && (
              <p
                className={`text-xs font-medium flex items-center space-x-1 ${
                  couponMessage.success ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {couponMessage.success ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{couponMessage.text}</span>
              </p>
            )}

            {/* Quick Coupons List */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Available Coupons
              </span>
              {(coupons || []).map((c: any) => {
                const couponCode = c.couponCode || c.code;
                const discountLabel = c.discountType === 'percentage' ? `${c.discountValue || c.value}% OFF` : `₹${c.discountValue || c.value} OFF`;
                return (
                  <div
                    key={couponCode}
                    onClick={() => handleApplyCoupon(couponCode)}
                    className="p-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 flex items-center justify-between cursor-pointer transition text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-amber-900">{couponCode}</span>
                      <span className="text-slate-500 text-[11px] ml-1.5">
                        ({discountLabel} on min ₹{c.minimumOrder})
                      </span>
                    </div>
                    <span className="text-amber-700 font-bold text-[11px]">APPLY</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bill Breakdown Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Bill Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount Applied ({appliedCoupon?.couponCode || (appliedCoupon as any)?.code})</span>
                  <span>-₹{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Delivery Charges</span>
                <span className="font-bold text-slate-900">
                  {orderType === 'Pickup' ? (
                    <span className="text-emerald-600 font-bold">FREE (Self-Pickup)</span>
                  ) : (
                    `₹${formatCurrency(deliveryCharge)}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>
                  GST {settings.gst?.enabled && (settings.gst.percentage || 0) > 0 ? `(${settings.gst.percentage}%)` : ''}
                </span>
                <span className="font-bold text-slate-900">
                  ₹{formatCurrency(gstAmount)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-black text-slate-900">Grand Total</span>
                  <p className="text-[10px] text-slate-400">Total payable amount</p>
                </div>
                <span className="text-xl font-extrabold text-amber-600">₹{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* 3% Loyalty Points Earning Preview */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Earn 3% Loyalty Points</span>
                </span>
                <span className="font-black text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md text-[11px]">
                  +{formatCoins(rewardCalc.coinsEarned)} Points (= ₹{rewardCalc.coinValueRupees.toFixed(2)})
                </span>
              </div>

              <p className="text-[11px] text-amber-900 leading-tight">
                🎉 Earn <strong>{formatCoins(rewardCalc.coinsEarned)} loyalty points</strong> (3% of order total) on this order! Points can be redeemed for future discounts at checkout.
              </p>

              {(wallet?.coins ?? 0) > 0 && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900">
                  <span>Available Points Balance:</span>
                  <span className="font-bold text-amber-800">{formatCoins(wallet?.coins ?? 0)} points (₹{coinsToRupees(wallet?.coins ?? 0, rules.conversionRate || 1).toFixed(2)} off at Checkout)</span>
                </div>
              )}
            </div>

            {/* Customer Wallet Balance Hint */}
            {(wallet?.balance ?? 0) > 0 && (
              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  <span>Wallet Funds Available:</span>
                </span>
                <span className="font-black text-emerald-700">₹{(wallet?.balance ?? 0).toFixed(2)}</span>
              </div>
            )}

            {/* Minimum Order Alert */}
            {isBelowMinOrder && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Minimum order amount is ₹{minOrder}. Please add ₹
                  {minOrder - subtotal} more.
                </span>
              </div>
            )}

            {/* Proceed to Checkout CTA */}
            <button
              id="cart-proceed-checkout-btn"
              onClick={() => onNavigate('/checkout')}
              disabled={isBelowMinOrder}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                isBelowMinOrder
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-99'
              }`}
            >
              <span>Order Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
