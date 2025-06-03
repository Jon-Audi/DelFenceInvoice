
import type { ProductCategory, CustomerType, EmailContactType, UserRole } from '@/types';

export const PRODUCT_CATEGORIES: ProductCategory[] = ['Fencing', 'Posts', 'Gates', 'Hardware', 'Accessories', 'Other'];
export const CUSTOMER_TYPES: CustomerType[] = ['Fence Contractor', 'Landscaper', 'Home Owner', 'Government', 'Commercial', 'Other'];
export const EMAIL_CONTACT_TYPES: EmailContactType[] = ['Main Contact', 'Accounts Payable', 'Owner', 'Billing', 'Shipping', 'Other'];
export const USER_ROLES: UserRole[] = ['Admin', 'User'];

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/products', label: 'Products', icon: 'Package' },
  { href: '/customers', label: 'Customers', icon: 'Users' },
  { href: '/estimates', label: 'Estimates', icon: 'FileText' },
  { href: '/orders', label: 'Orders', icon: 'ShoppingCart' },
  { href: '/invoices', label: 'Invoices', icon: 'FileDigit' },
  { href: '/users', label: 'Users', icon: 'UsersRound' },
];

export const MATERIAL_CALCULATOR_LINK = {
  href: 'https://jonaudi.com',
  label: 'Material Calculator',
  icon: 'Calculator',
  external: true,
};
