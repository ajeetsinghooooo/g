import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles, ArrowLeft, Percent, Gift } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';

interface OffersViewProps {
  onNavigate: (path: string) => void;
}

export const OffersView: React.FC<OffersViewProps> = ({ onNavigate }) => {
  const { offers } = useSettings();
  const { applyCoupon, appliedOffer } = useCart();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApply = (code: string) => {
    const res = applyCoupon(code);
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('/menu')}
              className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
                <Tag className="w-6 h-6 text-amber-500" />
                <span>Special Offers &amp; Coupons</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Exclusive discounts and festive savings for Kitchen Cruze diners</p>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3.5 bg-slate-900 text-amber-400 text-xs font-bold rounded-2xl shadow-md text-center">
            {feedback}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Coupons Right Now</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Our culinary team frequently launches festive coupons. Check back soon!
            </p>
            <button
              onClick={() => onNavigate('/menu')}
              className="py-2.5 px-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-amber-500/20"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {offers.map((offer) => {
              const isCurrent = appliedOffer?.couponCode === offer.couponCode;

              return (
                <div
                  key={offer.id}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between p-6 ${
                    isCurrent ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-black uppercase tracking-wider border border-amber-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {offer.discountType === 'percentage'
                            ? `${offer.discountValue}% DISCOUNT`
                            : `FLAT ₹${offer.discountValue} OFF`}
                        </span>
                      </div>

                      {offer.validTill && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Valid till {new Date(offer.validTill).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{offer.title}</h3>
                    {offer.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{offer.description}</p>
                    )}

                    <div className="text-xs text-slate-500 space-y-1 pt-1">
                      <div>• Minimum order value: <strong>₹{offer.minimumOrder}</strong></div>
                      {offer.maximumDiscount && (
                        <div>• Maximum discount capped at: <strong>₹{offer.maximumDiscount}</strong></div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-sm font-black text-slate-800">
                      <span>{offer.couponCode}</span>
                      <button
                        onClick={() => handleCopy(offer.couponCode)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Copy code"
                      >
                        {copiedCode === offer.couponCode ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleApply(offer.couponCode)}
                      disabled={isCurrent}
                      className={`py-2.5 px-5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                        isCurrent
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 shadow-md shadow-amber-500/20'
                      }`}
                    >
                      {isCurrent ? 'Applied ✓' : 'Apply to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
