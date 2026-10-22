import React, { useState } from 'react';
import { X, Plus, Minus, Sparkles, Check } from 'lucide-react';
import { Product, CartItemAddon } from '../types';
import { useCart } from '../context/CartContext';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  if (!product) return null;

  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addedAnimation, setAddedAnimation] = useState(false);

  const toggleAddon = (addon: CartItemAddon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const itemFinalPrice = (product.price + addonsTotal) * quantity;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedAddons, specialInstructions);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 600);
  };

  return (
    <div
      id="product-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="product-detail-modal-content"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="product-detail-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 flex items-center justify-center backdrop-blur-xs transition"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Image */}
        <div className="relative w-full aspect-16/10 bg-slate-100 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80';
            }}
          />
          {/* Veg/Non-veg mark */}
          <div className="absolute bottom-3 left-4 flex items-center space-x-2">
            <div
              className={`h-5 w-5 rounded-xs border-2 flex items-center justify-center bg-white/95 backdrop-blur-xs shadow-md ${
                product.isVeg ? 'border-emerald-600' : 'border-rose-600'
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/95 text-slate-800 backdrop-blur-xs shadow-xs">
              {product.isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
            </span>
          </div>
        </div>

        {/* Details Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                  {product.category}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{product.name}</h2>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-extrabold text-slate-900">₹{product.price}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className="text-xs text-slate-400 line-through">₹{product.originalPrice}</div>
                )}
              </div>
            </div>

            <p className="text-slate-600 text-sm mt-3 leading-relaxed">{product.description}</p>
          </div>

          {/* Optional Add-ons */}
          {product.customizationGroups && product.customizationGroups.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Customizations &amp; Add-ons</span>
              </h4>

              <div className="space-y-3">
                {product.customizationGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <span className="text-xs text-slate-500 font-medium">{group.name}</span>
                    <div className="grid grid-cols-1 gap-2">
                      {group.options.map((option) => {
                        const isSelected = selectedAddons.some((a) => a.id === option.id);
                        return (
                          <div
                            key={option.id}
                            id={`addon-opt-${option.id}`}
                            onClick={() => toggleAddon(option)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-50/60 border-amber-500 text-slate-900 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-semibold">{option.name}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-900">
                              {option.price > 0 ? `+₹${option.price}` : 'Free'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="pt-3 border-t border-slate-100">
            <label
              htmlFor="modal-special-instructions"
              className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5"
            >
              Special Cooking Instructions
            </label>
            <textarea
              id="modal-special-instructions"
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Less spicy, extra crisp, pack gravy separately..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          {/* Quantity Selector */}
          <div
            id="modal-quantity-selector"
            className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs"
          >
            <button
              id="modal-qty-decrease"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-900">{quantity}</span>
            <button
              id="modal-qty-increase"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart CTA */}
          <button
            id="modal-add-to-cart-cta"
            onClick={handleAddToCart}
            className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
              addedAnimation
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-98'
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <span>Add Item</span>
                <span>•</span>
                <span>₹{itemFinalPrice}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
