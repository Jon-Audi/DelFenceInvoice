
"use client";

import React from 'react';
import type { Product } from '@/types';

interface PrintableInventorySheetProps {
  products: Product[];
}

export const PrintableInventorySheet = React.forwardRef<HTMLDivElement, PrintableInventorySheetProps>(
  ({ products }, ref) => {
    return (
      <div ref={ref}>
        <h1>Inventory Count Sheet</h1>
        <p>Date: {new Date().toLocaleDateString()}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Product Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', width: '150px' }}>Manual Count</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.category}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', height: '30px' }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

PrintableInventorySheet.displayName = "PrintableInventorySheet";
