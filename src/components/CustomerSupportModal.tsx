import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  HelpCircle,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Headphones,
  FileQuestion,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Bike,
  Sparkles,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  onNavigate?: (path: string) => void;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({
  isOpen,
  onClose,
  orderId = null,
  onNavigate,
}) => {
  const { settings } = useSettings();
  const { customer, isCustomerAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'contact' | 'ticket' | 'faq'>(() => {
    return (settings.phone || settings.whatsappNumber || settings.email) ? 'contact' : 'ticket';
  });
  const [customerName, setCustomerName] = useState(customer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [category, setCategory] = useState<string>(orderId ? 'Order & Delivery Issue' : 'General Assistance');
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ id: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  // Use only details configured by the admin - no hardcoded or fake contact details
  const restaurantPhone = (settings.phone || '').trim();
  const rawPhone = restaurantPhone.replace(/[^0-9+]/g, '');
  const whatsappNum = (settings.whatsappNumber || '').trim();
  const cleanWhatsapp = whatsappNum.replace(/[^0-9]/g, '');
  const supportEmail = (settings.email || '').trim();
  const hasDirectChannels = Boolean(rawPhone || cleanWhatsapp || supportEmail);

  const defaultWhatsappMessage = selectedOrderId
    ? encodeURIComponent(
        `Hello, I need assistance with my Order #${selectedOrderId.replace('KC-', '')}.`
      )
    : encodeURIComponent(`Hello, I have an inquiry about my food order.`);

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

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || !message.trim()) {
      setFormError('Please provide your name and describe your issue.');
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
          orderId: selectedOrderId.trim() || undefined,
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
        setFormError(data.error || 'Failed to submit support request. Please try WhatsApp support.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error while submitting. Please contact us via phone or WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="customer-support-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="customer-support-modal"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            type="button"
            id="support-modal-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            aria-label="Close Support Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black tracking-tight text-white">Customer Support</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Support Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                We&apos;re here to assist with your order, payment, or dining inquiries.
              </p>
            </div>
          </div>

          {/* Operating hours bar - only shown if set by admin */}
          {(settings.openingTime && settings.closingTime) || cleanWhatsapp ? (
            <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-300 gap-2">
              {settings.openingTime && settings.closingTime && (
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Support Hours: {settings.openingTime} - {settings.closingTime}
                  </span>
                </div>
              )}
              {cleanWhatsapp && (
                <div className="flex items-center space-x-1.5 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fast response on WhatsApp</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 px-4 pt-2">
          {hasDirectChannels && (
            <button
              type="button"
              id="support-tab-contact"
              onClick={() => setActiveTab('contact')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center space-x-2 ${
                activeTab === 'contact'
                  ? 'border-amber-500 text-amber-700 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Direct Channels</span>
            </button>
          )}

          <button
            type="button"
            id="support-tab-ticket"
            onClick={() => setActiveTab('ticket')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center space-x-2 ${
              activeTab === 'ticket'
                ? 'border-amber-500 text-amber-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Request</span>
          </button>

          <button
            type="button"
            id="support-tab-faq"
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center space-x-2 ${
              activeTab === 'faq'
                ? 'border-amber-500 text-amber-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>FAQs</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: DIRECT CONTACT CHANNELS */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              {orderId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-amber-950 block">Inquiry for Order #{orderId.replace('KC-', '')}</span>
                    <span className="text-[11px] text-amber-800">Support will link directly to this order.</span>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded font-bold">
                    {orderId}
                  </span>
                </div>
              )}

              {/* Notice if no channels configured */}
              {!hasDirectChannels && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Direct Phone & Email Helplines</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Direct phone number or email has not been added yet by the restaurant administrator. You can send your support inquiry directly to our management system below!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ticket')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center space-x-1.5"
                  >
                    <span>Submit Support Request</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 1. WhatsApp Button - Only if admin provided WhatsApp */}
              {cleanWhatsapp && (
                <a
                  id="support-whatsapp-action"
                  href={`https://wa.me/${cleanWhatsapp}?text=${defaultWhatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white flex items-center justify-between shadow-md transition group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-black text-sm">Instant WhatsApp Support</h4>
                        <span className="text-[10px] font-bold bg-white text-emerald-900 px-2 py-0.5 rounded-full">
                          Direct Chat
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100 mt-0.5">
                        Chat directly with our support team
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded-xl group-hover:bg-white/20 transition hidden sm:inline-block">
                    Open Chat →
                  </span>
                </a>
              )}

              {/* 2. Direct Call & Email Grid - Only if configured */}
              {(rawPhone || supportEmail) && (
                <div className={`grid grid-cols-1 ${rawPhone && supportEmail ? 'sm:grid-cols-2' : ''} gap-3`}>
                  {rawPhone && (
                    <a
                      id="support-phone-action"
                      href={`tel:${rawPhone}`}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition flex items-center space-x-3 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-500 block uppercase">Call Restaurant</span>
                        <span className="font-extrabold text-xs text-slate-900 truncate block">
                          {restaurantPhone}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Direct phone assistance</span>
                      </div>
                    </a>
                  )}

                  {supportEmail && (
                    <a
                      id="support-email-action"
                      href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                        selectedOrderId ? `Support Request - Order #${selectedOrderId}` : 'Customer Inquiry'
                      )}`}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition flex items-center space-x-3 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-500 block uppercase">Email Support</span>
                        <span className="font-extrabold text-xs text-slate-900 truncate block">
                          {supportEmail}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Direct inquiries &amp; help</span>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {/* Restaurant Address & Location */}
              {settings.address && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Kitchen Location</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">{settings.address}</p>
                  </div>
                </div>
              )}

              {/* Need to submit formal ticket CTA */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Have a specific question or complaint?</h5>
                  <p className="text-[11px] text-slate-600">
                    Submit a ticket directly to the restaurant dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ticket')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shrink-0"
                >
                  Submit Ticket
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SUBMIT SUPPORT TICKET FORM */}
          {activeTab === 'ticket' && (
            <div className="space-y-4">
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
                    <span className="text-slate-500 block text-[10px]">Your Ticket Reference</span>
                    <span className="font-black text-emerald-700 text-sm">{ticketResult.id}</span>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                        `Hi Kitchen Cruze, I just submitted ticket #${ticketResult.id}. Please check.`
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
                      Submit Another Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Issue Category *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
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
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        placeholder="e.g. KC-1025"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="To receive written status replies"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Describe your question or issue *</label>
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please provide details about what you need assistance with..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting Ticket...' : 'Send Support Request'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FAQS ACCORDION */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                <span className="font-bold block mb-0.5">Quick Self-Service Answers</span>
                Common questions regarding deliveries, payments, and order tracking.
              </div>

              {faqs.map((faq, index) => {
                const Icon = faq.icon;
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-3.5 text-left bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-3 text-xs font-bold text-slate-900 transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{faq.q}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-3.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            {settings.name} • Customer Happiness Team
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
