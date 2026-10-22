import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Trash2, ArrowLeft, Utensils } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

interface WishlistViewProps {
  onNavigate: (path: string) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({ onNavigate }) => {
  const { addToCart } = useCart();
  const { t } = useSettings();

  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      setLoading(true);
      try {
        const savedWishlist: string[] = JSON.parse(localStorage.getItem('kc_wishlist') || '[]');
        if (savedWishlist.length === 0) {
          setWishlistProducts([]);
          setLoading(false);
          return;
        }

        const res = await fetch('/api/products');
        if (res.ok) {
          const allProducts: Product[] = await res.json();
          const filtered = allProducts.filter((p) => savedWishlist.includes(p.id));
          setWishlistProducts(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, []);

  const removeFromWishlist = (id: string) => {
    try {
      const savedWishlist: string[] = JSON.parse(localStorage.getItem('kc_wishlist') || '[]');
      const updated = savedWishlist.filter((itemId) => itemId !== id);
      localStorage.setItem('kc_wishlist', JSON.stringify(updated));
      setWishlistProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {}
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
                <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
                <span>My Wishlist</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Your saved dishes for instant ordering</p>
            </div>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            {wishlistProducts.length} items
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Your wishlist is empty</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Tap the heart icon on any dish on our menu to bookmark it for your next culinary craving.
            </p>
            <button
              onClick={() => onNavigate('/menu')}
              className="py-2.5 px-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-amber-500/20"
            >
              Explore Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            {wishlistProducts.map((product) => {
              const currentPrice = product.discountPrice || product.price;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => onNavigate(`/product/${product.id}`)}
                    />
                    <button
                      onClick={() => removeFromWishlist(product.id)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-rose-600 hover:bg-rose-50 transition shadow-xs"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        {product.category}
                      </span>
                      <h3
                        onClick={() => onNavigate(`/product/${product.id}`)}
                        className="text-base font-bold text-slate-900 hover:text-amber-600 cursor-pointer transition line-clamp-1 mt-0.5"
                      >
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{product.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-base font-black text-slate-900">₹{currentPrice}</span>
                        {product.discountPrice && (
                          <span className="text-xs text-slate-400 line-through">₹{product.price}</span>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(product, 1)}
                        className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
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
