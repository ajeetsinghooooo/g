import React from 'react';
import { Plus, Minus, Star, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails }) => {
  const { cart, addToCart, updateQuantity } = useCart();

  // Find if this product is currently in the cart (sum of all variations)
  const cartItemsForProduct = cart.filter((item) => item.productId === product.id);
  const totalQtyInCart = cartItemsForProduct.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.customizationGroups && product.customizationGroups.length > 0) {
      // Open detailed modal for customizations
      onOpenDetails(product);
    } else {
      addToCart(product, 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.customizationGroups && product.customizationGroups.length > 0) {
      // If there are customizations, open modal to configure options
      onOpenDetails(product);
    } else {
      if (cartItemsForProduct.length > 0) {
        updateQuantity(cartItemsForProduct[0].id, cartItemsForProduct[0].quantity + 1);
      } else {
        addToCart(product, 1);
      }
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartItemsForProduct.length > 0) {
      const lastItem = cartItemsForProduct[cartItemsForProduct.length - 1];
      updateQuantity(lastItem.id, lastItem.quantity - 1);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onOpenDetails(product)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Top badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        {/* Veg / Non-Veg Indicator */}
        <div
          className={`h-4.5 w-4.5 rounded-sm border-2 flex items-center justify-center bg-white/95 backdrop-blur-xs shadow-xs ${
            product.isVeg ? 'border-emerald-600' : 'border-rose-600'
          }`}
          title={product.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
        >
          <div
            className={`h-2 w-2 rounded-full ${
              product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          />
        </div>

        {product.isRecommended && (
          <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-xs uppercase tracking-wider">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>Chef's Choice</span>
          </span>
        )}
      </div>

      {/* Image Banner */}
      <div className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback food placeholder
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80';
          }}
        />
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center">
            <span className="bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Currently Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors line-clamp-1">
              {product.name}
            </h3>
          </div>

          <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {product.customizationGroups && product.customizationGroups.length > 0 && (
            <div className="mt-2 text-[11px] text-amber-600 font-medium flex items-center space-x-1">
              <span>✨ Customization available</span>
            </div>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-base font-extrabold text-slate-900">₹{product.price}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {product.category}
            </span>
          </div>

          {/* Add or Quantity Controls */}
          {product.isAvailable && (
            <div>
              {totalQtyInCart > 0 ? (
                <div
                  id={`product-qty-control-${product.id}`}
                  className="flex items-center space-x-2 bg-amber-500 text-white rounded-lg p-1 shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    id={`product-dec-${product.id}`}
                    onClick={handleDecrement}
                    className="w-6 h-6 flex items-center justify-center hover:bg-amber-600 rounded-md transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold px-1 min-w-4 text-center">
                    {totalQtyInCart}
                  </span>
                  <button
                    id={`product-inc-${product.id}`}
                    onClick={handleIncrement}
                    className="w-6 h-6 flex items-center justify-center hover:bg-amber-600 rounded-md transition"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id={`product-add-btn-${product.id}`}
                  onClick={handleAddClick}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center space-x-1 hover:shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
