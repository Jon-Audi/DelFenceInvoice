
"use client";

import React from 'react';
import type { Product } from '@/types';

interface PrintableInventorySheetProps {
  products: Product[];
}

export const PrintableInventorySheet = React.forwardRef<HTMLDivElement, PrintableInventorySheetProps>(
  ({ products }, ref) => {
    
    // Group products by category
    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    return (
      <div ref={ref}>
        {Object.entries(groupedProducts).map(([category, productsInCategory]) => (
            <section key={category}>
                <h2>Inventory Count Sheet - {category}</h2>
                <p>Date: {new Date().toLocaleDateString()}</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                    <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', width: '150px' }}>Manual Count</th>
                    </tr>
                </thead>
                <tbody>
                    {productsInCategory.map((product) => (
                    <tr key={product.id}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.name}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px', height: '30px' }}></td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </section>
        ))}
      </div>
    );
  }
);

PrintableInventorySheet.displayName = "PrintableInventorySheet";
