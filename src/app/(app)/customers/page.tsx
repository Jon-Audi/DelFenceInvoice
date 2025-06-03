import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer } from '@/types';

// Mock data for customers
const mockCustomers: Customer[] = [
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

export default function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" description="Manage your customer database.">
         <CustomerDialog triggerButton={
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          } />
      </PageHeader>
      <CustomerTable customers={mockCustomers} />
    </>
  );
}
