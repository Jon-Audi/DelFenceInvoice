
import type { CustomerType, EmailContactType, UserRole, PermissionKey, PaymentMethod } from '@/types';

export const INITIAL_PRODUCT_CATEGORIES: string[] = ['Fencing', 'Posts', 'Gates', 'Hardware', 'Accessories'];

export const CUSTOMER_TYPES: CustomerType[] = ['Fence Contractor', 'Landscaper', 'Home Owner', 'Government', 'Commercial', 'Other'];
export const EMAIL_CONTACT_TYPES: EmailContactType[] = ['Main Contact', 'Accounts Payable', 'Owner', 'Billing', 'Shipping', 'Other'];
export const USER_ROLES: UserRole[] = ['Admin', 'User'];

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Other'];

export const ALL_CATEGORIES_MARKUP_KEY = "__ALL_CATEGORIES__";

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/products', label: 'Products', icon: 'Package' },
  { href: '/customers', label: 'Customers', icon: 'Users' },
  { href: '/estimates', label: 'Estimates', icon: 'FileText' },
  { href: '/orders', label: 'Orders', icon: 'ShoppingCart' },
  { href: '/invoices', label: 'Invoices', icon: 'FileDigit' },
  { href: '/reports', label: 'Reports', icon: 'TrendingUp' },
];

export const MATERIAL_CALCULATOR_LINK = {
  href: 'https://jonaudi.com',
  label: 'Material Calculator',
  icon: 'Calculator',
  external: true,
};

export const AVAILABLE_PERMISSIONS: PermissionKey[] = [
  'manage_users',
  'view_users',
  'edit_products',
  'view_products',
  'manage_orders',
  'view_orders',
  'manage_customers',
  'view_customers',
  'manage_estimates',
  'view_estimates',
  'manage_invoices',
  'view_invoices',
  'access_settings',
  'manage_company_settings',
];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  Admin: [...AVAILABLE_PERMISSIONS],
  User: [
    'view_products',
    'view_orders',
    'view_customers',
    'view_estimates',
    'view_invoices',
  ],
};

