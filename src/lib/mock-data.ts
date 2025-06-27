
import type { Customer, Product, Estimate, Order, Invoice } from '@/types';

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Doe Fencing Co.',
    phone: '555-1234',
    emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }],
    customerType: 'Fence Contractor',
    address: { street: '123 Main St', city: 'Anytown', state: 'DE', zip: '19901' }
  },
  {
    id: 'cust_2',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '555-5678',
    emailContacts: [
      { id: 'ec_2', type: 'Main Contact', email: 'jane.smith@example.com' },
      { id: 'ec_3', type: 'Billing', email: 'billing@jsmithscapes.com' }
    ],
    customerType: 'Landscaper',
    companyName: 'J. Smith Landscaping',
    address: { street: '456 Oak Ave', city: 'Anycity', state: 'DE', zip: '19902' }
  },
  {
    id: 'cust_3',
    firstName: 'Robert',
    lastName: 'Johnson',
    phone: '555-9101',
    emailContacts: [{ id: 'ec_4', type: 'Main Contact', email: 'robert.johnson@email.com' }],
    customerType: 'Home Owner',
  },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod_1', name: '6ft Cedar Picket', category: 'Fencing', unit: 'piece', price: 3.50, cost: 2.00, markupPercentage: 75, description: 'Standard cedar fence picket' },
  { id: 'prod_2', name: '4x4x8 Pressure Treated Post', category: 'Posts', unit: 'piece', price: 12.00, cost: 8.00, markupPercentage: 50, description: 'Ground contact rated post' },
  { id: 'prod_3', name: 'Vinyl Gate Kit', category: 'Gates', unit: 'kit', price: 150.00, cost: 100.00, markupPercentage: 50, description: 'Complete vinyl gate kit' },
  { id: 'prod_4', name: 'Stainless Steel Hinges', category: 'Hardware', unit: 'pair', price: 25.00, cost: 15.00, markupPercentage: 66.67, description: 'Heavy duty gate hinges' },
  { id: 'prod_5', name: 'Post Caps', category: 'Accessories', unit: 'piece', price: 2.50, cost: 1.00, markupPercentage: 150, description: 'Decorative post cap' },
];

export const MOCK_ESTIMATES: Estimate[] = [
  {
    id: 'est_1',
    estimateNumber: 'EST-2024-001',
    customerId: 'cust_1',
    customerName: 'Doe Fencing Co.', // Denormalized for display
    date: '2024-07-15',
    total: 295.00,
    status: 'Sent',
    lineItems: [
      { id: 'li_est_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 50, unitPrice: 3.50, total: 175.00 },
      { id: 'li_est_2', productId: 'prod_2', productName: '4x4x8 Pressure Treated Post', quantity: 10, unitPrice: 12.00, total: 120.00 },
    ],
    subtotal: 295.00,
    taxAmount: 0.00,
  },
  {
    id: 'est_2',
    estimateNumber: 'EST-2024-002',
    customerId: 'cust_2',
    customerName: 'J. Smith Landscaping', // Denormalized for display
    date: '2024-07-18',
    total: 125.00,
    status: 'Draft',
    lineItems: [
      { id: 'li_est_3', productId: 'prod_4', productName: 'Stainless Steel Hinges', quantity: 4, unitPrice: 25.00, total: 100.00 },
      { id: 'li_est_4', productId: 'prod_5', productName: 'Post Caps', quantity: 10, unitPrice: 2.50, total: 25.00 },
    ],
    subtotal: 125.00,
    taxAmount: 0.00,
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_1',
    orderNumber: 'ORD-2024-001',
    customerId: 'cust_1',
    customerName: 'Doe Fencing Co.',
    date: '2024-07-20T10:00:00.000Z',
    total: 350.00,
    status: 'Ordered',
    lineItems: [{id: 'li_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 100, unitPrice: 3.50, total: 350}],
    subtotal: 350.00,
    orderState: 'Open',
    readyForPickUpDate: undefined,
    pickedUpDate: undefined,
  },
  {
    id: 'ord_2',
    orderNumber: 'ORD-2024-002',
    customerId: 'cust_2',
    customerName: 'J. Smith Landscaping',
    date: '2024-07-22T14:30:00.000Z',
    total: 150.00,
    status: 'Ready for pick up',
    lineItems: [{id: 'li_3', productId: 'prod_3', productName: 'Vinyl Gate Kit', quantity:1, unitPrice: 150.00, total: 150.00}],
    subtotal: 150.00,
    orderState: 'Closed',
    readyForPickUpDate: '2024-07-28T09:00:00.000Z',
    pickedUpDate: undefined,
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_1',
    invoiceNumber: 'INV-2024-001',
    customerId: 'cust_1',
    customerName: 'Doe Fencing Co.',
    date: '2024-07-25',
    total: 590.00,
    status: 'Sent',
    dueDate: '2024-08-24',
    lineItems: [
      { id: 'li_inv_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 100, unitPrice: 3.50, total: 350.00 },
      { id: 'li_inv_2', productId: 'prod_2', productName: '4x4x8 Pressure Treated Post', quantity: 20, unitPrice: 12.00, total: 240.00 },
    ],
    subtotal: 590.00,
    taxAmount: 0.00,
    payments: [],
    amountPaid: 0.00,
    balanceDue: 590.00,
  },
  {
    id: 'inv_2',
    invoiceNumber: 'INV-2024-002',
    customerId: 'cust_2',
    customerName: 'J. Smith Landscaping',
    date: '2024-07-28',
    total: 150.00,
    status: 'Paid',
    dueDate: '2024-08-27',
    lineItems: [
       { id: 'li_inv_3', productId: 'prod_3', productName: 'Vinyl Gate Kit', quantity:1, unitPrice: 150.00, total: 150.00 }
    ],
    subtotal: 150.00,
    taxAmount: 0.00,
    payments: [],
    amountPaid: 150.00,
    balanceDue: 0.00,
  },
];
