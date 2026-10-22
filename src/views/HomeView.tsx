import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Flame,
  Clock,
  MapPin,
  Tag,
  ArrowRight,
  ShieldCheck,
  Bike,
  Copy,
  CheckCircle,
  PlusCircle,
  Star,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  User,
  Camera,
  X,
} from 'lucide-react';
import { Product, Category, Review } from '../types';
import { ProductCard } from '../components/ProductCard';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { safeJson, apiFetch } from '../utils/api';

interface HomeViewProps {
  onNavigate: (path: string) => void;
  onOpenProductDetails: (product: Product) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenProductDetails }) => {
  const { settings, offers, t } = useSettings();
  const { applyCoupon, orderType, setOrderType } = useCart();
  const { customer, customerToken, isAdminAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Customer Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [selectedProductReview, setSelectedProductReview] = useState<string>('Overall Dining Experience');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [previewModalPhoto, setPreviewModalPhoto] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setReviewError('Image size should be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReviewPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, revRes] = await Promise.all([
          apiFetch('/api/products'),
          apiFetch('/api/categories'),
          apiFetch('/api/reviews'),
        ]);
        if (prodRes.ok) {
          const prods = await safeJson(prodRes).catch(() => null);
          if (Array.isArray(prods)) setProducts(prods);
        }
        if (catRes.ok) {
          const cats = await safeJson(catRes).catch(() => null);
          if (Array.isArray(cats)) setCategories(cats);
        }
        if (revRes.ok) {
          const revs = await safeJson(revRes).catch(() => null);
          if (Array.isArray(revs)) setReviews(revs);
        }
      } catch (err) {
        console.warn('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(null);

    if (!reviewComment.trim()) {
      setReviewError('Please share your review or feedback comment.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({
          rating: ratingInput,
          customerName: reviewerName.trim() || customer?.fullName || 'Verified Diner',
          productName: selectedProductReview,
          productId: selectedProductReview === 'Overall Dining Experience' ? 'restaurant-overall' : selectedProductReview,
          comment: reviewComment.trim(),
          photoUrl: reviewPhoto || undefined,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit review');
      }

      if (data?.review) {
        setReviews((prev) => [data.review, ...prev]);
      }
      setReviewSuccess('Thank you! Your authentic review is now live on our store for everyone to see.');
      setReviewComment('');
      setReviewerName('');
      setReviewPhoto(null);
      setTimeout(() => {
        setIsReviewFormOpen(false);
        setReviewSuccess(null);
      }, 3000);
    } catch (err: any) {
      setReviewError(err.message || 'Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    applyCoupon(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  // Recommended products
  const recommendedProducts = products.filter((p) => p.isRecommended && p.isAvailable);

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const freeDeliveryLimit = settings.deliveryRules?.freeDeliveryThreshold || 500;

  return (
    <div id="customer-home-view" className="space-y-8 pb-16">
      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-60 h-60 rounded-full bg-orange-600/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Artisanal Kitchen • Handcrafted Flavors</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Welcome to <span className="text-amber-400">{settings.name || 'Kitchen Cruze'}</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {settings.aboutUs ||
              'Authentic culinary delicacies prepared fresh to order using the finest ingredients, packaged with extreme care and delivered hot to your doorstep.'}
          </p>

          {/* Delivery & Free Delivery Alert */}
          <div className="flex items-center space-x-2 py-1 text-xs text-amber-300 font-bold">
            <Bike className="w-4 h-4 text-emerald-400" />
            <span>
              Free Delivery on orders above ₹{freeDeliveryLimit}!
            </span>
          </div>

          {/* Quick Order Mode & Info */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-slate-800/90 rounded-2xl border border-slate-700">
              <button
                id="hero-order-mode-delivery"
                onClick={() => setOrderType('Delivery')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  orderType === 'Delivery'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('delivery')}
              </button>
              <button
                id="hero-order-mode-pickup"
                onClick={() => setOrderType('Pickup')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  orderType === 'Pickup'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('pickup')} (Free)
              </button>
            </div>

            <button
              id="hero-explore-menu-btn"
              onClick={() => onNavigate('/menu')}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <span>{t('menu')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Live Search & Categories Pills */}
      <section className="space-y-4">
        {/* Search Bar on mobile */}
        <div className="relative md:hidden">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="home-search-input-mobile"
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
          />
        </div>

        {/* Categories Bar */}
        {categories.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              id="cat-pill-all"
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                selectedCategory === 'All'
                  ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-pill-${cat.id}`}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                  selectedCategory.toLowerCase() === cat.name.toLowerCase()
                    ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Active Offers Section */}
      {offers && offers.length > 0 && (
        <section id="home-coupons-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>{t('offers')}</span>
            </h2>
            <button
              onClick={() => onNavigate('/offers')}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {offers.slice(0, 3).map((offer) => (
              <div
                key={offer.id}
                id={`coupon-card-${offer.couponCode}`}
                onClick={() => handleCopyCoupon(offer.couponCode)}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/80 flex items-center justify-between cursor-pointer hover:shadow-sm transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide bg-amber-200/60 px-2 py-0.5 rounded-md">
                      {offer.couponCode}
                    </span>
                    <span className="text-xs font-bold text-amber-700">
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}% OFF`
                        : `₹${offer.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{offer.title}</p>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs flex items-center space-x-1"
                >
                  {copiedCoupon === offer.couponCode ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                      <span>Applied!</span>
                    </>
                  ) : (
                    <span>APPLY</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Items Section */}
      {selectedCategory === 'All' && searchQuery.trim() === '' && recommendedProducts.length > 0 && (
        <section id="home-recommended-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500 fill-current" />
                <span>Chef&apos;s Recommended Highlights</span>
              </h2>
              <p className="text-xs text-slate-500">Signature creations loved by guests</p>
            </div>
            <button
              onClick={() => onNavigate('/menu')}
              className="text-xs font-bold text-amber-600 hover:underline flex items-center space-x-1"
            >
              <span>See All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedProducts.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetails={onOpenProductDetails}
              />
            ))}
          </div>
        </section>
      )}

      {/* Food Products Grid or Clean Zero-State */}
      <section id="home-products-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {selectedCategory === 'All' ? 'Menu Highlights' : `${selectedCategory} Specials`}
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredProducts.length} dish{filteredProducts.length === 1 ? '' : 'es'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Clean Initial State without fake items */
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Flame className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Fresh Flavors Coming Right Up!</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Our chefs are curating today's signature dishes with the freshest ingredients. Please check back shortly or explore our current offers!
            </p>
            {isAdminAuthenticated && (
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('/admin')}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-amber-500/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Admin Panel: Manage Menu Items</span>
                </button>
              </div>
            )}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <p className="text-sm font-bold text-slate-700">No dishes found matching your search</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or choosing another category.</p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetails={onOpenProductDetails}
              />
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------------------- */}
      {/* CUSTOMER REVIEWS & EXPERIENCES */}
      {/* -------------------------------------------------------------------------- */}
      <section id="customer-store-reviews-section" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header with Title, Stats & 'Write Review' Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Diner Reviews</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Customer Reviews &amp; Experiences</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
              Read real thoughts from people who have ordered from Kitchen Cruze. Share your own experience to help other food lovers!
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {reviews.length > 0 && (
              <div className="text-right hidden sm:block">
                <div className="flex items-center space-x-1 text-amber-500 font-black text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>
                    {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} / 5
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
              </div>
            )}

            <button
              id="open-write-review-btn"
              type="button"
              onClick={() => {
                setIsReviewFormOpen((prev) => !prev);
                setReviewError(null);
                setReviewSuccess(null);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isReviewFormOpen ? 'Close Form' : 'Write a Review'}</span>
            </button>
          </div>
        </div>

        {/* Inline Review Submission Form */}
        {isReviewFormOpen && (
          <form
            id="store-review-form"
            onSubmit={handleSubmitReview}
            className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Share Your Honest Dining Experience</span>
              </h3>
              <span className="text-[11px] text-slate-400">Published live immediately</span>
            </div>

            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {reviewSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Star Rating Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Rating *
                </label>
                <div className="flex items-center space-x-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingInput(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= (hoverRating ?? ratingInput)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-600 ml-2">
                    {ratingInput} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder={customer?.fullName || 'e.g. Rahul Sharma'}
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Dish / Experience Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                What are you reviewing?
              </label>
              <select
                value={selectedProductReview}
                onChange={(e) => setSelectedProductReview(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              >
                <option value="Overall Dining Experience">Overall Dining &amp; Delivery Experience</option>
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Photo Upload for Dish / Dining Experience */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Add Food Photo (Optional)</span>
                <span className="text-[10px] text-slate-400">Shows real food quality to others</span>
              </label>

              {reviewPhoto ? (
                <div className="relative inline-block mt-1">
                  <img
                    src={reviewPhoto}
                    alt="Food preview"
                    className="w-24 h-24 object-cover rounded-xl border-2 border-amber-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setReviewPhoto(null)}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 p-3 bg-white border border-dashed border-slate-300 hover:border-amber-500 rounded-xl cursor-pointer text-xs font-bold text-slate-600 hover:text-amber-600 transition">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <span>Upload Food Picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Review Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Your Review &amp; Comments *
              </label>
              <textarea
                rows={3}
                required
                placeholder="How was the taste, packaging, spice level, or delivery speed? Your honest feedback helps everyone!"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setIsReviewFormOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReview || !reviewComment.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingReview ? 'Publishing Review...' : 'Submit Review'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Public Reviews Display Grid */}
        {reviews.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl p-6 space-y-3">
            <Star className="w-8 h-8 text-amber-400/60 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Customer Reviews Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to share your experience with Kitchen Cruze! Click "Write a Review" above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:bg-slate-50 transition shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {rev.customerName || 'Verified Diner'}
                        </span>
                        <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md font-bold">
                          ✓ Verified
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                        {rev.productName || 'Dining Experience'}
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center text-amber-400 shrink-0">
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

                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{rev.comment}"
                  </p>

                  {/* Customer Food Photo */}
                  {rev.photoUrl && (
                    <div className="pt-1">
                      <img
                        src={rev.photoUrl}
                        alt="Customer meal photo"
                        onClick={() => setPreviewModalPhoto(rev.photoUrl!)}
                        className="w-full h-44 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-95 transition shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Click photo to enlarge</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }) : 'Recent'}
                  </span>
                  <span className="text-emerald-600 font-bold flex items-center space-x-1">
                    <span>✓ Verified Order</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal for Full Photo View */}
      {previewModalPhoto && (
        <div
          id="photo-lightbox-modal"
          onClick={() => setPreviewModalPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 rounded-3xl p-3 border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalPhoto}
              alt="Dish photo enlarged"
              className="w-full max-h-[75vh] object-contain rounded-2xl mx-auto"
            />
            <button
              type="button"
              onClick={() => setPreviewModalPhoto(null)}
              className="absolute top-5 right-5 p-2 bg-slate-950/80 text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
