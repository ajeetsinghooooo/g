import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Utensils,
  FolderTree,
  ShoppingBag,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Save,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Package,
  Bike,
  Store,
  RefreshCw,
  Database,
  Upload,
  FolderOpen,
  Image as ImageIcon,
  CreditCard,
  QrCode,
  Building,
  Check,
  Copy,
  Compass,
  Tag,
  Star,
  X,
  Percent,
  Receipt,
  ShieldCheck,
  Headphones,
  MapPin,
  Navigation,
  Wallet,
  Coins,
  Gift,
  Sparkles,
} from 'lucide-react';
import { KitchenCruzeLogo } from '../../components/KitchenCruzeLogo';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Product,
  Category,
  Order,
  OrderStatus,
  RestaurantSettings,
  RestaurantLocation,
  Offer,
  Review,
  DistanceSlab,
  WeightSlab,
} from '../../types';
import { openWhatsAppOrder } from '../../utils/whatsapp';
import { FileManagerModal } from '../../components/admin/FileManagerModal';
import { DeliveryManagementSection } from './DeliveryManagementSection';
import { WalletsManagementSection } from './WalletsManagementSection';
import { LoyaltySettingsSection } from './LoyaltySettingsSection';
import { CashbackCampaignsSection } from './CashbackCampaignsSection';

interface AdminDashboardViewProps {
  onNavigate: (path: string) => void;
}

type AdminTab =
  | 'overview'
  | 'orders'
  | 'delivery'
  | 'products'
  | 'categories'
  | 'offers'
  | 'reviews'
  | 'payments'
  | 'customers'
  | 'settings';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { adminToken, adminEmail, logoutAdmin } = useAuth();
  const { settings, refreshSettings } = useSettings();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [uploadDirectError, setUploadDirectError] = useState<string | null>(null);
  const directFileInputRef = React.useRef<HTMLInputElement>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productDietFilter, setProductDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [offerSearch, setOfferSearch] = useState('');

  // Add Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);

  // Add Manual Order Modal State
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [manualOrderCustomerName, setManualOrderCustomerName] = useState('');
  const [manualOrderCustomerPhone, setManualOrderCustomerPhone] = useState('');
  const [manualOrderType, setManualOrderType] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [manualOrderAddress, setManualOrderAddress] = useState('');
  const [manualOrderPaymentMethod, setManualOrderPaymentMethod] = useState('Cash on Delivery');
  const [manualOrderNotes, setManualOrderNotes] = useState('');
  const [manualOrderItems, setManualOrderItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [isSavingManualOrder, setIsSavingManualOrder] = useState(false);
  const [manualOrderError, setManualOrderError] = useState<string | null>(null);

  // Add Offer / Coupon Modal State
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [offerCode, setOfferCode] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDiscountType, setOfferDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [offerDiscountValue, setOfferDiscountValue] = useState(20);
  const [offerMinOrder, setOfferMinOrder] = useState(200);
  const [offerMaxDiscount, setOfferMaxDiscount] = useState(100);
  const [offerDescription, setOfferDescription] = useState('');
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Delete Confirmation State (In-App, Iframe-Safe)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'product' | 'category' | 'order' | 'customer' | 'offer' | 'review' | 'orders_bulk' | 'audit_logs' | 'messages';
    id: string;
    name: string;
    description?: string;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const handleDirectImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadDirectError('Please select a valid image file (PNG, JPG, WebP, SVG, GIF)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadDirectError('Image size exceeds 10MB limit');
      return;
    }
    setIsDirectUploading(true);
    setUploadDirectError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, filename: file.name }),
          });
          if (res.ok) {
            const data = await res.json();
            if (editingProduct) {
              setEditingProduct((prev) => (prev ? { ...prev, image: data.url } : prev));
            }
          } else {
            const err = await res.json();
            setUploadDirectError(err.error || 'Failed to upload image');
          }
        } catch (e: any) {
          setUploadDirectError(e.message || 'Upload error');
        } finally {
          setIsDirectUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadDirectError(err.message || 'Upload failed');
      setIsDirectUploading(false);
    }
  };

  // Editable settings state
  const [editableSettings, setEditableSettings] = useState<RestaurantSettings>(settings);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [paymentSettingsSuccess, setPaymentSettingsSuccess] = useState(false);
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [isQrFileManagerOpen, setIsQrFileManagerOpen] = useState(false);
  const [isQrUploading, setIsQrUploading] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);
  const [razorpayGatewayStatus, setRazorpayGatewayStatus] = useState<{ configured: boolean; keyId: string | null } | null>(null);
  const qrFileInputRef = React.useRef<HTMLInputElement>(null);

  // Restaurant Address State & Handlers
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address: settings.address || '',
    landmark: settings.location?.landmark || '',
    city: settings.location?.city || 'Mumbai',
    pincode: settings.location?.pincode || '400050',
    latitude: settings.location?.latitude ?? 19.0760,
    longitude: settings.location?.longitude ?? 72.8777,
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null);
  const [addressErrorMsg, setAddressErrorMsg] = useState<string | null>(null);
  const [detectingAddressGps, setDetectingAddressGps] = useState(false);

  const handleOpenAddressModal = () => {
    setAddressForm({
      address: editableSettings.address || settings.address || '',
      landmark: editableSettings.location?.landmark || settings.location?.landmark || '',
      city: editableSettings.location?.city || settings.location?.city || 'Mumbai',
      pincode: editableSettings.location?.pincode || settings.location?.pincode || '400050',
      latitude: editableSettings.location?.latitude ?? settings.location?.latitude ?? 19.0760,
      longitude: editableSettings.location?.longitude ?? settings.location?.longitude ?? 72.8777,
    });
    setAddressSuccessMsg(null);
    setAddressErrorMsg(null);
    setIsAddressModalOpen(true);
  };

  const handleDetectAddressGps = (target: 'modal' | 'settings' = 'modal') => {
    if (!navigator.geolocation) {
      setAddressErrorMsg('Geolocation is not supported by your browser');
      return;
    }
    setDetectingAddressGps(true);
    setAddressErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        setDetectingAddressGps(false);
        if (target === 'modal') {
          setAddressForm((prev) => ({
            ...prev,
            latitude: newLat,
            longitude: newLng,
          }));
        }
        setEditableSettings((prev) => ({
          ...prev,
          location: {
            ...(prev.location || {}),
            address: prev.address,
            latitude: newLat,
            longitude: newLng,
          },
        }));
        setAddressSuccessMsg(`GPS coordinates detected: ${newLat}, ${newLng}`);
        setTimeout(() => setAddressSuccessMsg(null), 3000);
      },
      (err) => {
        setDetectingAddressGps(false);
        setAddressErrorMsg(`Location notice: ${err.message}. You can manually type coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveAddress = async (e?: React.FormEvent, customSource?: 'modal' | 'inline') => {
    if (e) e.preventDefault();
    const isModal = customSource === 'modal' || (customSource === undefined && isAddressModalOpen);
    const targetAddress = isModal
      ? addressForm.address.trim()
      : (editableSettings.address || '').trim();

    if (!targetAddress) {
      setAddressErrorMsg('Please enter a valid restaurant address');
      return;
    }

    setIsSavingAddress(true);
    setAddressErrorMsg(null);
    setAddressSuccessMsg(null);

    const locationData: RestaurantLocation = isModal
      ? {
          address: targetAddress,
          city: addressForm.city.trim() || 'Mumbai',
          pincode: addressForm.pincode.trim() || '400050',
          landmark: addressForm.landmark.trim(),
          latitude: Number(addressForm.latitude) || 19.0760,
          longitude: Number(addressForm.longitude) || 72.8777,
        }
      : {
          address: targetAddress,
          city: editableSettings.location?.city || 'Mumbai',
          pincode: editableSettings.location?.pincode || '400050',
          landmark: editableSettings.location?.landmark || '',
          latitude: Number(editableSettings.location?.latitude) || 19.0760,
          longitude: Number(editableSettings.location?.longitude) || 72.8777,
        };

    try {
      const res = await fetch('/api/admin/settings/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          address: targetAddress,
          location: locationData,
        }),
      });

      if (res.ok) {
        setEditableSettings((prev) => ({
          ...prev,
          address: targetAddress,
          location: locationData,
        }));
        await refreshSettings();
        setAddressSuccessMsg('Restaurant address updated successfully across all storefront pages!');
        setTimeout(() => {
          setAddressSuccessMsg(null);
          if (isModal) setIsAddressModalOpen(false);
        }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setAddressErrorMsg(data.error || 'Failed to update restaurant address');
      }
    } catch (err: any) {
      setAddressErrorMsg(err.message || 'Network error updating restaurant address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  useEffect(() => {
    fetch('/api/payment/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRazorpayGatewayStatus(data);
      })
      .catch(() => {});
  }, []);

  const handleCopyPaymentField = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPaymentField(fieldId);
    setTimeout(() => setCopiedPaymentField(null), 2000);
  };

  const handleDirectQrUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setQrUploadError('Please select a valid image file for the UPI QR code');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setQrUploadError('Image size exceeds 10MB limit');
      return;
    }
    setIsQrUploading(true);
    setQrUploadError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, filename: `qr_${file.name}` }),
          });
          if (res.ok) {
            const data = await res.json();
            setEditableSettings((prev) => ({
              ...prev,
              payments: {
                ...(prev.payments || {}),
                qrImage: data.url,
              } as any,
            }));
          } else {
            const err = await res.json();
            setQrUploadError(err.error || 'Failed to upload QR image');
          }
        } catch (e: any) {
          setQrUploadError(e.message || 'Upload error');
        } finally {
          setIsQrUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setQrUploadError(err.message || 'Upload failed');
      setIsQrUploading(false);
    }
  };

  const handleSavePaymentSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPayments(true);
    try {
      const res = await fetch('/api/admin/settings/payments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(editableSettings.payments),
      });
      if (res.ok) {
        await refreshSettings();
        setPaymentSettingsSuccess(true);
        setTimeout(() => setPaymentSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save payment settings error:', err);
    } finally {
      setIsSavingPayments(false);
    }
  };

  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    provider: string;
    host: string;
    database: string;
    lastSyncedAt: string | null;
  } | null>(null);

  const fetchAdminData = async () => {
    const effectiveToken = adminToken || localStorage.getItem('kc_staff_token');
    if (!effectiveToken) {
      setLoading(false);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${effectiveToken}` };
      const [ordersRes, prodsRes, catsRes, custsRes, offersRes, reviewsRes, dbRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/categories', { headers }),
        fetch('/api/admin/customers', { headers }),
        fetch('/api/offers'),
        fetch('/api/admin/reviews', { headers }),
        fetch('/api/database/status'),
      ]);

      const parseJsonSafe = async (res: Response, _label: string) => {
        if (!res.ok) {
          return null;
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
        return null;
      };

      const ordersData = await parseJsonSafe(ordersRes, 'orders');
      if (Array.isArray(ordersData)) setOrders(ordersData);

      const prodsData = await parseJsonSafe(prodsRes, 'products');
      if (Array.isArray(prodsData)) setProducts(prodsData);

      const catsData = await parseJsonSafe(catsRes, 'categories');
      if (Array.isArray(catsData)) setCategories(catsData);

      const custsData = await parseJsonSafe(custsRes, 'customers');
      if (Array.isArray(custsData)) setCustomers(custsData);

      const offersData = await parseJsonSafe(offersRes, 'offers');
      if (Array.isArray(offersData)) setOffers(offersData);

      const reviewsData = await parseJsonSafe(reviewsRes, 'reviews');
      if (Array.isArray(reviewsData)) setReviews(reviewsData);

      const dbData = await parseJsonSafe(dbRes, 'database-status');
      if (dbData && typeof dbData === 'object') setDbStatus(dbData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    setEditableSettings(settings);
    if (!isAddressModalOpen) {
      setAddressForm({
        address: settings.address || '',
        landmark: settings.location?.landmark || '',
        city: settings.location?.city || 'Mumbai',
        pincode: settings.location?.pincode || '400050',
        latitude: settings.location?.latitude ?? 19.0760,
        longitude: settings.location?.longitude ?? 72.8777,
      });
    }
  }, [adminToken, settings, isAddressModalOpen]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated.order : o)));
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;
    if (!editingProduct.image) {
      setUploadDirectError('Please upload an image for the product.');
      return;
    }

    try {
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${editingProduct.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(editingProduct),
      });

      if (res.ok) {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const handleDeleteProduct = (productId: string, productName?: string) => {
    const prod = products.find((p) => p.id === productId);
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'product',
      id: productId,
      name: productName || prod?.name || 'this product',
    });
  };

  const handleDeleteCategory = (categoryId: string, categoryName?: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'category',
      id: categoryId,
      name: categoryName || cat?.name || 'this category',
    });
  };

  const handleDeleteOrder = (orderId: string, customerName?: string) => {
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'order',
      id: orderId,
      name: `Order #${orderId}`,
      description: `Permanently delete Order #${orderId} (${customerName || 'Customer'}) from database, tracking, and history?`,
    });
  };

  const handleBulkDeleteOrders = (filter: 'cancelled' | 'delivered' | 'all') => {
    setDeleteItemError(null);
    const labels: Record<string, string> = {
      cancelled: 'All Cancelled Orders',
      delivered: 'All Delivered Orders',
      all: 'ALL Orders in System',
    };
    setDeleteConfirm({
      type: 'orders_bulk',
      id: filter,
      name: labels[filter] || 'Selected Orders',
      description: `Are you sure you want to permanently purge ${labels[filter] || 'these orders'}? This cannot be undone.`,
    });
  };

  const handleDeleteCustomer = (customerId: string, customerName?: string) => {
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'customer',
      id: customerId,
      name: customerName || 'Customer Account',
      description: `Permanently delete ${customerName || 'this customer'}'s profile, saved addresses, and account data?`,
    });
  };

  const handleDeleteOffer = (offerId: string, couponCode?: string) => {
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'offer',
      id: offerId,
      name: `Promo Code ${couponCode || offerId}`,
      description: `Permanently delete discount promo code ${couponCode || ''}? Customers will no longer be able to apply this code at checkout.`,
    });
  };

  const handleDeleteReview = (reviewId: string, productName?: string) => {
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'review',
      id: reviewId,
      name: `Review for ${productName || 'Product'}`,
      description: `Permanently delete this customer review? The dish's average rating and total review count will update automatically.`,
    });
  };

  const handleClearAuditLogs = () => {
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'audit_logs',
      id: 'audit_logs',
      name: 'System Audit Logs',
      description: 'Clear and permanently delete all recorded admin and customer activity audit logs?',
    });
  };

  const handleClearMessages = () => {
    setDeleteItemError(null);
    setDeleteConfirm({
      type: 'messages',
      id: 'messages',
      name: 'System Notifications & Messages',
      description: 'Clear and permanently delete all stored system notification messages?',
    });
  };

  // Distance & Weight Slabs Add, Update, and Delete handlers (Restaurant Settings)
  const handleUpdateDistanceSlab = (slabId: string, field: 'minDistanceKm' | 'maxDistanceKm' | 'charge', value: number) => {
    setEditableSettings((prev) => ({
      ...prev,
      deliveryRules: {
        ...prev.deliveryRules,
        distanceSlabs: (prev.deliveryRules?.distanceSlabs || []).map((s) =>
          s.id === slabId ? { ...s, [field]: Number(value) } : s
        ),
      },
    }));
  };

  const handleDeleteDistanceSlab = (slabId: string) => {
    setEditableSettings((prev) => ({
      ...prev,
      deliveryRules: {
        ...prev.deliveryRules,
        distanceSlabs: (prev.deliveryRules?.distanceSlabs || []).filter((s) => s.id !== slabId),
      },
    }));
  };

  const handleAddDistanceSlab = () => {
    const slabs = editableSettings.deliveryRules?.distanceSlabs || [];
    const lastSlab = slabs[slabs.length - 1];
    const min = lastSlab ? lastSlab.maxDistanceKm : 0;
    const newSlab: DistanceSlab = {
      id: 'dist-' + Date.now(),
      minDistanceKm: min,
      maxDistanceKm: min + (slabs.length === 0 ? 2 : 3),
      charge: slabs.length === 0 ? 0 : 20,
    };
    setEditableSettings((prev) => ({
      ...prev,
      deliveryRules: {
        ...prev.deliveryRules,
        distanceSlabs: [...slabs, newSlab],
      },
    }));
  };

  const handleDeleteWeightSlab = (slabId: string) => {
    setEditableSettings((prev) => ({
      ...prev,
      deliveryRules: {
        ...prev.deliveryRules,
        weightSlabs: (prev.deliveryRules?.weightSlabs || []).filter((s) => s.id !== slabId),
      },
    }));
  };

  const handleAddWeightSlab = () => {
    const slabs = editableSettings.deliveryRules?.weightSlabs || [];
    const lastSlab = slabs[slabs.length - 1];
    const min = lastSlab ? lastSlab.maxWeightKg : 0;
    const newSlab: WeightSlab = {
      id: 'wt-' + Date.now(),
      minWeightKg: min,
      maxWeightKg: min + 1,
      charge: 20,
    };
    setEditableSettings((prev) => ({
      ...prev,
      deliveryRules: {
        ...prev.deliveryRules,
        weightSlabs: [...slabs, newSlab],
      },
    }));
  };

  // Add Customer Handler
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setCustomerModalError('Full Name and Phone number are required.');
      return;
    }
    setIsSavingCustomer(true);
    setCustomerModalError(null);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          fullName: newCustName.trim(),
          phone: newCustPhone.trim(),
          email: newCustEmail.trim() || undefined,
          address: newCustAddress.trim() ? { house: newCustAddress.trim(), city: 'Mumbai', pincode: '400050' } : undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        setIsAddCustomerOpen(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        setNewCustAddress('');
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomerModalError(data.error || 'Failed to add customer');
      }
    } catch (err: any) {
      setCustomerModalError(err.message || 'Error occurred while creating customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Add Manual Order Handler
  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderCustomerName.trim() || manualOrderItems.length === 0) {
      setManualOrderError('Customer name and at least one food item are required.');
      return;
    }
    setIsSavingManualOrder(true);
    setManualOrderError(null);
    try {
      const mappedItems = manualOrderItems.map((sel) => {
        const prod = products.find((p) => p.id === sel.productId);
        const price = prod ? prod.price : 100;
        return {
          productId: sel.productId,
          name: prod?.name || 'Dish',
          price,
          quantity: sel.quantity,
          itemTotal: price * sel.quantity,
          customizations: [],
        };
      });

      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          customerName: manualOrderCustomerName.trim(),
          customerPhone: manualOrderCustomerPhone.trim() || 'N/A',
          orderType: manualOrderType,
          deliveryAddress: {
            house: manualOrderAddress.trim() || (manualOrderType === 'Delivery' ? 'Delivery Address' : 'Kitchen Cruze Takeaway'),
            street: 'Store Counter',
            city: 'Mumbai',
            pincode: '400050',
          },
          paymentMethod: manualOrderPaymentMethod,
          notes: manualOrderNotes.trim(),
          items: mappedItems,
        }),
      });

      if (res.ok) {
        const newOrder = await res.json();
        setOrders((prev) => [newOrder, ...prev]);
        setIsAddOrderOpen(false);
        setManualOrderCustomerName('');
        setManualOrderCustomerPhone('');
        setManualOrderAddress('');
        setManualOrderNotes('');
        setManualOrderItems([]);
      } else {
        const data = await res.json().catch(() => ({}));
        setManualOrderError(data.error || 'Failed to create order');
      }
    } catch (err: any) {
      setManualOrderError(err.message || 'Error occurred while creating order');
    } finally {
      setIsSavingManualOrder(false);
    }
  };

  // Add Offer / Promo Code Handler
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerCode.trim() || !offerTitle.trim()) {
      setOfferError('Coupon Code and Title are required.');
      return;
    }
    setIsSavingOffer(true);
    setOfferError(null);
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          couponCode: offerCode.trim().toUpperCase(),
          title: offerTitle.trim(),
          description: offerDescription.trim() || `${offerDiscountValue}${offerDiscountType === 'percentage' ? '%' : '₹'} off on orders over ₹${offerMinOrder}`,
          discountType: offerDiscountType,
          discountValue: Number(offerDiscountValue),
          minimumOrder: Number(offerMinOrder),
          maximumDiscount: offerDiscountType === 'percentage' ? Number(offerMaxDiscount) : undefined,
          active: true,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setOffers((prev) => [created, ...prev]);
        setIsAddOfferOpen(false);
        setOfferCode('');
        setOfferTitle('');
        setOfferDescription('');
      } else {
        const data = await res.json().catch(() => ({}));
        setOfferError(data.error || 'Failed to create promo code');
      }
    } catch (err: any) {
      setOfferError(err.message || 'Error occurred while creating promo code');
    } finally {
      setIsSavingOffer(false);
    }
  };

  // Review Status Toggle
  const handleToggleReviewStatus = async (reviewId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus as any } : r)));
      }
    } catch (e) {
      console.error('Error toggling review status:', e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeletingItem(true);
    setDeleteItemError(null);
    const token = adminToken || localStorage.getItem('kc_staff_token') || '';

    try {
      let endpoint = '';
      let method = 'DELETE';
      let body: string | undefined;

      switch (deleteConfirm.type) {
        case 'product':
          endpoint = `/api/admin/products/${deleteConfirm.id}`;
          break;
        case 'category':
          endpoint = `/api/admin/categories/${deleteConfirm.id}`;
          break;
        case 'order':
          endpoint = `/api/admin/orders/${deleteConfirm.id}`;
          break;
        case 'orders_bulk':
          endpoint = `/api/admin/orders/bulk-delete`;
          method = 'POST';
          body = JSON.stringify({ filter: deleteConfirm.id });
          break;
        case 'customer':
          endpoint = `/api/admin/customers/${deleteConfirm.id}`;
          break;
        case 'offer':
          endpoint = `/api/admin/offers/${deleteConfirm.id}`;
          break;
        case 'review':
          endpoint = `/api/admin/reviews/${deleteConfirm.id}`;
          break;
        case 'audit_logs':
          endpoint = `/api/admin/audit-logs`;
          break;
        case 'messages':
          endpoint = `/api/admin/messages`;
          break;
      }

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body } : {}),
      });

      if (res.ok) {
        if (deleteConfirm.type === 'product') {
          setProducts((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        } else if (deleteConfirm.type === 'category') {
          setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
        } else if (deleteConfirm.type === 'order') {
          setOrders((prev) => prev.filter((o) => o.id !== deleteConfirm.id));
        } else if (deleteConfirm.type === 'orders_bulk') {
          if (deleteConfirm.id === 'all') {
            setOrders([]);
          } else if (deleteConfirm.id === 'cancelled') {
            setOrders((prev) => prev.filter((o) => o.status !== 'Cancelled'));
          } else if (deleteConfirm.id === 'delivered') {
            setOrders((prev) => prev.filter((o) => o.status !== 'Delivered'));
          }
        } else if (deleteConfirm.type === 'customer') {
          setCustomers((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
        } else if (deleteConfirm.type === 'offer') {
          setOffers((prev) => prev.filter((o) => o.id !== deleteConfirm.id));
        } else if (deleteConfirm.type === 'review') {
          setReviews((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
        }
        setDeleteConfirm(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteItemError(data.error || `Failed to delete ${deleteConfirm.name}.`);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteItemError(err.message || 'Error occurred while deleting.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleToggleProductAvailability = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p))
        );
      }
    } catch (err) {
      console.error('Toggle availability error:', err);
    }
  };

  const handleToggleProductRecommended = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isRecommended: !product.isRecommended }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isRecommended: !p.isRecommended } : p))
        );
      }
    } catch (err) {
      console.error('Toggle recommended error:', err);
    }
  };

  const handleToggleProductVeg = async (product: Product) => {
    try {
      const nextVegState = !product.isVeg;
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isVeg: nextVegState }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isVeg: nextVegState } : p))
        );
      }
    } catch (err) {
      console.error('Toggle isVeg error:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        setNewCategoryName('');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

      {/* Category delete handled by handleConfirmDelete */}

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...editableSettings,
        address: editableSettings.address,
        location: {
          ...(editableSettings.location || {}),
          address: editableSettings.address,
        },
      };
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await refreshSettings();
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  // Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.grandTotal : 0), 0);
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Picked Up' && o.status !== 'Cancelled'
  ).length;

  return (
    <div id="admin-portal" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <KitchenCruzeLogo variant="light" size="sm" customLogoUrl={settings.logo} onClick={() => onNavigate('/')} />
          <div className="hidden sm:flex items-center space-x-2">
            <span className="bg-amber-500/20 text-amber-400 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
              OPERATIONS PORTAL
            </span>
            <span className="text-xs text-slate-400">Logged in as {adminEmail}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Quick Restaurant Address Change Button */}
          <button
            type="button"
            id="admin-change-restaurant-address-btn"
            onClick={handleOpenAddressModal}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 transition cursor-pointer group"
            title="Click to change restaurant address"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition shrink-0" />
            <span className="hidden md:inline max-w-[160px] lg:max-w-[240px] truncate text-slate-200">
              {settings.address || 'Set Restaurant Address'}
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Change Address
            </span>
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center space-x-1.5"
          >
            <span>Live Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              logoutAdmin();
              onNavigate('/admin/login');
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/80 transition flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-56 shrink-0 space-y-1 bg-slate-900/60 border border-slate-800/80 p-3 rounded-3xl h-fit">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'orders', label: 'Manage Orders', icon: ShoppingBag, badge: activeOrdersCount },
            { id: 'delivery', label: 'Delivery & Radius', icon: Bike },
            { id: 'products', label: 'Food Menu', icon: Utensils, badge: products.length },
            { id: 'categories', label: 'Categories', icon: FolderTree },
            { id: 'offers', label: 'Offers & Coupons', icon: Tag, badge: offers.length },
            { id: 'reviews', label: 'Customer Reviews', icon: Star, badge: reviews.length },
            { id: 'customers', label: 'Customers', icon: Users, badge: customers.length },
            { id: 'settings', label: 'Restaurant Settings', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-tab-${item.id}`}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Tab Contents */}
        <main className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 overflow-hidden">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Kitchen Cruze Dashboard</h2>
                  <p className="text-xs text-slate-400">Live summary of kitchen orders and revenue</p>
                </div>
                <button
                  onClick={fetchAdminData}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold">Total Revenue</span>
                  <div className="text-2xl font-black text-emerald-400">₹{totalRevenue}</div>
                  <p className="text-[10px] text-slate-500">From all processed orders</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold">Active Orders</span>
                  <div className="text-2xl font-black text-amber-400">{activeOrdersCount}</div>
                  <p className="text-[10px] text-slate-500">Kitchen &amp; Out for delivery</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold">Live Menu Items</span>
                  <div className="text-2xl font-black text-blue-400">{products.length}</div>
                  <p className="text-[10px] text-slate-500">{categories.length} active categories</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold">Registered Patrons</span>
                  <div className="text-2xl font-black text-purple-400">{customers.length}</div>
                  <p className="text-[10px] text-slate-500">Accounts with delivery profile</p>
                </div>
              </div>

              {/* Restaurant Address & Location Card */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-white">Restaurant Physical Address &amp; Store Location</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        Live on Storefront
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                      {settings.address || 'No physical address configured yet.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                      {settings.location?.city && (
                        <span>City: <strong className="text-slate-200">{settings.location.city}</strong></span>
                      )}
                      {settings.location?.pincode && (
                        <span>Pincode: <strong className="text-slate-200">{settings.location.pincode}</strong></span>
                      )}
                      {settings.location?.landmark && (
                        <span>Area: <strong className="text-slate-200">{settings.location.landmark}</strong></span>
                      )}
                      {settings.location?.latitude && settings.location?.longitude && (
                        <span className="font-mono text-slate-400">
                          GPS: {settings.location.latitude.toFixed(4)}, {settings.location.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                  <button
                    type="button"
                    id="admin-overview-change-address-btn"
                    onClick={handleOpenAddressModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Change Address</span>
                  </button>
                  {settings.location?.latitude && settings.location?.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${settings.location.latitude},${settings.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Map</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Recent Incoming Orders
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-amber-400 hover:underline"
                  >
                    View All Orders &rarr;
                  </button>
                </div>

                <div className="space-y-2">
                  {orders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-400">#{ord.id}</span>
                          <span className="font-bold text-white">{ord.customer?.fullName || ord.customerName || 'Customer'}</span>
                          <span className="text-slate-500">({ord.orderType})</span>
                        </div>
                        <p className="text-slate-400 text-[11px] truncate max-w-sm">
                          {ord.items.map((it) => `${it.name} x${it.quantity}`).join(', ')}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-white">₹{ord.grandTotal}</div>
                        <span className="text-[10px] font-bold text-amber-400">{ord.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. ORDERS MANAGEMENT TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Live Orders Management</h2>
                  <p className="text-xs text-slate-400">
                    Accept orders, update statuses, and notify customers
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, or phone..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {orders.some((o) => o.status === 'Cancelled') && (
                    <button
                      type="button"
                      onClick={() => handleBulkDeleteOrders('cancelled')}
                      className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl text-xs font-bold border border-rose-800/60 transition flex items-center space-x-1"
                      title="Delete all cancelled orders"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Cancelled</span>
                    </button>
                  )}
                  {orders.some((o) => o.status === 'Delivered') && (
                    <button
                      type="button"
                      onClick={() => handleBulkDeleteOrders('delivered')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center space-x-1"
                      title="Clear delivered orders"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Delivered</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="admin-create-order-btn"
                    onClick={() => {
                      setManualOrderError(null);
                      setManualOrderCustomerName('');
                      setManualOrderCustomerPhone('');
                      setManualOrderAddress('');
                      setManualOrderNotes('');
                      setManualOrderItems([]);
                      setIsAddOrderOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Create Order</span>
                  </button>
                </div>
              </div>

              {/* Order Cards */}
              <div className="space-y-4">
                {orders
                  .filter((o) => {
                    const q = orderSearch.toLowerCase();
                    const custName = (o.customer?.fullName || o.customerName || '').toLowerCase();
                    const custPhone = o.customer?.phone || o.customerPhone || '';
                    return (
                      o.id.toLowerCase().includes(q) ||
                      custName.includes(q) ||
                      custPhone.includes(q)
                    );
                  })
                  .map((order) => {
                    const statusOptions: OrderStatus[] =
                      order.orderType === 'Delivery'
                        ? [
                            'Order Received',
                            'Confirmed',
                            'Preparing',
                            'Ready',
                            'Out for Delivery',
                            'Delivered',
                            'Cancelled',
                          ]
                        : [
                            'Order Received',
                            'Confirmed',
                            'Preparing',
                            'Ready for Pickup',
                            'Picked Up',
                            'Cancelled',
                          ];

                    return (
                      <div
                        key={order.id}
                        id={`admin-order-card-${order.id}`}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
                      >
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono font-bold text-xs bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                              #{order.id}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-amber-400">
                              ({order.orderType})
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openWhatsAppOrder(order, settings)}
                              className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white text-emerald-400 text-xs font-bold rounded-lg transition flex items-center space-x-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            <span className="text-base font-extrabold text-white">
                              ₹{order.grandTotal}
                            </span>
                            <button
                              id={`delete-order-${order.id}`}
                              type="button"
                              onClick={() => handleDeleteOrder(order.id, order.customerName || order.customer?.fullName)}
                              className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800/40 hover:border-rose-600 transition"
                              title={`Delete Order #${order.id}`}
                              aria-label={`Delete Order #${order.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Customer & Items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 font-semibold block">
                              Customer Information
                            </span>
                            <p className="font-bold text-white mt-0.5">
                              {order.customer?.fullName || order.customerName || 'Customer'} ({order.customer?.phone || order.customerPhone || 'N/A'})
                            </p>
                            {order.orderType === 'Delivery' && (
                              <div className="space-y-1 mt-0.5">
                                <p className="text-slate-400">
                                  Address: {order.customer?.deliveryAddress || (order.deliveryAddress ? `${order.deliveryAddress.house}, ${order.deliveryAddress.street}` : 'N/A')}{' '}
                                  {(order.customer?.landmark || order.deliveryAddress?.landmark) && `(Landmark: ${order.customer?.landmark || order.deliveryAddress?.landmark})`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-[10px]">
                                    <Compass className="w-3 h-3" />
                                    <span>Distance: {order.deliveryDistanceDisplay || (order.deliveryDistanceKm ? `${order.deliveryDistanceKm} KM` : '2.0 KM')}</span>
                                  </span>
                                  {order.deliveryRadiusAtOrder && (
                                    <span className="text-[10px] text-slate-500">
                                      (Radius Limit: {order.deliveryRadiusAtOrder} KM)
                                    </span>
                                  )}
                                  {order.assignedDeliveryBoyName && (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                                      <Bike className="w-3 h-3" />
                                      <span>Assigned: #{order.assignedDeliveryBoyNumber || 1} {order.assignedDeliveryBoyName}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {order.specialInstructions && (
                              <p className="text-amber-400 mt-1 italic">
                                Special note: "{order.specialInstructions}"
                              </p>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-500 font-semibold block">Ordered Items</span>
                            <div className="space-y-1 mt-0.5">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-slate-300">
                                  <span>
                                    {item.name} x {item.quantity}
                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                      <span className="text-[11px] text-slate-500">
                                        {' '}
                                        (+{item.selectedAddons.map((a) => a.name).join(', ')})
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-bold">₹{item.itemTotal}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Status Updater Control */}
                        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-400">Update Status:</span>
                            <select
                              id={`admin-status-select-${order.id}`}
                              value={order.status}
                              onChange={(e) =>
                                handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                              }
                              className="bg-slate-900 border border-slate-700 text-amber-400 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {statusOptions.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <span className="text-[11px] text-slate-500">
                            Payment: {order.paymentMethod} ({order.paymentStatus})
                            {order.razorpayPaymentId && (
                              <span className="ml-1.5 text-emerald-400 font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                RZP: {order.razorpayPaymentId}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* DELIVERY & RADIUS MANAGEMENT TAB */}
          {activeTab === 'delivery' && (
            <DeliveryManagementSection
              adminToken={adminToken!}
              settings={settings}
              onSettingsUpdated={() => refreshSettings()}
              orders={orders}
              onOrderUpdated={(updated) =>
                setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
              }
            />
          )}

          {/* 3. PRODUCTS MANAGEMENT TAB */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Food Menu Inventory</h2>
                  <p className="text-xs text-slate-400">
                    Add, modify pricing, upload images, or mark dishes as chef recommended
                  </p>
                </div>

                <button
                  id="admin-add-product-btn"
                  onClick={() => {
                    setEditingProduct({
                      name: '',
                      price: 0,
                      originalPrice: 0,
                      description: '',
                      category: categories[0]?.name || '',
                      image: '',
                      isVeg: true,
                      isAvailable: true,
                      isRecommended: false,
                    });
                    setIsProductModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Products Filter & Dietary Controls */}
              {products.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      type="button"
                      id="admin-filter-diet-all"
                      onClick={() => setProductDietFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        productDietFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>All Dishes</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/30 font-black">
                        {products.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="admin-filter-diet-veg"
                      onClick={() => setProductDietFilter('veg')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        productDietFilter === 'veg'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60 border border-emerald-800/40'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-xs border-2 border-emerald-400 flex items-center justify-center bg-emerald-950">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <span>Pure Veg</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-black">
                        {products.filter((p) => p.isVeg).length}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="admin-filter-diet-nonveg"
                      onClick={() => setProductDietFilter('nonveg')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                        productDietFilter === 'nonveg'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-950/30 text-rose-400 hover:bg-rose-950/60 border border-rose-800/40'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-xs border-2 border-rose-400 flex items-center justify-center bg-rose-950">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      </div>
                      <span>Non-Veg</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-black">
                        {products.filter((p) => !p.isVeg).length}
                      </span>
                    </button>
                  </div>

                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search food name or category..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Products Table/Grid */}
              {products.length === 0 ? (
                <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Food Items in Menu</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    No dishes have been added yet. Click &ldquo;Add New Product&rdquo; above to list your first food item with photos, pricing, and category.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products
                    .filter((prod) => {
                      const matchesDiet =
                        productDietFilter === 'all'
                          ? true
                          : productDietFilter === 'veg'
                          ? prod.isVeg
                          : !prod.isVeg;
                      const matchesSearch =
                        !productSearch.trim() ||
                        prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        prod.category.toLowerCase().includes(productSearch.toLowerCase());
                      return matchesDiet && matchesSearch;
                    })
                    .map((prod) => (
                    <div
                      key={prod.id}
                      id={`admin-product-row-${prod.id}`}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-900 shrink-0"
                        />
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="font-bold text-white">{prod.name}</h4>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                              {prod.category}
                            </span>
                            {/* Veg / Non-Veg Badge & Quick Click Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleProductVeg(prod)}
                              title={`Currently ${prod.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}. Click to switch to ${prod.isVeg ? 'Non-Veg' : 'Veg'}`}
                              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold transition hover:opacity-90 ${
                                prod.isVeg
                                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-400'
                                  : 'bg-rose-950/70 border-rose-500/60 text-rose-400'
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center bg-slate-950 ${
                                  prod.isVeg ? 'border-emerald-500' : 'border-rose-500'
                                }`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    prod.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                              </div>
                              <span>{prod.isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
                            </button>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-amber-400 font-extrabold">₹{prod.price}</span>
                            {prod.originalPrice && (
                              <span className="text-slate-500 line-through text-[11px]">
                                ₹{prod.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-1">
                        {/* Quick Dietary Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductVeg(prod)}
                          title={`Switch to ${prod.isVeg ? 'Non-Veg' : 'Veg'}`}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                            prod.isVeg
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-xs border flex items-center justify-center ${
                              prod.isVeg ? 'border-emerald-400' : 'border-rose-400'
                            }`}
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${
                                prod.isVeg ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                          </div>
                          <span>{prod.isVeg ? 'Veg' : 'Non-Veg'}</span>
                        </button>

                        <button
                          onClick={() => handleToggleProductRecommended(prod)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            prod.isRecommended
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}
                        >
                          {prod.isRecommended ? '★ Recommended' : '☆ Normal'}
                        </button>

                        <button
                          onClick={() => handleToggleProductAvailability(prod)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            prod.isAvailable
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {prod.isAvailable ? 'In Stock' : 'Sold Out'}
                        </button>

                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setIsProductModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`delete-product-${prod.id}`}
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800/40 hover:border-rose-600 transition"
                          title={`Delete ${prod.name}`}
                          aria-label={`Delete ${prod.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Empty state for search/filter */}
                  {products.length > 0 &&
                    products.filter((prod) => {
                      const matchesDiet =
                        productDietFilter === 'all'
                          ? true
                          : productDietFilter === 'veg'
                          ? prod.isVeg
                          : !prod.isVeg;
                      const matchesSearch =
                        !productSearch.trim() ||
                        prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        prod.category.toLowerCase().includes(productSearch.toLowerCase());
                      return matchesDiet && matchesSearch;
                    }).length === 0 && (
                      <div className="text-center py-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                        <p>No food dishes match your selected filter ({productDietFilter !== 'all' ? `${productDietFilter} only` : ''}{productSearch ? ` searching "${productSearch}"` : ''}).</p>
                        <button
                          type="button"
                          onClick={() => {
                            setProductDietFilter('all');
                            setProductSearch('');
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-bold"
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

        {/* 4. CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <h2 className="text-xl font-black text-white">Food Categories</h2>
              <p className="text-xs text-slate-400">
                Manage categories shown on Kitchen Cruze customer storefront
              </p>
            </div>

            {/* Add category form */}
            <form onSubmit={handleAddCategory} className="flex space-x-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Artisanal Shakes)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
              >
                Add Category
              </button>
            </form>

            {/* Categories list */}
            {categories.length === 0 ? (
              <div className="text-center py-8 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-2">
                <p className="text-xs font-bold text-slate-300">No Categories Created Yet</p>
                <p className="text-[11px] text-slate-500">
                  Use the input above to add your first menu category (e.g. Starters, Main Course, Biryani, Beverages).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white">{cat.name}</span>
                    <button
                      id={`delete-category-${cat.id}`}
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 rounded-lg transition"
                      title={`Delete ${cat.name}`}
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* OFFERS & COUPONS TAB */}
          {activeTab === 'offers' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-black text-white">Offers, Coupons &amp; Promo Codes</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Create special discount coupons, percentage offers, and flat rebates for customers.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="admin-add-offer-btn"
                    onClick={() => {
                      setOfferError(null);
                      setOfferCode('');
                      setOfferTitle('');
                      setOfferDescription('');
                      setOfferDiscountType('percentage');
                      setOfferDiscountValue(20);
                      setOfferMinOrder(200);
                      setOfferMaxDiscount(100);
                      setIsAddOfferOpen(true);
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Create Coupon</span>
                  </button>
                </div>
              </div>

              {offers.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-2">
                  <Tag className="w-8 h-8 text-amber-500/50 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No Promo Coupons Found</p>
                  <p className="text-xs text-slate-500">
                    Click &ldquo;+ Create Coupon&rdquo; to launch your first promotional discount (e.g. FLAT50, CRUZE20).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      id={`admin-offer-card-${offer.id}`}
                      className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-black text-xs rounded-lg uppercase tracking-wider">
                              {offer.couponCode || offer.code}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                offer.active
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {offer.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-sm pt-1">{offer.title}</h3>
                          <p className="text-slate-400 text-xs">{offer.description}</p>
                        </div>

                        <button
                          type="button"
                          id={`admin-delete-offer-${offer.id}`}
                          onClick={() => handleDeleteOffer(offer.id, offer.couponCode || offer.code)}
                          className="p-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl border border-rose-800/40 hover:border-rose-600 transition shrink-0 cursor-pointer"
                          title={`Delete Coupon ${offer.couponCode || offer.code}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                        <div>
                          <span>Discount: </span>
                          <span className="font-bold text-amber-400">
                            {offer.discountValue}
                            {offer.discountType === 'percentage' ? '%' : '₹'}
                          </span>
                          {offer.maximumDiscount && ` (Up to ₹${offer.maximumDiscount})`}
                        </div>
                        <div>
                          <span>Min Order: </span>
                          <span className="font-bold text-white">₹{offer.minimumOrder}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CUSTOMER REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h2 className="text-xl font-black text-white">Genuine Customer Reviews &amp; Ratings</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct reviews submitted by diners on the website. Customer feedback is preserved to maintain real customer trust.
                </p>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-10 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-2">
                  <Star className="w-8 h-8 text-amber-500/50 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No Customer Reviews Yet</p>
                  <p className="text-xs text-slate-500">
                    Reviews submitted by customers on your store will appear here and on the public website.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      id={`admin-review-card-${rev.id}`}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">
                              {rev.customerName || 'Anonymous Customer'}
                            </span>
                            <div className="flex items-center text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] font-bold text-amber-400">({rev.rating}/5)</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Reviewed dish / experience:{' '}
                            <span className="text-slate-200 font-bold">{rev.productName || 'Food Item'}</span>
                            {rev.createdAt && ` • ${new Date(rev.createdAt).toLocaleDateString()}`}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            ✓ Published
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 italic">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Customer Database</h2>
                  <p className="text-xs text-slate-400">
                    Registered customer accounts and their delivery preferences
                  </p>
                </div>

                <button
                  type="button"
                  id="admin-add-customer-btn"
                  onClick={() => {
                    setCustomerModalError(null);
                    setNewCustName('');
                    setNewCustPhone('');
                    setNewCustEmail('');
                    setNewCustAddress('');
                    setIsAddCustomerOpen(true);
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Customer</span>
                </button>
              </div>

              <div className="space-y-3">
                {customers.map((cust) => (
                  <div
                    key={cust.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs flex flex-col sm:flex-row justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">{cust.fullName}</div>
                      <p className="text-slate-400">
                        📞 {cust.phone} • ✉️ {cust.email}
                      </p>
                      {cust.deliveryAddress && (
                        <p className="text-slate-500 text-[11px]">
                          📍 {cust.deliveryAddress}{' '}
                          {cust.landmark && `(Landmark: ${cust.landmark})`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 sm:self-center">
                      <span className="bg-slate-900 text-slate-400 px-2 py-1 rounded-md text-[11px] font-mono">
                        User ID: {cust.id}
                      </span>
                      <button
                        id={`delete-customer-${cust.id}`}
                        type="button"
                        onClick={() => handleDeleteCustomer(cust.id, cust.fullName)}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800/40 hover:border-rose-600 transition"
                        title={`Delete Customer ${cust.fullName}`}
                        aria-label={`Delete Customer ${cust.fullName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. PAYMENT SETTINGS TAB (Removed) */}
          {false && (
            <form onSubmit={handleSavePaymentSettings} className="space-y-6 max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-black text-white">Payment Gateway &amp; Method Settings</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure customer payment options, UPI IDs, custom QR codes, and bank accounts. Changes sync directly to Supabase and reflect live on customer checkout.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {paymentSettingsSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Saved to Supabase!</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    id="admin-save-payments-btn-top"
                    disabled={isSavingPayments}
                    className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 shrink-0 cursor-pointer"
                  >
                    {isSavingPayments ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Payment Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>



              {/* Section 2: UPI ID & QR Code Settings */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>2. UPI Details &amp; QR Code Management</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set up your primary UPI ID and upload or change your UPI QR code image anytime.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* UPI Details Inputs */}
                  <div className="md:col-span-7 space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Merchant UPI ID (VPA) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="admin-payment-upi-id"
                          required
                          placeholder="e.g. kitchencruze@upi or 9876543210@paytm"
                          value={editableSettings.payments?.upiId || ''}
                          onChange={(e) =>
                            setEditableSettings((prev) => ({
                              ...prev,
                              payments: {
                                ...(prev.payments || {}),
                                upiId: e.target.value,
                              } as any,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        {editableSettings.payments?.upiId && (
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentField(editableSettings.payments.upiId, 'upi')}
                            className="absolute right-2 top-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                          >
                            {copiedPaymentField === 'upi' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedPaymentField === 'upi' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Customers will see and pay directly to this UPI Virtual Payment Address (VPA).
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        UPI Payee / Business Name
                      </label>
                      <input
                        type="text"
                        id="admin-payment-upi-payee"
                        placeholder="e.g. Kitchen Cruze Restaurant"
                        value={editableSettings.payments?.upiPayeeName || ''}
                        onChange={(e) =>
                          setEditableSettings((prev) => ({
                            ...prev,
                            payments: {
                              ...(prev.payments || {}),
                              upiPayeeName: e.target.value,
                            } as any,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Registered business name that appears on UPI transaction confirmation screens.
                      </p>
                    </div>

                    {/* QR Code Upload Controls */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <label className="block text-slate-300 font-semibold">
                        UPI QR Code Image (Upload / Change Anytime)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Upload your official merchant QR code image from Google Pay, PhonePe, Paytm, or your bank.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Direct File Input */}
                        <input
                          ref={qrFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDirectQrUpload(file);
                          }}
                        />

                        <button
                          type="button"
                          id="admin-upload-qr-btn"
                          disabled={isQrUploading}
                          onClick={() => qrFileInputRef.current?.click()}
                          className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          {isQrUploading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading QR...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload New QR Image</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          id="admin-choose-qr-media-btn"
                          onClick={() => setIsQrFileManagerOpen(true)}
                          className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Media Library</span>
                        </button>

                        {editableSettings.payments?.qrImage && (
                          <button
                            type="button"
                            id="admin-remove-qr-btn"
                            onClick={() =>
                              setEditableSettings((prev) => ({
                                ...prev,
                                payments: {
                                  ...(prev.payments || {}),
                                  qrImage: '',
                                } as any,
                              }))
                            }
                            className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl transition flex items-center space-x-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Custom QR</span>
                          </button>
                        )}
                      </div>

                      {qrUploadError && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl mt-2">
                          {qrUploadError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live QR Code Preview Card */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      Live QR Code Preview (Customer View)
                    </span>

                    <div className="w-44 h-44 bg-white rounded-2xl p-2.5 border border-slate-700 shadow-lg flex items-center justify-center relative overflow-hidden">
                      {editableSettings.payments?.qrImage ? (
                        <img
                          src={editableSettings.payments.qrImage}
                          alt="Active QR Code"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-slate-900">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              `upi://pay?pa=${editableSettings.payments?.upiId || 'kitchencruze@upi'}&pn=${encodeURIComponent(
                                editableSettings.payments?.upiPayeeName || editableSettings.name || 'Kitchen Cruze'
                              )}&cu=INR`
                            )}`}
                            alt="Dynamic UPI QR"
                            className="w-36 h-36 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        editableSettings.payments?.qrImage
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{editableSettings.payments?.qrImage ? 'Custom Uploaded QR Active' : 'Auto-Generated UPI QR Active'}</span>
                      </span>
                      <p className="text-[11px] font-mono text-slate-400">
                        {editableSettings.payments?.upiId || 'kitchencruze@upi'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Bank Account Transfer Details */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <Building className="w-4 h-4 text-amber-400" />
                    <span>3. Bank Account Information (for Direct Bank Transfer)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    These details are provided to customers when they choose Bank Transfer (NEFT / IMPS / RTGS).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Bank Name</label>
                    <input
                      type="text"
                      id="admin-payment-bank-name"
                      placeholder="e.g. State Bank of India / HDFC Bank"
                      value={editableSettings.payments?.bankName || ''}
                      onChange={(e) =>
                        setEditableSettings((prev) => ({
                          ...prev,
                          payments: {
                            ...(prev.payments || {}),
                            bankName: e.target.value,
                          } as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      id="admin-payment-account-holder"
                      placeholder="e.g. Kitchen Cruze Foods LLP"
                      value={editableSettings.payments?.accountHolder || ''}
                      onChange={(e) =>
                        setEditableSettings((prev) => ({
                          ...prev,
                          payments: {
                            ...(prev.payments || {}),
                            accountHolder: e.target.value,
                          } as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      id="admin-payment-account-number"
                      placeholder="e.g. 50200012345678"
                      value={editableSettings.payments?.accountNumber || ''}
                      onChange={(e) =>
                        setEditableSettings((prev) => ({
                          ...prev,
                          payments: {
                            ...(prev.payments || {}),
                            accountNumber: e.target.value,
                          } as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">IFSC Code</label>
                    <input
                      type="text"
                      id="admin-payment-ifsc"
                      placeholder="e.g. HDFC0001234"
                      value={editableSettings.payments?.ifsc || ''}
                      onChange={(e) =>
                        setEditableSettings((prev) => ({
                          ...prev,
                          payments: {
                            ...(prev.payments || {}),
                            ifsc: e.target.value.toUpperCase(),
                          } as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Account Type</label>
                    <select
                      id="admin-payment-account-type"
                      value={editableSettings.payments?.accountType || 'Current Account'}
                      onChange={(e) =>
                        setEditableSettings((prev) => ({
                          ...prev,
                          payments: {
                            ...(prev.payments || {}),
                            accountType: e.target.value,
                          } as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="Current Account">Current Account</option>
                      <option value="Savings Account">Savings Account</option>
                      <option value="Business Account">Business Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Branch Name &amp; City</label>
                    <input
                      type="text"
                      id="admin-payment-branch"
                      placeholder="e.g. Connaught Place Branch, New Delhi"
                      value={editableSettings.payments?.branchName || ''}
                      onChange={(e) =>
                        setEditableSettings((prev) => ({
                          ...prev,
                          payments: {
                            ...(prev.payments || {}),
                            branchName: e.target.value,
                          } as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Customer Instructions & Verification Notes */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <span>4. Customer Payment Instructions</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    This note appears prominently on the customer checkout page and payment popups.
                  </p>
                </div>

                <textarea
                  rows={3}
                  id="admin-payment-instructions"
                  placeholder="e.g. Please take a screenshot of your payment confirmation for quick order verification upon handover or share on WhatsApp."
                  value={editableSettings.payments?.instructions || ''}
                  onChange={(e) =>
                    setEditableSettings((prev) => ({
                      ...prev,
                      payments: {
                        ...(prev.payments || {}),
                        instructions: e.target.value,
                      } as any,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              {/* Bottom Save Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {paymentSettingsSuccess ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment settings saved &amp; synced to Supabase PostgreSQL!</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    Changes take effect immediately on customer checkout without restarting.
                  </span>
                )}

                <button
                  type="submit"
                  id="admin-save-payments-btn-bottom"
                  disabled={isSavingPayments}
                  className="py-3 px-6 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer ml-auto"
                >
                  {isSavingPayments ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Payment Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 6. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-black text-white">Restaurant Profile &amp; Settings</h2>
                  <p className="text-xs text-slate-400">
                    Control restaurant details, WhatsApp number, opening hours, and delivery fees
                  </p>
                </div>
                {settingsSuccess && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved!</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Logo Setting & Preview */}
                <div className="sm:col-span-2 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800 flex items-center space-x-4">
                  <div className="shrink-0">
                    <img
                      src={editableSettings.logo || '/logo.png'}
                      alt="Logo preview"
                      className="w-14 h-14 rounded-full object-cover bg-white ring-2 ring-amber-500/40 shadow-sm"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-300 font-semibold mb-1">
                      Website Brand Logo (URL or Path)
                    </label>
                    <input
                      type="text"
                      placeholder="/logo.png"
                      value={editableSettings.logo || ''}
                      onChange={(e) =>
                        setEditableSettings({ ...editableSettings, logo: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Kitchen Cruze circular emblem badge logo is active at <span className="text-amber-400 font-mono">/logo.png</span>.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={editableSettings.name}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Dedicated Customer Support Setup for Admin */}
                <div className="sm:col-span-2 bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Customer Support &amp; Helpline Contact Details</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Support Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +91 98765 43210"
                        value={editableSettings.phone || ''}
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">For customer phone calls</span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Support WhatsApp Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 919876543210"
                        value={editableSettings.whatsappNumber || ''}
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, whatsappNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">For direct WhatsApp chat</span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Support Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. support@yourrestaurant.com"
                        value={editableSettings.email || ''}
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, email: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">For customer email inquiries</span>
                    </div>
                  </div>
                </div>

                {/* Dedicated Restaurant Physical Address & Store Location Section */}
                <div className="sm:col-span-2 bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white flex items-center space-x-2">
                          <span>Restaurant Physical Address &amp; Store Location</span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Changes update instantly across customer Header, Footer, Order Invoices, WhatsApp receipts &amp; delivery distance
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <button
                        type="button"
                        id="admin-settings-open-address-modal-btn"
                        onClick={handleOpenAddressModal}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                        title="Open Quick Address Editor Modal"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Quick Editor</span>
                      </button>
                      <button
                        type="button"
                        id="admin-settings-save-address-btn"
                        disabled={isSavingAddress}
                        onClick={(e) => handleSaveAddress(e, 'inline')}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        {isSavingAddress ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Address</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {addressSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{addressSuccessMsg}</span>
                    </div>
                  )}

                  {addressErrorMsg && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{addressErrorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Full Street Address / Shop &amp; Building Details *
                      </label>
                      <textarea
                        rows={2}
                        value={editableSettings.address}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditableSettings({
                            ...editableSettings,
                            address: val,
                            location: {
                              ...(editableSettings.location || {}),
                              address: val,
                            } as any,
                          });
                        }}
                        placeholder="e.g. Shop 14, Cruze Promenade, Near City Center, Mumbai, 400050"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs leading-relaxed"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Shown to customers in site navigation, invoice printouts, and footer details.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Landmark / Area
                        </label>
                        <input
                          type="text"
                          value={editableSettings.location?.landmark || ''}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              location: {
                                ...(editableSettings.location || {}),
                                address: editableSettings.address,
                                landmark: e.target.value,
                              } as any,
                            })
                          }
                          placeholder="e.g. Near City Center"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={editableSettings.location?.city || 'Mumbai'}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              location: {
                                ...(editableSettings.location || {}),
                                address: editableSettings.address,
                                city: e.target.value,
                              } as any,
                            })
                          }
                          placeholder="e.g. Mumbai"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Pincode / Postal Code
                        </label>
                        <input
                          type="text"
                          value={editableSettings.location?.pincode || '400050'}
                          onChange={(e) =>
                            setEditableSettings({
                              ...editableSettings,
                              location: {
                                ...(editableSettings.location || {}),
                                address: editableSettings.address,
                                pincode: e.target.value,
                              } as any,
                            })
                          }
                          placeholder="e.g. 400050"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                        />
                      </div>
                    </div>

                    {/* Geolocation Pin Coordinates */}
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                          <Compass className="w-3.5 h-3.5 text-amber-400" />
                          <span>Restaurant GPS Coordinates (Center for Delivery Calculations)</span>
                        </span>
                        <button
                          type="button"
                          disabled={detectingAddressGps}
                          onClick={() => handleDetectAddressGps('settings')}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition disabled:opacity-50 self-start sm:self-auto"
                        >
                          <Compass className={`w-3 h-3 ${detectingAddressGps ? 'animate-spin' : ''}`} />
                          <span>{detectingAddressGps ? 'Detecting GPS...' : 'Auto-Detect Current GPS'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={editableSettings.location?.latitude ?? 19.0760}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                location: {
                                  ...(editableSettings.location || {}),
                                  address: editableSettings.address,
                                  latitude: parseFloat(e.target.value) || 0,
                                } as any,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={editableSettings.location?.longitude ?? 72.8777}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                location: {
                                  ...(editableSettings.location || {}),
                                  address: editableSettings.address,
                                  longitude: parseFloat(e.target.value) || 0,
                                } as any,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-white text-xs"
                          />
                        </div>
                      </div>

                      {editableSettings.location?.latitude && editableSettings.location?.longitude && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Live coordinates active for customer distance calculation</span>
                          <a
                            href={`https://www.google.com/maps?q=${editableSettings.location.latitude},${editableSettings.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline flex items-center space-x-1"
                          >
                            <span>Open on Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Delivery Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={editableSettings.deliveryCharge}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        deliveryCharge: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    value={editableSettings.minimumOrder}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        minimumOrder: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Opening Time</label>
                  <input
                    type="text"
                    value={editableSettings.openingTime}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, openingTime: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Closing Time</label>
                  <input
                    type="text"
                    value={editableSettings.closingTime}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, closingTime: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Instagram URL</label>
                  <input
                    type="text"
                    value={editableSettings.instagramUrl}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, instagramUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Distance Slabs Management */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Bike className="w-4 h-4 text-amber-400" />
                      <span>Admin Distance-Based Delivery Charge Slabs</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure dynamic delivery charges based on customer kilometer distance. If not configured, delivery charge is ₹0.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="admin-add-distance-slab-btn"
                    onClick={handleAddDistanceSlab}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/30 transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Distance Slab</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(editableSettings.deliveryRules?.distanceSlabs || []).length === 0 ? (
                    <div className="text-xs text-slate-400 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <p className="font-semibold text-slate-300">No distance slabs configured.</p>
                      <p className="text-[11px] text-slate-500">
                        Orders will have ₹0 delivery charge unless you add kilometer slabs or a base rate below.
                      </p>
                    </div>
                  ) : (
                    (editableSettings.deliveryRules?.distanceSlabs || []).map((slab, idx) => (
                      <div
                        key={slab.id || idx}
                        id={`admin-slab-row-${idx}`}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-slate-400 font-bold shrink-0">
                            Slab #{idx + 1}:
                          </span>

                          <div className="flex items-center space-x-1.5">
                            <label className="text-[11px] text-slate-400">From</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={slab.minDistanceKm}
                              onChange={(e) =>
                                handleUpdateDistanceSlab(slab.id, 'minDistanceKm', Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <span className="text-slate-400 text-[11px]">KM</span>
                          </div>

                          <span className="text-slate-500">to</span>

                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={slab.maxDistanceKm}
                              onChange={(e) =>
                                handleUpdateDistanceSlab(slab.id, 'maxDistanceKm', Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <span className="text-slate-400 text-[11px]">KM</span>
                          </div>

                          <span className="text-amber-400 font-bold">➔</span>

                          <div className="flex items-center space-x-1.5">
                            <label className="text-[11px] text-amber-400 font-semibold">Delivery Fee: ₹</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={slab.charge}
                              onChange={(e) =>
                                handleUpdateDistanceSlab(slab.id, 'charge', Number(e.target.value))
                              }
                              className="w-20 px-2 py-1 bg-slate-900 border border-amber-500/40 rounded-lg text-amber-400 font-bold text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDistanceSlab(slab.id)}
                          className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800/40 hover:border-rose-600 transition cursor-pointer"
                          title="Delete distance slab"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Additional Delivery Charge Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Delivery Charge per KM (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={editableSettings.deliveryRules?.deliveryChargePerKm || ''}
                      onChange={(e) =>
                        setEditableSettings({
                          ...editableSettings,
                          deliveryRules: {
                            ...editableSettings.deliveryRules,
                            deliveryChargePerKm: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Applied per KM if no slabs defined</p>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Base Delivery Charge (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={editableSettings.deliveryRules?.baseDeliveryCharge ?? editableSettings.deliveryCharge ?? ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setEditableSettings({
                          ...editableSettings,
                          deliveryCharge: val,
                          deliveryRules: {
                            ...editableSettings.deliveryRules,
                            baseDeliveryCharge: val,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Fallback flat fee (0 = free delivery)</p>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Free Delivery Above (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="0"
                      value={editableSettings.deliveryRules?.freeDeliveryThreshold || ''}
                      onChange={(e) =>
                        setEditableSettings({
                          ...editableSettings,
                          deliveryRules: {
                            ...editableSettings.deliveryRules,
                            freeDeliveryThreshold: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">0 = disabled (no free delivery threshold)</p>
                  </div>
                </div>
              </div>

              {/* GST System Management */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Admin-Controlled GST System</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enable and configure tax percentage applied at customer checkout. If disabled or 0%, GST is ₹0.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        id="admin-gst-enabled-checkbox"
                        checked={editableSettings.gst?.enabled || false}
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            gst: {
                              ...(editableSettings.gst || { percentage: 0, gstNumber: '' }),
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-amber-500 rounded-md bg-slate-900 border-slate-700 focus:ring-amber-500 focus:ring-1"
                      />
                      <span className="text-xs font-bold text-white">
                        Enable GST Calculation on Customer Orders
                      </span>
                    </label>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        editableSettings.gst?.enabled
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {editableSettings.gst?.enabled ? 'GST Active' : 'GST Disabled (₹0)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        GST Percentage (%)
                      </label>
                      <input
                        type="number"
                        id="admin-gst-percentage-input"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="e.g. 5"
                        disabled={!editableSettings.gst?.enabled}
                        value={editableSettings.gst?.percentage ?? 0}
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            gst: {
                              ...(editableSettings.gst || { enabled: true, gstNumber: '' }),
                              percentage: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">e.g. 5 for 5% food tax</p>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        GST Number (Optional)
                      </label>
                      <input
                        type="text"
                        id="admin-gst-number-input"
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        disabled={!editableSettings.gst?.enabled}
                        value={editableSettings.gst?.gstNumber || ''}
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            gst: {
                              ...(editableSettings.gst || { enabled: true, percentage: 0 }),
                              gstNumber: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">Printed on invoices and receipts</p>
                    </div>
                  </div>

                  {/* Live Calculation Preview Note */}
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-bold text-amber-400 block">Calculation Preview:</span>
                    <p>
                      If a product is listed for <strong>₹138</strong>:
                    </p>
                    <p className="text-white font-mono">
                      Subtotal: ₹138 • Delivery: ₹0 • GST:{' '}
                      {editableSettings.gst?.enabled && (editableSettings.gst?.percentage || 0) > 0 ? (
                        <span className="text-amber-400">
                          {editableSettings.gst.percentage}% = ₹
                          {(((138) * (editableSettings.gst.percentage || 0)) / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-400">₹0</span>
                      )}{' '}
                      ➔ Grand Total: ₹
                      {editableSettings.gst?.enabled && (editableSettings.gst?.percentage || 0) > 0
                        ? (138 + ((138) * (editableSettings.gst.percentage || 0)) / 100).toFixed(2)
                        : '138'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weight Slabs Management */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>Weight-Based Extra Charge Slabs</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Charge extra for heavier orders (e.g. bulk party packaging)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddWeightSlab}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Weight Slab</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(editableSettings.deliveryRules?.weightSlabs || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                      No weight slabs configured. Standard delivery charge will apply.
                    </p>
                  ) : (
                    (editableSettings.deliveryRules?.weightSlabs || []).map((slab, idx) => (
                      <div
                        key={slab.id || idx}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400">Weight #{idx + 1}:</span>
                          <span className="font-bold text-white">
                            {slab.minWeightKg} kg – {slab.maxWeightKg} kg
                          </span>
                          <span className="text-slate-400">➔</span>
                          <span className="text-amber-400 font-bold">₹{slab.charge} fee</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWeightSlab(slab.id)}
                          className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800/40 hover:border-rose-600 transition cursor-pointer"
                          title="Delete weight slab"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Restaurant Configuration</span>
                </button>
              </div>

              {/* System Data Management & Purge Controls */}
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Admin Data Management &amp; Purge Controls</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clear activity logs, purge system notifications, or clean up order records.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">System Audit Logs</div>
                      <div className="text-[11px] text-slate-400">Clear historical user and admin audit entries</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAuditLogs}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl font-bold border border-rose-800/60 transition flex items-center space-x-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Logs</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">System Notifications</div>
                      <div className="text-[11px] text-slate-400">Clear all recorded notification messages</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearMessages}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl font-bold border border-rose-800/60 transition flex items-center space-x-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Messages</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">Purge Cancelled Orders</div>
                      <div className="text-[11px] text-slate-400">Remove all cancelled order records permanently</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBulkDeleteOrders('cancelled')}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl font-bold border border-rose-800/60 transition flex items-center space-x-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Purge Cancelled</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">Purge Delivered Orders</div>
                      <div className="text-[11px] text-slate-400">Remove all finished delivered orders</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBulkDeleteOrders('delivered')}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl font-bold border border-rose-800/60 transition flex items-center space-x-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Purge Delivered</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 my-auto shadow-2xl">
            <h3 className="font-extrabold text-base text-white">
              {editingProduct.id ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.originalPrice || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        originalPrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Category</label>
                {categories.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={editingProduct.category || categories[0]?.name || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Or enter a new custom category..."
                      value={editingProduct.category || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, category: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Starters, Main Course, Biryani, Shakes"
                      value={editingProduct.category || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-amber-400/80 mt-1">
                      No categories created yet. Enter a category name here or manage categories in the Categories tab.
                    </p>
                  </div>
                )}
              </div>

              {/* Product Image Selection & File Manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 text-xs font-bold">Product Image</label>
                  <button
                    type="button"
                    onClick={() => setIsFileManagerOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>File Manager &amp; Presets</span>
                  </button>
                </div>

                {/* Hidden input for direct device file picker */}
                <input
                  ref={directFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDirectImageUpload(e.target.files[0]);
                    }
                  }}
                />

                {/* Current Image Preview */}
                {editingProduct.image ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center space-x-3.5">
                    <div className="w-20 h-16 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                      <img
                        src={editingProduct.image}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{editingProduct.image}</p>
                      <p className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Image active</span>
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={() => directFileInputRef.current?.click()}
                          disabled={isDirectUploading}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition flex items-center space-x-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Change File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFileManagerOpen(true)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold rounded-lg border border-amber-500/20 transition flex items-center space-x-1"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>Browse Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                          className="px-2 py-1 text-rose-400 hover:text-rose-300 text-[11px] transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Dropzone / Upload Action Box */
                  <div
                    onClick={() => directFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleDirectImageUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                      {isDirectUploading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isDirectUploading
                          ? 'Uploading image to server...'
                          : 'Click to choose image via File Manager'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Drag &amp; drop food photos from device or browse files (PNG, JPG, WebP)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Browse File Manager</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFileManagerOpen(true);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Media Library</span>
                      </button>
                    </div>
                  </div>
                )}

                {uploadDirectError && (
                  <p className="text-xs text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{uploadDirectError}</span>
                  </p>
                )}

                <p className="text-[11px] text-slate-500 pt-1">
                  Upload required: Choose an image file from your device or select from the Media Library.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Food Dietary Classification: Veg or Non-Veg Option */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-bold">
                    Food Dietary Classification <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Choose Veg or Non-Veg</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Vegetarian Option Card */}
                  <button
                    type="button"
                    id="admin-food-type-veg"
                    onClick={() => setEditingProduct({ ...editingProduct, isVeg: true })}
                    className={`p-3 rounded-2xl border text-left transition flex items-start space-x-3 cursor-pointer ${
                      (editingProduct.isVeg ?? true)
                        ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 w-4.5 h-4.5 rounded-xs border-2 border-emerald-500 flex items-center justify-center bg-emerald-950/70">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-black text-xs ${
                          (editingProduct.isVeg ?? true) ? 'text-emerald-400' : 'text-slate-300'
                        }`}>
                          Vegetarian (Veg)
                        </span>
                        {(editingProduct.isVeg ?? true) && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">Active</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        100% Pure Veg food item (Plant &amp; dairy based)
                      </p>
                    </div>
                  </button>

                  {/* Non-Vegetarian Option Card */}
                  <button
                    type="button"
                    id="admin-food-type-nonveg"
                    onClick={() => setEditingProduct({ ...editingProduct, isVeg: false })}
                    className={`p-3 rounded-2xl border text-left transition flex items-start space-x-3 cursor-pointer ${
                      !(editingProduct.isVeg ?? true)
                        ? 'bg-rose-950/50 border-rose-500 text-white shadow-sm shadow-rose-500/10 ring-1 ring-rose-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 w-4.5 h-4.5 rounded-xs border-2 border-rose-500 flex items-center justify-center bg-rose-950/70">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-black text-xs ${
                          !(editingProduct.isVeg ?? true) ? 'text-rose-400' : 'text-slate-300'
                        }`}>
                          Non-Vegetarian (Non-Veg)
                        </span>
                        {!(editingProduct.isVeg ?? true) && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-bold">Active</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        Contains chicken, meat, fish, seafood or egg
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Chef Recommended & Stock Status Options */}
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isRecommended ?? false}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isRecommended: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Chef's Recommended</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isAvailable ?? true}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>In Stock / Available for Orders</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* File Manager Modal for Products */}
      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
        currentImageUrl={editingProduct?.image}
        onSelectImage={(url) => {
          if (editingProduct) {
            setEditingProduct((prev) => (prev ? { ...prev, image: url } : { image: url }));
          }
        }}
        title="Kitchen Cruze Media & File Manager"
      />

      {/* File Manager Modal for Payment QR Code */}
      <FileManagerModal
        isOpen={isQrFileManagerOpen}
        onClose={() => setIsQrFileManagerOpen(false)}
        currentImageUrl={editableSettings.payments?.qrImage}
        onSelectImage={(url) => {
          setEditableSettings((prev) => ({
            ...prev,
            payments: {
              ...(prev.payments || {}),
              qrImage: url,
            } as any,
          }));
          setIsQrFileManagerOpen(false);
        }}
        title="Select QR Code from Media Library"
      />

      {/* In-App Delete Confirmation Modal (Iframe-Safe) */}
      {deleteConfirm && (
        <div
          id="admin-delete-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            id="admin-delete-modal"
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">
                Delete {
                  deleteConfirm.type === 'product' ? 'Product' :
                  deleteConfirm.type === 'category' ? 'Category' :
                  deleteConfirm.type === 'order' ? 'Order' :
                  deleteConfirm.type === 'customer' ? 'Customer' :
                  deleteConfirm.type === 'offer' ? 'Promo Coupon' :
                  deleteConfirm.type === 'review' ? 'Customer Review' :
                  deleteConfirm.type === 'orders_bulk' ? 'Orders in Bulk' :
                  deleteConfirm.type === 'audit_logs' ? 'Audit Logs' :
                  deleteConfirm.type === 'messages' ? 'System Messages' : 'Item'
                }?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {deleteConfirm.description ? (
                  deleteConfirm.description
                ) : (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <span className="text-white font-bold">&ldquo;{deleteConfirm.name}&rdquo;</span>? This action cannot be undone.
                  </>
                )}
              </p>
            </div>

            {deleteItemError && (
              <div
                id="admin-delete-error-banner"
                className="p-3 bg-rose-950/80 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between gap-2.5 text-left animate-in fade-in"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">{deleteItemError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteItemError(null)}
                  className="px-2 py-0.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-bold shrink-0 transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                id="admin-delete-cancel-btn"
                disabled={isDeletingItem}
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteItemError(null);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700/90 active:scale-95 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700/80 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                id="admin-delete-confirm-btn"
                disabled={isDeletingItem}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 hover:shadow-rose-600/40 border border-rose-500/50 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeletingItem ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-white">Add New Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Delivery Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Flat/House No, Building, Street, Area"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {customerModalError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{customerModalError}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isSavingCustomer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Order Modal */}
      {isAddOrderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-white">Create New Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOrderOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Walk-in Customer"
                    value={manualOrderCustomerName}
                    onChange={(e) => setManualOrderCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={manualOrderCustomerPhone}
                    onChange={(e) => setManualOrderCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Delivery', 'Pickup'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setManualOrderType(type)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                        manualOrderType === type
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {type === 'Delivery' ? '🚚 Home Delivery' : '🛍️ Dine-in / Pickup'}
                    </button>
                  ))}
                </div>
              </div>

              {manualOrderType === 'Delivery' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Flat, building, street, area"
                    value={manualOrderAddress}
                    onChange={(e) => setManualOrderAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                <select
                  value={manualOrderPaymentMethod}
                  onChange={(e) => setManualOrderPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Cash on Delivery">Cash on Delivery / Cash Counter</option>
                  <option value="UPI">UPI / QR Payment</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Items Selection */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">Select Food Items *</label>
                  <select
                    onChange={(e) => {
                      const prodId = e.target.value;
                      if (!prodId) return;
                      const existing = manualOrderItems.find((it) => it.productId === prodId);
                      if (existing) {
                        setManualOrderItems((prev) =>
                          prev.map((it) => (it.productId === prodId ? { ...it, quantity: it.quantity + 1 } : it))
                        );
                      } else {
                        setManualOrderItems((prev) => [...prev, { productId: prodId, quantity: 1 }]);
                      }
                      e.target.value = '';
                    }}
                    className="px-2.5 py-1 bg-slate-800 text-amber-400 font-bold rounded-lg border border-slate-700 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="">+ Add Dish to Order</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₹{p.price}
                      </option>
                    ))}
                  </select>
                </div>

                {manualOrderItems.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    No items added. Pick items from dropdown above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {manualOrderItems.map((sel) => {
                      const dish = products.find((p) => p.id === sel.productId);
                      return (
                        <div
                          key={sel.productId}
                          className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl"
                        >
                          <div>
                            <span className="font-bold text-white">{dish?.name || 'Item'}</span>
                            <span className="text-slate-400 text-[11px] ml-2">₹{dish?.price || 0} each</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (sel.quantity > 1) {
                                  setManualOrderItems((prev) =>
                                    prev.map((it) =>
                                      it.productId === sel.productId ? { ...it, quantity: it.quantity - 1 } : it
                                    )
                                  );
                                } else {
                                  setManualOrderItems((prev) =>
                                    prev.filter((it) => it.productId !== sel.productId)
                                  );
                                }
                              }}
                              className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center hover:bg-slate-700"
                            >
                              -
                            </button>
                            <span className="font-bold text-white px-1.5">{sel.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setManualOrderItems((prev) =>
                                  prev.map((it) =>
                                    it.productId === sel.productId ? { ...it, quantity: it.quantity + 1 } : it
                                  )
                                );
                              }}
                              className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center hover:bg-slate-700"
                            >
                              +
                            </button>
                            <span className="font-bold text-amber-400 min-w-14 text-right">
                              ₹{(dish?.price || 0) * sel.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setManualOrderItems((prev) => prev.filter((it) => it.productId !== sel.productId))
                              }
                              className="p-1 text-rose-400 hover:text-rose-200"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, extra sauce"
                  value={manualOrderNotes}
                  onChange={(e) => setManualOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {manualOrderError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualOrderError}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualOrder || manualOrderItems.length === 0}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isSavingManualOrder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Order...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Place Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Offer Modal */}
      {isAddOfferOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-white">Create Promo Coupon</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOfferOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CRUZE50"
                    value={offerCode}
                    onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Discount Type</label>
                  <select
                    value={offerDiscountType}
                    onChange={(e) => setOfferDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50% Off on Weekend Feast"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Value ({offerDiscountType === 'percentage' ? '%' : '₹'})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={offerDiscountValue}
                    onChange={(e) => setOfferDiscountValue(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={offerMinOrder}
                    onChange={(e) => setOfferMinOrder(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={offerMaxDiscount}
                    onChange={(e) => setOfferMaxDiscount(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Valid on all orders above ₹200. Cannot be combined with other offers."
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {offerError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{offerError}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOfferOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOffer}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isSavingOffer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Launch Coupon</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Restaurant Address Modal */}
      {isAddressModalOpen && (
        <div
          id="admin-change-address-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="admin-change-address-modal"
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 my-auto shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Change Restaurant Address</h3>
                  <p className="text-[11px] text-slate-400">
                    Live updates across Storefront Header, Footer, Order Invoices &amp; Delivery Calculations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addressSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{addressSuccessMsg}</span>
              </div>
            )}

            {addressErrorMsg && (
              <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{addressErrorMsg}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSaveAddress(e, 'modal')} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Full Street Address / Shop &amp; Building *
                </label>
                <textarea
                  required
                  rows={3}
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="e.g. Shop 14, Cruze Promenade, Near City Center, Mumbai, 400050"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs leading-relaxed"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Appears on customer order receipts, storefront header and footer.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Landmark / Area
                  </label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    placeholder="e.g. Near City Center"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-slate-300 font-semibold mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pincode / ZIP *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="e.g. 400050"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* Coordinates Section with GPS Auto-detection */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Restaurant GPS Pin (For Delivery Distance Calculations)</span>
                  </span>
                  <button
                    type="button"
                    disabled={detectingAddressGps}
                    onClick={() => handleDetectAddressGps('modal')}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition disabled:opacity-50 self-start sm:self-auto"
                  >
                    <Compass className={`w-3 h-3 ${detectingAddressGps ? 'animate-spin' : ''}`} />
                    <span>{detectingAddressGps ? 'Detecting GPS...' : 'Auto-Detect Current GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={addressForm.latitude}
                      onChange={(e) => setAddressForm({ ...addressForm, latitude: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 19.0760"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={addressForm.longitude}
                      onChange={(e) => setAddressForm({ ...addressForm, longitude: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 72.8777"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-white text-xs"
                    />
                  </div>
                </div>

                {addressForm.latitude && addressForm.longitude && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Center point for customer radius checks</span>
                    <a
                      href={`https://www.google.com/maps?q=${addressForm.latitude},${addressForm.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Check on Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isSavingAddress ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Address...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Restaurant Address</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
