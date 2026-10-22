import React, { useState } from 'react';
import {
  Headphones,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CreditCard,
  Bike,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface SupportViewProps {
  onNavigate: (path: string) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ onNavigate }) => {
  const { settings } = useSettings();
  const { customer } = useAuth();

  const [customerName, setCustomerName] = useState(customer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [category, setCategory] = useState('Order & Delivery Issue');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ id: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const restaurantPhone = (settings.phone || '').trim();
  const rawPhone = restaurantPhone.replace(/[^0-9+]/g, '');
  const whatsappNum = (settings.whatsappNumber || '').trim();
  const cleanWhatsapp = whatsappNum.replace(/[^0-9]/g, '');
  const supportEmail = (settings.email || '').trim();
  const hasDirectChannels = Boolean(rawPhone || cleanWhatsapp || supportEmail);

  const defaultWhatsappMessage = encodeURIComponent(
    `Hello, I need assistance with my order.`
  );

  const faqs = [
    {
      q: 'How can I track my food order?',
      a: 'Go to "Orders" from the top menu and tap on your order. You can watch live updates as our kitchen prepares your meal and our delivery partner brings it to your door.',
      icon: Bike,
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, Cruze Wallet, and Cash on Delivery or Pay on Counter.',
      icon: CreditCard,
    },
    {
      q: 'My payment was deducted, but my order is not showing?',
      a: 'Please don\'t worry! Sometimes bank networks take a minute to confirm. If your order status hasn\'t updated within 2 minutes, simply drop us a message on WhatsApp or call us, and our team will verify and assist you right away.',
      icon: ShieldCheck,
    },
    {
      q: 'Can I cancel or change my order?',
      a: 'Since our kitchen starts preparing fresh meals right away, please contact us via phone or WhatsApp within 2-3 minutes of placing your order so our team can help you.',
      icon: Clock,
    },
    {
      q: 'What are the delivery charges?',
      a: 'Delivery charges are calculated based on your distance from our restaurant. Orders meeting our free delivery offer get completely free delivery at checkout!',
      icon: MapPin,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || !message.trim()) {
      setFormError('Please enter your name and describe your issue.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          category,
          orderId: orderId.trim() || undefined,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTicketResult({
          id: data.ticketId || `TCK-${Date.now().toString().slice(-6)}`,
          message: data.message || 'Support ticket created successfully.',
        });
        setMessage('');
      } else {
        setFormError(data.error || 'Failed to submit support request.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="customer-support-view" className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Headphones className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Customer Support</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online Helpdesk</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                How can we assist you today? Reach out via WhatsApp, phone call, email, or send a ticket below.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/orders')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
          >
            <span>View Your Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Operating status & hours - only shown if set by admin */}
        {((settings.openingTime && settings.closingTime) || cleanWhatsapp) && (
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            {settings.openingTime && settings.closingTime && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>
                  Helpline Timings: {settings.openingTime} - {settings.closingTime}
                </span>
              </div>
            )}
            {cleanWhatsapp && (
              <div className="flex items-center space-x-1.5 text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span>Fast response on WhatsApp</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notice if no direct contact details set yet by admin */}
      {!hasDirectChannels && (
        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 shadow-2xs space-y-2">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Direct Phone &amp; Email Contact Details</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Direct phone numbers and email helplines can be configured by the restaurant administrator in the Admin Dashboard Settings. You can submit your inquiry below using the support form, and our restaurant team will be notified directly!
          </p>
        </div>
      )}

      {/* Direct Contact Channels Grid - Only rendered if channels are configured */}
      {hasDirectChannels && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. WhatsApp Support */}
          {cleanWhatsapp && (
            <a
              id="support-page-whatsapp-btn"
              href={`https://wa.me/${cleanWhatsapp}?text=${defaultWhatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-900/20 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white group-hover:scale-105 transition">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full inline-block mb-1">
                    Fastest Response
                  </span>
                  <h3 className="font-extrabold text-base">WhatsApp Chat</h3>
                  <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                    Connect directly with our customer care manager on WhatsApp for instant order queries.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/20 flex items-center justify-between text-xs font-bold">
                <span>Start WhatsApp Chat</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </a>
          )}

          {/* 2. Restaurant Hotline */}
          {rawPhone && (
            <a
              id="support-page-call-btn"
              href={`tel:${rawPhone}`}
              className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-400 hover:bg-amber-50/20 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-block mb-1">
                    Voice Call
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900">Direct Helpline</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Speak directly to our restaurant front desk for urgent order cancellations or updates.
                  </p>
                  <p className="font-mono font-bold text-xs text-amber-600 mt-2">
                    {restaurantPhone}
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                <span>Call Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </a>
          )}

          {/* 3. Support Email */}
          {supportEmail && (
            <a
              id="support-page-email-btn"
              href={`mailto:${supportEmail}`}
              className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-400 hover:bg-blue-50/20 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-block mb-1">
                    Formal Query
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900">Email Support</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Send billing inquiries, corporate bulk orders, or official complaints with attachments.
                  </p>
                  <p className="font-mono font-semibold text-xs text-blue-600 mt-2 truncate">
                    {supportEmail}
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Send Email</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </a>
          )}
        </div>
      )}

      {/* Main Support Form & FAQ Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Submit Ticket Form (3 cols) */}
        <div className="lg:col-span-3 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">Send Support Request</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your inquiry directly to our management system.
            </p>
          </div>

          {ticketResult ? (
            <div className="text-center py-8 px-4 space-y-4 bg-emerald-50 border border-emerald-200 rounded-3xl">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Support Ticket Created</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {ticketResult.message}
                </p>
              </div>

              <div className="inline-block p-3 bg-white rounded-2xl border border-emerald-200 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">Ticket ID Reference</span>
                <span className="font-black text-emerald-700 text-sm">{ticketResult.id}</span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                    `Hi Kitchen Cruze, I just submitted support ticket #${ticketResult.id}. Please assist.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Follow Up on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setTicketResult(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Issue Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Order & Delivery Issue">Order &amp; Delivery Issue</option>
                    <option value="Payment & Razorpay Inquiry">Payment &amp; Razorpay Inquiry</option>
                    <option value="Food Quality & Packaging">Food Quality &amp; Packaging</option>
                    <option value="Address & Instructions Change">Address &amp; Instructions Change</option>
                    <option value="Cancellation / Refund">Cancellation / Refund</option>
                    <option value="General Assistance">General Assistance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Related Order ID (Optional)</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. KC-1025"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Explain Your Issue or Query *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe what happened, including any item names or payment reference numbers..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting to Kitchen...' : 'Send Support Request'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: FAQs (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-extrabold text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-2.5">
              {faqs.map((faq, index) => {
                const Icon = faq.icon;
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200/80 rounded-2xl overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-2 text-xs font-bold text-slate-900 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{faq.q}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-3 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Restaurant Location Card */}
          {settings.address && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>Our Kitchen Address</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{settings.address}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
