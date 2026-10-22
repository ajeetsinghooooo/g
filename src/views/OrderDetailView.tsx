import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Share2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Receipt,
  Bike,
  Store,
  Compass,
  Headphones,
  FileText,
  Printer,
  Star,
  Camera,
  X,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '../types';
import { OrderStatusTimeline } from '../components/OrderStatusTimeline';
import { InvoiceModal } from '../components/InvoiceModal';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useOrderNotification } from '../context/OrderNotificationContext';
import { openWhatsAppOrder, generateWhatsAppOrderMessage } from '../utils/whatsapp';
import { formatCurrency } from '../utils/pricing';

interface OrderDetailViewProps {
  orderId: string;
  onNavigate: (path: string) => void;
  onOpenSupport?: (orderId?: string) => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ orderId, onNavigate, onOpenSupport }) => {
  const { settings } = useSettings();
  const { customer, customerToken } = useAuth();
  const { addToCart } = useCart();
  const { latestUpdatedOrder } = useOrderNotification();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [liveAlertBadge, setLiveAlertBadge] = useState<string | null>(null);

  // Review Order State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [selectedDish, setSelectedDish] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setReviewError('Photo must be under 4MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const itemsList = order.items.map((it) => `• ${it.name} x${it.quantity}`).join('\n');
    const msg = `🍽️ *Kitchen Cruze Order #${order.id}*\n\nStatus: *${order.status}*\nItems:\n${itemsList}\n\n*Grand Total:* ₹${formatCurrency(order.grandTotal)}\n\nOrder Tracking: ${window.location.origin}/orders/${order.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleReorder = () => {
    if (!order) return;
    setIsReordering(true);
    order.items.forEach((item) => {
      addToCart(
        {
          id: item.productId,
          name: item.name,
          price: item.price,
          description: '',
          category: 'Main Course',
          image: '',
          isVeg: item.isVeg ?? true,
          isAvailable: true,
        },
        item.quantity,
        item.selectedAddons,
        item.specialInstructions
      );
    });
    setTimeout(() => {
      setIsReordering(false);
      onNavigate('/cart');
    }, 400);
  };

  const handleSubmitOrderReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({
          customerName: reviewerName.trim() || customer?.fullName || order?.customer?.fullName || 'Verified Customer',
          productName: selectedDish || (order?.items[0]?.name ? `${order.items[0].name} & meal` : 'Overall Dining Experience'),
          rating,
          comment: comment.trim(),
          photoUrl: photoUrl || undefined,
          verifiedPurchase: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewSuccess('Thank you! Your review is now live on Kitchen Cruze for everyone to see.');
        setTimeout(() => {
          setIsReviewOpen(false);
          setReviewSuccess(null);
          setComment('');
          setPhotoUrl(null);
        }, 2200);
      } else {
        setReviewError(data.error || 'Failed to submit review');
      }
    } catch (err: any) {
      setReviewError(err.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError('Order not found or access denied');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll for status updates every 6 seconds while active
    const timer = setInterval(() => {
      fetchOrder();
    }, 6000);
    return () => clearInterval(timer);
  }, [orderId, customerToken]);

  // Instantly reflect real-time status updates received from database
  useEffect(() => {
    if (latestUpdatedOrder && latestUpdatedOrder.id === orderId) {
      setOrder(latestUpdatedOrder);
      setLiveAlertBadge(`Order status just changed to "${latestUpdatedOrder.status}" in database!`);
      const timer = setTimeout(() => setLiveAlertBadge(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [latestUpdatedOrder, orderId]);

  const handleCopySummary = () => {
    if (!order) return;
    const msg = generateWhatsAppOrderMessage(order, settings);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Retrieving live order status from Kitchen Cruze...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">{error || 'Order not found'}</h2>
        <button
          onClick={() => onNavigate('/orders')}
          className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div id="customer-order-detail-view" className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button
          id="order-detail-back-btn"
          onClick={() => onNavigate('/orders')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Orders</span>
        </button>

        <button
          onClick={fetchOrder}
          className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-amber-600 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Live Status Notification Alert Banner */}
      {liveAlertBadge && (
        <div
          id="order-live-status-alert-banner"
          className="bg-amber-500 text-slate-950 px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50 animate-pulse"
        >
          <div className="flex items-center space-x-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950" />
            </span>
            <span>⚡ {liveAlertBadge}</span>
          </div>
          <button
            type="button"
            onClick={() => setLiveAlertBadge(null)}
            className="text-slate-950/70 hover:text-slate-950 font-black text-sm px-1.5 py-0.5"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Order Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-amber-950 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
              #{order.id}
            </span>
            <span className="text-xs text-slate-300">
              {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Order Status: {order.status}</h1>
          <p className="text-xs text-slate-300">
            {order.orderType === 'Delivery' ? 'Express Doorstep Delivery' : 'Self-Pickup Counter Order'}
          </p>
        </div>

        {/* WhatsApp Button (Requirement 12) */}
        <button
          id="order-detail-whatsapp-btn"
          onClick={() => openWhatsAppOrder(order, settings)}
          className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center space-x-2 transition shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Send Details to WhatsApp</span>
        </button>
      </div>

      {/* Live Order Timeline (Requirement 11) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Live Order Tracking</span>
        </h2>

        <OrderStatusTimeline
          status={order.status}
          orderType={order.orderType}
          createdAt={order.createdAt}
          updatedAt={order.updatedAt}
        />
      </div>

      {/* Order Summary Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Items List */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>Ordered Items ({order.items.length})</span>
          </h3>

          <div className="divide-y divide-slate-100 space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="pt-2 flex justify-between items-start text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    {item.isVeg !== undefined && (
                      <div
                        className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${
                          item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                        }`}
                        title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                      </div>
                    )}
                    <span>{item.name}</span> <span className="text-amber-600">x {item.quantity}</span>
                  </div>
                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      + {item.selectedAddons.map((a) => a.name).join(', ')}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="text-[11px] text-amber-700 italic mt-0.5">
                      "{item.specialInstructions}"
                    </p>
                  )}
                </div>
                <div className="font-bold text-slate-900 shrink-0">₹{item.itemTotal}</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">₹{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({order.couponCode})</span>
                <span>-₹{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Charges</span>
              <span className="font-bold text-slate-900">
                {order.deliveryCharge > 0 ? `₹${formatCurrency(order.deliveryCharge)}` : '₹0 (Free)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>GST {order.gstRate ? `(${order.gstRate}%)` : ''}</span>
              <span className="font-bold text-slate-900">₹{formatCurrency(order.gstAmount || 0)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline font-black text-sm text-slate-900">
              <span>Grand Total</span>
              <span className="text-base text-amber-600 font-extrabold">₹{formatCurrency(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Customer Information */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            {order.orderType === 'Delivery' ? (
              <Bike className="w-4 h-4 text-amber-500" />
            ) : (
              <Store className="w-4 h-4 text-amber-500" />
            )}
            <span>
              {order.orderType === 'Delivery' ? 'Delivery Destination' : 'Pickup Information'}
            </span>
          </h3>

          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 text-[11px] block">Customer Contact</span>
              <p className="font-bold text-slate-900">{order.customer?.fullName || order.customerName || 'Customer'}</p>
              <p className="text-slate-600">{order.customer?.phone || order.customerPhone || 'N/A'}</p>
            </div>

            {order.orderType === 'Delivery' ? (
              <div>
                <span className="text-slate-400 text-[11px] block">Drop Location</span>
                <p className="font-medium text-slate-800">
                  {order.customer?.deliveryAddress || (order.deliveryAddress ? `${order.deliveryAddress.house}, ${order.deliveryAddress.street}` : 'Not provided')}
                </p>
                {(order.customer?.landmark || order.deliveryAddress?.landmark) && (
                  <p className="text-slate-500">Landmark: {order.customer?.landmark || order.deliveryAddress?.landmark}</p>
                )}
                {(order.customer?.pincode || order.deliveryAddress?.pincode) && (
                  <p className="text-slate-500">Pincode: {order.customer?.pincode || order.deliveryAddress?.pincode}</p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                    <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Distance: {order.deliveryDistanceDisplay || (order.deliveryDistanceKm ? `${order.deliveryDistanceKm} KM` : '2.0 KM')}</span>
                  </span>
                  {order.assignedDeliveryBoyName && (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                      <Bike className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Delivery Partner: #{order.assignedDeliveryBoyNumber || 1} {order.assignedDeliveryBoyName}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 text-[11px] block">Pickup Location</span>
                <p className="font-bold text-slate-900">{settings.name}</p>
                <p className="text-slate-600">{settings.address}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] block">Payment Method</span>
              <p className="font-bold text-slate-900">
                {order.paymentMethod} •{' '}
                <span className="text-emerald-600 font-semibold">{order.paymentStatus}</span>
              </p>
              {order.razorpayPaymentId && (
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Razorpay ID: {order.razorpayPaymentId}
                </p>
              )}
            </div>

            {/* Actions: Review, WhatsApp Share, Reorder, Invoice, Copy */}
            <div className="pt-2 space-y-2">
              {/* Rate & Review Button */}
              <button
                type="button"
                id="order-rate-review-btn"
                onClick={() => {
                  setSelectedDish(order.items[0]?.name || 'Overall Dining Experience');
                  setIsReviewOpen(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Rate &amp; Review this Order</span>
              </button>

              {/* Quick Reorder */}
              <button
                type="button"
                id="order-reorder-btn"
                disabled={isReordering}
                onClick={handleReorder}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isReordering ? 'Adding to Cart...' : 'Reorder This Meal'}</span>
              </button>

              {/* Share on WhatsApp */}
              <button
                type="button"
                id="order-share-whatsapp-btn"
                onClick={handleShareWhatsApp}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Share Order on WhatsApp</span>
              </button>

              {/* View/Print Invoice */}
              <button
                type="button"
                id="order-view-invoice-btn"
                onClick={() => setIsInvoiceOpen(true)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>View &amp; Print Tax Invoice</span>
              </button>

              {/* Copy Order Text */}
              <button
                id="order-copy-summary-btn"
                onClick={handleCopySummary}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Order Summary Copied!' : 'Copy Order Text'}</span>
              </button>
            </div>

            {/* Customer Support for this order */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                id="order-contact-support-btn"
                onClick={() => (onOpenSupport ? onOpenSupport(order.id) : onNavigate('/support'))}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Headphones className="w-4 h-4 text-amber-600" />
                <span>Need Help with this Order? Contact Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Write Order Review Modal */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-1.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <span>Rate Your Kitchen Cruze Order</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Order #{order.id} • Live on store for everyone
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{reviewError}</span>
              </div>
            )}

            {reviewSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900">Review Submitted!</h4>
                <p className="text-xs text-emerald-700">{reviewSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrderReview} className="space-y-4">
                {/* Star rating selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Rating *
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRating(s)}
                        className="p-1 hover:scale-110 transition cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-2">
                      {rating} of 5 Stars
                    </span>
                  </div>
                </div>

                {/* Dish being reviewed */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Dish or Item to Highlight
                  </label>
                  <select
                    value={selectedDish}
                    onChange={(e) => setSelectedDish(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Overall Meal & Experience">Overall Meal &amp; Delivery Experience</option>
                    {order.items.map((it, idx) => (
                      <option key={idx} value={it.name}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reviewer Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={customer?.fullName || order.customer?.fullName || 'e.g. Ankit Sharma'}
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Add Dish Photo (Optional)</span>
                    <span className="text-[10px] text-slate-400">Shows real food quality</span>
                  </label>

                  {photoUrl ? (
                    <div className="relative inline-block mt-1">
                      <img
                        src={photoUrl}
                        alt="Dish preview"
                        className="w-24 h-24 object-cover rounded-xl border-2 border-amber-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center space-x-2 p-3 bg-slate-50 border border-dashed border-slate-300 hover:border-amber-500 rounded-xl cursor-pointer text-xs font-bold text-slate-600 hover:text-amber-600 transition">
                      <Camera className="w-4 h-4 text-amber-500" />
                      <span>Upload Food Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Review text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Review &amp; Experience *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tell us about the freshness, flavor, packing, or delivery..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReviewOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview || !comment.trim()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReview ? 'Publishing...' : 'Submit Review'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Invoice & Receipt Modal */}
      {order && (
        <InvoiceModal
          order={order}
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
        />
      )}
    </div>
  );
};
