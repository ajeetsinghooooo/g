import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Scale,
  ShieldAlert,
  Star,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Check,
  Share2,
  MessageSquarePlus,
  AlertCircle,
} from 'lucide-react';
import { Product, CustomizationOption, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface ProductDetailViewProps {
  productId: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ productId, onNavigate }) => {
  const { addToCart } = useCart();
  const { customer, isCustomerAuthenticated } = useAuth();
  const { settings, t } = useSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<CustomizationOption[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  // Review form state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [prodRes, revRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch(`/api/reviews/product/${productId}`),
        ]);

        if (prodRes.ok) {
          const data = await prodRes.json();
          setProduct(data);
        }
        if (revRes.ok) {
          const revData = await revRes.json();
          setReviews(revData);
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    // Check wishlist
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('kc_wishlist') || '[]');
      setIsWishlisted(savedWishlist.includes(productId));
    } catch {}
  }, [productId]);

  const toggleWishlist = () => {
    try {
      const savedWishlist: string[] = JSON.parse(localStorage.getItem('kc_wishlist') || '[]');
      let updated: string[];
      if (savedWishlist.includes(productId)) {
        updated = savedWishlist.filter((id) => id !== productId);
        setIsWishlisted(false);
      } else {
        updated = [...savedWishlist, productId];
        setIsWishlisted(true);
      }
      localStorage.setItem('kc_wishlist', JSON.stringify(updated));
    } catch {}
  };

  const handleToggleAddon = (option: CustomizationOption) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((o) => o.id === option.id);
      if (exists) {
        return prev.filter((o) => o.id !== option.id);
      }
      return [...prev, option];
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, selectedAddons, specialInstructions);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !product) return;

    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.fullName,
          productId: product.id,
          productName: product.name,
          rating,
          comment: reviewComment,
        }),
      });

      if (res.ok) {
        setReviewSuccess(true);
        setTimeout(() => {
          setShowReviewModal(false);
          setReviewSuccess(false);
          setReviewComment('');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800">Dish not found</h2>
        <p className="text-sm text-slate-500 mt-2">The requested menu item may have been removed or updated.</p>
        <button
          onClick={() => onNavigate('/menu')}
          className="mt-6 px-6 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const currentPrice = product.discountPrice || product.price;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const finalUnitPrice = currentPrice + addonsTotal;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-4">
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Added {quantity}x &ldquo;{product.name}&rdquo; to Cart!</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => onNavigate('/menu')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 mb-6 py-1.5 px-3 rounded-lg hover:bg-slate-200/60 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 sm:p-8">
          {/* Left Column: Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60">
              <img
                src={images[selectedImageIndex] || product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex items-center space-x-2">
                <span
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                    product.isVeg
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border border-rose-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                  <span>{product.isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
                </span>

                {product.discountPrice && (
                  <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-full shadow-sm">
                    {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                onClick={toggleWishlist}
                className={`absolute top-4 right-4 p-2.5 rounded-full shadow-md transition ${
                  isWishlisted
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/90 backdrop-blur-sm text-slate-600 hover:text-rose-500'
                }`}
                aria-label="Save to Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      selectedImageIndex === idx ? 'border-amber-500 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">Prep Time</div>
                  <div className="text-xs font-bold text-slate-800">{product.preparationTimeMinutes || product.preparationTime || 20} mins</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3">
                <Scale className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">Portion Weight</div>
                  <div className="text-xs font-bold text-slate-800">{product.weight || 250}g Approx</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Customizations */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  {product.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-3 mt-2">
                  <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold text-amber-800">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{product.rating || 4.8}</span>
                    <span className="text-amber-600/70 font-normal">({reviews.length} reviews)</span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-950">₹{finalUnitPrice}</span>
                    {product.discountPrice && (
                      <span className="text-sm text-slate-400 line-through">₹{product.price}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.description}
              </p>

              {/* Ingredients & Allergens */}
              {(product.ingredients || product.allergens) && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  {product.ingredients && (
                    <div>
                      <span className="font-bold text-slate-700">Key Ingredients: </span>
                      <span className="text-slate-600">{product.ingredients}</span>
                    </div>
                  )}
                  {product.allergens && (
                    <div className="flex items-center space-x-1.5 text-amber-800 font-medium">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Allergen Warning: {product.allergens}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Customizations / Addons */}
              {((product.customizationOptions || product.addons || []).length > 0) && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Add-ons &amp; Customizations
                  </label>
                  <div className="space-y-2">
                    {(product.customizationOptions || product.addons || []).map((option: any) => {
                      const isSelected = selectedAddons.some((o) => o.id === option.id);
                      return (
                        <div
                          key={option.id}
                          onClick={() => handleToggleAddon(option)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-400'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-slate-800">{option.name}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900">+₹{option.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Chef Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, extra cutlery, dressing on the side"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Bottom Quantity & Add to Cart */}
            <div className="pt-4 border-t border-slate-200 flex items-center space-x-4">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:text-amber-600"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-sm text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:text-amber-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.isAvailable}
                className="flex-1 py-3.5 px-6 bg-amber-500 hover:bg-amber-600 active:scale-99 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {product.isAvailable ? `Add to Order • ₹${finalUnitPrice * quantity}` : 'Currently Sold Out'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-12 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">Customer Ratings &amp; Reviews</h3>
              <p className="text-xs text-slate-500 mt-0.5">Verified dining experiences from Kitchen Cruze guests</p>
            </div>

            {isCustomerAuthenticated ? (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition flex items-center space-x-1.5"
              >
                <MessageSquarePlus className="w-4 h-4 text-amber-600" />
                <span>Write a Review</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="text-xs font-bold text-amber-600 hover:underline"
              >
                Log in to review
              </button>
            )}
          </div>

          {/* Reviews List */}
          <div className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Be the first to review this freshly cooked dish!
              </p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        {rev.customerName.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-800">{rev.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-9">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Write a Review for {product.name}</h3>

            {reviewSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold text-center">
                Thank you! Your review has been submitted.
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRating(s)}
                        className="p-1 text-amber-400 hover:scale-110 transition"
                      >
                        <Star className={`w-6 h-6 ${s <= rating ? 'fill-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Feedback
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe taste, freshness, portion size, packaging..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl"
                  >
                    {reviewSubmitting ? 'Posting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
