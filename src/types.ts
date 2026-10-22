// Role-Based Types
export type UserRole = 'admin' | 'chef' | 'delivery' | 'customer';

// Order Status Types
export type OrderStatus =
  | 'Placed'
  | 'Order Received'
  | 'Confirmed'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Ready for Pickup'
  | 'Picked Up'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type ChefStatus = 'Pending' | 'Accepted' | 'Preparing' | 'Ready';
export type DeliveryStatus = 'Unassigned' | 'Assigned' | 'Picked Up' | 'Out for Delivery' | 'Delivered';
export type CodStatus =
  | 'None'
  | 'Pending Collection'
  | 'Cash Received'
  | 'Cash Pending Handover'
  | 'Cash Handed Over'
  | 'Cash Settled'
  | 'Handed Over';
export type PaymentStatus = 'Pending' | 'Verified' | 'Paid' | 'Failed';

export type OrderType = 'Delivery' | 'Pickup';
export type PaymentMethod =
  | 'Cash on Delivery'
  | 'Pay on Counter'
  | 'UPI'
  | 'Online UPI'
  | 'QR Payment'
  | 'Bank Transfer'
  | 'Razorpay'
  | 'Online Payment';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentMethod: string;
  amount: number; // in rupees
  amountPaise: number; // in paise
  currency: string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  transactionType?: 'ORDER' | 'WALLET_TOPUP';
  errorMessage?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  options: CustomizationOption[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  image: string;
  images?: string[];
  additionalImages?: string[];
  description: string;
  price: number;
  originalPrice?: number;
  discountPrice?: number;
  weight?: number; // in grams
  preparationTime?: number; // in minutes
  preparationTimeMinutes?: number;
  isVeg: boolean;
  isAvailable: boolean;
  isRecommended?: boolean;
  stockStatus?: 'In Stock' | 'Out of Stock' | 'Low Stock';
  tags?: string[];
  ingredients?: string[] | string;
  allergens?: string[] | string;
  customizations?: CustomizationGroup[];
  customizationOptions?: any[];
  customizationGroups?: CustomizationGroup[];
  addons?: CustomizationOption[];
  specialInstructionsAllowed?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  active?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  order?: number;
  active?: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  couponCode: string;
  code?: string;
  minimumOrder: number;
  maximumDiscount?: number;
  startDate?: string;
  endDate?: string;
  validTill?: string;
  bannerImage?: string;
  active: boolean;
}

export interface DistanceSlab {
  id: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  charge: number;
}

export interface WeightSlab {
  id: string;
  minWeightKg: number;
  maxWeightKg: number;
  charge: number;
}

export interface DeliveryRules {
  freeDeliveryThreshold?: number; // e.g. 500
  packagingCharge?: number;
  baseDeliveryCharge?: number;
  deliveryChargePerKm?: number;
  distanceSlabs: DistanceSlab[];
  weightSlabs?: WeightSlab[];
}

export interface GstSettings {
  enabled: boolean;
  percentage: number;
  gstNumber: string;
}

export interface PaymentSettings {
  upiId: string;
  upiPayeeName?: string;
  qrImage: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  accountType?: string;
  branchName?: string;
  instructions: string;
  activeMethods: {
    upi: boolean;
    qr: boolean;
    bankTransfer: boolean;
    cod: boolean;
    razorpay?: boolean;
  };
}

export interface RestaurantLocation {
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  city?: string;
  pincode?: string;
}

export interface RestaurantSettings {
  name: string;
  tagline: string;
  logo: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  location: RestaurantLocation;
  deliveryRadiusKm: number;
  instagramUrl: string;
  openingTime: string;
  closingTime: string;
  aboutUs: string;
  currency: string;
  isOpen: boolean;
  deliveryRules: DeliveryRules;
  gst: GstSettings;
  payments: PaymentSettings;
  deliveryCharge?: number;
  minimumOrder?: number;
  loyalty?: LoyaltySettings;
}

export interface Address {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  house: string;
  street: string;
  streetAddress?: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
  deliveryInstructions?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  profilePic?: string;
  deliveryAddress?: string;
  landmark?: string;
  pincode?: string;
  preferredLanguage: 'en' | 'hi' | 'pa' | 'ur' | 'bn' | 'mr';
  savedAddresses: Address[];
  status: 'active' | 'deactivated';
  createdAt: string;
}

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  isVeg: boolean;
  product: Product;
  quantity: number;
  selectedAddons?: CustomizationOption[];
  specialInstructions?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
  selectedAddons?: CustomizationOption[];
  specialInstructions?: string;
  weight?: number;
  itemTotal: number;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  updatedBy: string;
  note?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    deliveryAddress?: string;
    landmark?: string;
    pincode?: string;
  };
  deliveryAddress?: Address;
  orderType: OrderType;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  gstRate: number;
  gstAmount: number;
  packagingCharge: number;
  deliveryCharge: number;
  weightCharge: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentScreenshot?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: string;
  status: OrderStatus;
  chefStatus: ChefStatus;
  deliveryStatus: DeliveryStatus;
  // Historical Delivery & Coordinates Data
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  restaurantAddress?: string;
  customerLatitude?: number;
  customerLongitude?: number;
  customerDeliveryAddress?: string;
  deliveryDistanceMeters?: number;
  deliveryDistanceKm?: number;
  deliveryDistanceDisplay?: string; // e.g. "2.4 KM", "650 m"
  deliveryRadiusAtOrder?: number; // e.g. 5
  assignedDeliveryBoyId?: string;
  assignedDeliveryBoyNumber?: number; // e.g. 1, 2, 3
  assignedDeliveryBoyName?: string;
  deliveryAssignedAt?: string;
  deliveredAt?: string;
  codStatus: CodStatus;
  codAmount?: number;
  // Customer Wallet, Reward Coins & Cashback Tracking
  walletAmountUsed?: number;
  remainingPayable?: number;
  eligibleRewardSubtotal?: number;
  loyaltyPointsUsed?: number;
  loyaltyDiscount?: number;
  loyaltyPointsRefunded?: boolean;
  rewardCoinsEarned?: number;
  rewardCoinsAwarded?: boolean;
  rewardCoinsReversed?: boolean;
  cashbackEarned?: number;
  cashbackAwarded?: boolean;
  cashbackReversed?: boolean;
  cashbackCampaignId?: string;
  specialInstructions?: string;
  tipAmount?: number;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryBoy {
  id: string;
  deliveryBoyNumber: number; // #1, #2, #3, etc.
  name: string;
  phone: string;
  username: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
  totalDeliveredOrders?: number;
  totalDeliveryDistanceKm?: number;
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  orderId: string;
  rating: number; // 1 to 5
  comment: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export interface AdminMessage {
  id: string;
  type: 'New Order' | 'Payment Update' | 'COD Update' | 'Delivery Update' | 'Customer Issue' | 'System Notification';
  title: string;
  content: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'chef' | 'delivery';
  name: string;
  phone?: string;
  status: 'active' | 'deactivated';
}

// --------------------------------------------------------------------------
// CUSTOMER WALLET, REWARD COINS, CASHBACK & AUDIT LEDGER
// --------------------------------------------------------------------------
export interface CustomerWallet {
  customerId: string;
  balance: number; // Total available wallet balance in ₹ (purchased + converted + cashback - spent)
  purchasedBalance: number; // Top-up funds added through real payment
  convertedBalance: number; // Money converted from reward coins
  cashbackBalance: number; // Promotional cashback
  coins: number; // Available reward coins/points
  points?: number; // Alias for coins (1 point = ₹1 discount value)
  totalCoinsEarned: number;
  totalCoinsRedeemed: number;
  totalCashbackEarned: number;
  totalMoneyAdded: number; // Total top-ups credited
  totalMoneySpent: number; // Total wallet money spent on orders
  pendingTransactions: number;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType =
  | 'TOPUP'
  | 'PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'REFUND'
  | 'COIN_EARN'
  | 'COIN_REDEEM'
  | 'POINTS_EARN'
  | 'POINTS_REDEEM'
  | 'COIN_CONVERT'
  | 'COIN_REVERSAL'
  | 'CASHBACK_CREDIT'
  | 'CASHBACK_REVERSAL'
  | 'ADMIN_ADJUSTMENT';

export type WalletTransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REVERSED';

export interface WalletTransaction {
  id: string;
  customerId: string;
  type: WalletTransactionType;
  amount: number; // In ₹ (0 for coin-only earn)
  coins?: number; // In coins (e.g. 50, 75.5)
  balanceAfter: number;
  coinsAfter: number;
  status: WalletTransactionStatus;
  timestamp: string;
  orderId?: string;
  paymentReference?: string;
  paymentMethod?: string;
  description: string;
  reversalReference?: string;
  adminUsername?: string;
  idempotencyKey?: string;
}

export interface CashbackCampaign {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (e.g. 10%) or fixed ₹ (e.g. 50)
  minOrderAmount: number; // Eligible merchandise subtotal threshold
  maxCashback?: number; // Maximum cashback cap
  startDate?: string;
  endDate?: string;
  firstOrderOnly?: boolean;
  active: boolean;
  usageCount?: number;
  createdAt: string;
}

export interface LoyaltySettings {
  minEligibleOrderAmount: number; // Default 100
  earningRate: number; // Default 0.5 coin per ₹1 eligible
  conversionRate: number; // Default 10 coins = ₹1
  minCoinRedemption: number; // Default 10 coins
  maxCoinRedemptionPerOrder?: number;
  minTopupAmount: number; // Default 10
  maxTopupAmount: number; // Default 10000
  excludeDelivery: boolean; // Default true
  excludePackaging: boolean; // Default true
  excludeTaxes: boolean; // Default true
  cashbackEnabled: boolean; // Default true
}

