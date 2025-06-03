

export type ProductCategory = 'Fencing' | 'Posts' | 'Gates' | 'Hardware' | 'Accessories' | 'Other';
export type CustomerType = 'Fence Contractor' | 'Landscaper' | 'Home Owner' | 'Government' | 'Commercial' | 'Other';
export type EmailContactType = 'Main Contact' | 'Accounts Payable' | 'Owner' | 'Billing' | 'Shipping' | 'Other';
export type UserRole = 'Admin' | 'User';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string; // e.g., 'piece', 'foot', 'linear ft', 'sq ft'
  price: number; // selling price
  cost: number;
  markupPercentage: number; 
  description?: string;
}

export interface EmailContact {
  id: string;
  type: EmailContactType;
  email: string;
  name?: string; 
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  emailContacts: EmailContact[];
  customerType: CustomerType;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes?: string;
}

export interface LineItem {
  id: string;
  productId: string;
  productName: string; 
  quantity: number;
  unitPrice: number; 
  total: number; 
}

export type DocumentStatus = 
  'Draft' | 
  'Sent' | 
  'Accepted' | 
  'Rejected' | 
  'Ordered' | 
  'Ready for pick up' | 
  'Picked up' | 
  'Invoiced' | 
  'Paid' | 
  'Voided';

interface BaseDocument {
  id: string;
  customerId: string;
  customerName?: string; // denormalized
  date: string; // ISO date string
  lineItems: LineItem[];
  subtotal: number;
  taxRate?: number; // percentage e.g. 0.05 for 5%
  taxAmount?: number;
  total: number;
  notes?: string;
  internalNotes?: string;
}

export interface Estimate extends BaseDocument {
  estimateNumber: string;
  status: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Voided'>;
  validUntil?: string; // ISO date string
}

export interface Order extends BaseDocument {
  orderNumber: string;
  estimateId?: string; // Optional link to an estimate
  status: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided'>;
  expectedDeliveryDate?: string; // ISO date string
  readyForPickUpDate?: string; // ISO date string, set when status becomes 'Ready for pick up'
  pickedUpDate?: string; // ISO date string, set when status becomes 'Picked up'
  orderState: 'Open' | 'Closed'; // 'Open' if customer might add more, 'Closed' if finalized
}

export interface Invoice extends BaseDocument {
  invoiceNumber: string;
  orderId?: string; // Optional link to an order
  status: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Paid' | 'Voided'>;
  dueDate?: string; // ISO date string
  paymentTerms?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string; // ISO date string
}
