
"use client";

import React from 'react';
import type { Customer } from '@/types';

interface PrintableCustomerListProps {
  customers: Customer[];
}

export const PrintableCustomerList = React.forwardRef<HTMLDivElement, PrintableCustomerListProps>(
  ({ customers }, ref) => {
    
    const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleDateString();
      } catch (e) {
        return 'Invalid Date';
      }
    };

    return (
      <div ref={ref}>
        <h1>Customer List</h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Date Added</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.firstName} {customer.lastName}</td>
                <td>{customer.companyName || 'N/A'}</td>
                <td>{formatDate(customer.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

PrintableCustomerList.displayName = "PrintableCustomerList";
