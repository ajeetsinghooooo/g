import React from 'react';
import { X, Printer, CheckCircle2, MapPin, Phone, Mail, FileText, Download } from 'lucide-react';
import { Order } from '../types';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/pricing';

interface InvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const { settings } = useSettings();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="invoice-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200 print:border-none print:shadow-none print:max-w-full">
        {/* Modal Actions (Hidden in Print) */}
        <div className="flex items-center justify-between print:hidden border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-black text-slate-900">Tax Invoice &amp; Receipt</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="invoice-print-btn"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE CONTENT */}
        <div id="printable-invoice-content" className="space-y-6 text-slate-800">
          {/* Header & Restaurant Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {settings.name || 'Kitchen Cruze'}
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                {settings.address || 'Gourmet Kitchen Promenade, City Center'}
              </p>
              {settings.phone && (
                <p className="text-xs text-slate-500 flex items-center space-x-1 mt-1">
                  <Phone className="w-3 h-3 text-amber-600" />
                  <span>{settings.phone}</span>
                </p>
              )}
              {settings.email && (
                <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                  <Mail className="w-3 h-3 text-amber-600" />
                  <span>{settings.email}</span>
                </p>
              )}
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                TAX INVOICE
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1">Invoice #{order.id}</p>
              <p className="text-xs text-slate-500">Date: {invoiceDate}</p>
              <p className="text-xs text-slate-500">
                Mode: <strong className="text-slate-800">{order.orderType}</strong>
              </p>
            </div>
          </div>

          {/* Billed To / Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-200 text-xs">
            <div>
              <span className="font-extrabold text-slate-400 uppercase tracking-wider block text-[10px]">
                Billed To
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {order.customer?.fullName || order.customerName || 'Customer'}
              </p>
              <p className="text-slate-600 mt-0.5">{order.customer?.phone || order.customerPhone}</p>
              {order.customer?.email && <p className="text-slate-500">{order.customer.email}</p>}
            </div>

            <div>
              <span className="font-extrabold text-slate-400 uppercase tracking-wider block text-[10px]">
                {order.orderType === 'Delivery' ? 'Delivery Destination' : 'Pickup Point'}
              </span>
              <p className="font-medium text-slate-800 mt-0.5">
                {order.orderType === 'Delivery'
                  ? order.customer?.deliveryAddress || 'Delivery Address Provided'
                  : settings.address || 'Restaurant Counter'}
              </p>
              {order.customer?.landmark && (
                <p className="text-slate-500">Landmark: {order.customer.landmark}</p>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <span className="font-extrabold text-slate-400 uppercase tracking-wider block text-[10px]">
              Order Items
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2.5">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <span className="block text-[11px] text-slate-500">
                            Add-ons: {item.selectedAddons.map((a) => a.name).join(', ')}
                          </span>
                        )}
                        {item.specialInstructions && (
                          <span className="block text-[10px] text-amber-700 italic">
                            Note: {item.specialInstructions}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center font-bold text-slate-700">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600">₹{formatCurrency(item.price)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        ₹{formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="pt-4 border-t border-slate-200 flex justify-end text-xs">
            <div className="w-full max-w-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span>₹{formatCurrency(order.subtotal)}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount ({order.couponCode || 'Promo'})</span>
                  <span>-₹{formatCurrency(order.discount)}</span>
                </div>
              )}

              {order.deliveryCharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span>₹{formatCurrency(order.deliveryCharge)}</span>
                </div>
              )}

              {order.packagingCharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Eco Packaging Charge</span>
                  <span>₹{formatCurrency(order.packagingCharge)}</span>
                </div>
              )}

              {order.gstAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({order.gstRate || settings.gst?.percentage || 5}%)</span>
                  <span>₹{formatCurrency(order.gstAmount)}</span>
                </div>
              )}

              {order.tipAmount !== undefined && order.tipAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Delivery Partner Tip</span>
                  <span>₹{formatCurrency(order.tipAmount)}</span>
                </div>
              )}

              {order.walletAmountUsed !== undefined && order.walletAmountUsed > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Paid with Cruze Wallet</span>
                  <span>-₹{formatCurrency(order.walletAmountUsed)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total</span>
                <span className="text-amber-600">₹{formatCurrency(order.grandTotal)}</span>
              </div>

              <div className="pt-1 text-[11px] text-right text-slate-500 font-medium">
                Payment: <strong className="text-slate-800">{order.paymentMethod}</strong> ({order.paymentStatus})
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-slate-100 text-center space-y-1 text-slate-400 text-[11px]">
            <p className="font-semibold text-slate-600">Thank you for dining with {settings.name || 'Kitchen Cruze'}!</p>
            <p>For any inquiries regarding this order, please contact our support hotline or WhatsApp.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
