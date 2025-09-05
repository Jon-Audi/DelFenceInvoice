

export type ProductCategory = string;
export type CustomerType = 'Fence Contractor' | 'Landscaper' | 'Home Owner' | 'Government' | 'Commercial' | 'Other';
export type EmailContactType = 'Main Contact' | 'Accounts Payable' | 'Owner' | 'Billing' | 'Shipping' | 'Other';
export type UserRole = 'Admin' | 'User';

export type PermissionKey =
  | 'manage_users'
  | 'view_users'
  | 'edit_products'
  | 'view_products'
  | 'manage_orders'
  | 'view_orders'
  | 'manage_customers'
  | 'view_customers'
  | 'manage_estimates'
  | 'view_estimates'
  | 'manage_invoices'
  | 'view_invoices'
  | 'access_settings'
  | 'manage_company_settings';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string;
  price: number;
  cost: number;
  markupPercentage: number;
  description?: string;
  quantityInStock?: number; // Added for inventory tracking
}

export interface EmailContact {
  id: string;
  type: EmailContactType;
  email: string;
  name?: string;
}

export interface CustomerSpecificMarkup {
  id: string; // For React key and potentially Firestore ID if stored as subcollection
  categoryName: string;
  markupPercentage: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  emailContacts: EmailContact[];
  customerType: CustomerType;
  createdAt?: string; // ISO Date String
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes?: string;
  specificMarkups?: CustomerSpecificMarkup[];
}

export interface LineItem {
  id: string;
  productId?: string; // Optional for non-stock items
  productName: string; // Manually entered for non-stock, or from product
  quantity: number;
  unitPrice: number; // Manually entered for non-stock, or from product/override for stock
  total: number;
  isReturn?: boolean;
  isNonStock?: boolean; // Flag to indicate if it's a non-stock item
  cost?: number; // Optional: for non-stock items to track profitability
  markupPercentage?: number; // Optional: for non-stock items
  unit?: string; // For creating new products from non-stock items
  addToProductList?: boolean; // UI flag for form
  newProductCategory?: string; // UI field for form
}


export type PaymentMethod = 'Cash' | 'Check' | 'Credit Card' | 'Bank Transfer' | 'Other';

export interface Payment {
  id: string;
  date: string; // ISO date string
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export type DocumentStatus =
  | 'Draft'
  | 'Sent'
  | 'Accepted'
  | 'Rejected'
  | 'Ordered'
  | 'Ready for pick up'
  | 'Picked up'
  | 'Invoiced'
  | 'Partially Paid'
  | 'Paid'
  | 'Voided';

interface BaseDocument {
  id: string;
  customerId: string;
  customerName?: string;
  date: string; // ISO date string
  poNumber?: string;
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
  estimateId?: string;
  status: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided'>;
  expectedDeliveryDate?: string;
  readyForPickUpDate?: string;
  pickedUpDate?: string;
  orderState: 'Open' | 'Closed';
  payments: Payment[];
  amountPaid: number;
  balanceDue: number;
}

export interface Invoice extends BaseDocument {
  invoiceNumber: string;
  orderId?: string;
  status: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Partially Paid' | 'Paid' | 'Voided'>;
  dueDate?: string;
  paymentTerms?: string;
  payments: Payment[]; // Ensure payments is always an array, even if empty
  amountPaid: number;   // Ensure amountPaid is always present
  balanceDue: number;   // Ensure balanceDue is always present
  readyForPickUpDate?: string;
  pickedUpDate?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  permissions: PermissionKey[];
}

export interface CompanySettings {
  id?: string;
  companyName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  taxId?: string;
}

// New type for the detailed customer balance/outstanding invoices report
export interface CustomerInvoiceDetail {
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  poNumber?: string;
  invoiceDate: string; // ISO string
  dueDate?: string;   // ISO string
  balanceDue: number;
  invoiceTotal: number; // Added for clarity in reports
  amountPaid: number;   // Added for clarity in reports
}

// New type for the Payments Report
export interface PaymentReportItem {
  documentId: string;
  documentNumber: string;
  documentType: 'Invoice' | 'Order';
  customerName: string;
  documentDate: string; // ISO string
  documentTotal: number;
  payments: Payment[]; // Array of payments made for this document
  totalPaidForDocument: number;
}

export interface WeeklySummaryReportItem {
  weekIdentifier: string; // e.g., "2024-W25"
  weekStartDate: string; // ISO string
  weekEndDate: string; // ISO string
  totalPayments: number;
  totalOrders: number;
  totalInvoices: number;
}

export interface PaymentByTypeReportItem {
  method: PaymentMethod;
  totalAmount: number;
  transactionCount: number;
}

export interface BulkPaymentReceiptData {
  paymentDetails: Payment;
  customerName: string;
  affectedInvoices: {
    invoiceNumber: string;
    amountApplied: number;
  }[];
  companySettings: CompanySettings;
  logoUrl?: string;
}

// New type for the Profitability Report
export interface ProfitReportItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO string
  customerName: string;
  invoiceTotal: number;
  totalCostOfGoods: number;
  profit: number;
}

// Ensure Invoice type in initialData for InvoiceForm expects Payment[] with string dates
export type InvoiceForFormInitialData = Omit<Invoice, 'payments'> & {
  payments?: (Omit<Payment, 'date'> & { date: string | Date })[];
};

// New types for Customer Statement report
export type CustomerStatementItem = {
  date: string; // ISO string
  transactionType: 'Invoice' | 'Payment';
  documentNumber: string;
  debit: number;
  credit: number;
  balance: number;
};

export interface CustomerStatementReportData {
  customer: Customer;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  transactions: CustomerStatementItem[];
  closingBalance: number;
}
