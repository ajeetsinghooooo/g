import React, { useState, useEffect } from 'react';
import { Search, Filter, Sparkles, Utensils } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';

import { safeJson, apiFetch } from '../utils/api';

interface MenuViewProps {
  onOpenProductDetails: (product: Product) => void;
  initialSearch?: string;
}

export const MenuView: React.FC<MenuViewProps> = ({ onOpenProductDetails, initialSearch = '' }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiFetch('/api/products'),
          apiFetch('/api/categories'),
        ]);
        if (prodRes.ok) {
          const prods = await safeJson(prodRes).catch(() => null);
          if (Array.isArray(prods)) setProducts(prods);
        }
        if (catRes.ok) {
          const cats = await safeJson(catRes).catch(() => null);
          if (Array.isArray(cats)) setCategories(cats);
        }
      } catch (err) {
        console.warn('Failed to load menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Multi-facet filtering on name, description, and category
  const filteredProducts = products.filter((p) => {
    const cleanSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      cleanSearch === '' ||
      p.name.toLowerCase().includes(cleanSearch) ||
      p.description.toLowerCase().includes(cleanSearch) ||
      p.category.toLowerCase().includes(cleanSearch);

    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Recommended'
        ? p.isRecommended
        : p.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesDiet =
      dietFilter === 'all' ? true : dietFilter === 'veg' ? p.isVeg : !p.isVeg;

    return matchesSearch && matchesCategory && matchesDiet;
  });

  return (
    <div id="customer-menu-view" className="space-y-6 pb-20">
      {/* Header & Search Control */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Utensils className="w-6 h-6 text-amber-500" />
            <span>Kitchen Cruze Menu</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse our artisanal selection of slow-cooked biryanis, woodfired pizzas, and street snacks.
          </p>
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="menu-search-input"
            type="text"
            placeholder="Search by dish name, ingredient, or cuisine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dietary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dietary:</span>
            <button
              id="diet-filter-all"
              onClick={() => setDietFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                dietFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Dishes
            </button>
            <button
              id="diet-filter-veg"
              onClick={() => setDietFilter('veg')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                dietFilter === 'veg'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Veg Only</span>
            </button>
            <button
              id="diet-filter-nonveg"
              onClick={() => setDietFilter('nonveg')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                dietFilter === 'nonveg'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Non-Veg</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {filteredProducts.length} items available
          </span>
        </div>
      </div>

      {/* Categories Horizontal Scrolling Pill List */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          id="menu-cat-all"
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
            selectedCategory === 'All'
              ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Delicacies
        </button>

        <button
          id="menu-cat-recommended"
          onClick={() => setSelectedCategory('Recommended')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 shadow-2xs ${
            selectedCategory === 'Recommended'
              ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Recommended</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`menu-cat-${cat.id}`}
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

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 max-w-md mx-auto shadow-xs">
          <p className="text-base font-bold text-slate-900">Menu is Being Curated</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Our chefs are updating today's fresh menu selections. Please check back shortly or explore our special offers!
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <p className="text-base font-bold text-slate-800">No dishes match your criteria</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching for something else or switch to another category filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setDietFilter('all');
            }}
            className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 transition"
          >
            Show All Menu Items
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
    </div>
  );
};
