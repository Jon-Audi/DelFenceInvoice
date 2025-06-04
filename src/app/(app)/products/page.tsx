
"use client";

import React, { useState, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { ProductTable } from '@/components/products/product-table';
import { ProductDialog } from '@/components/products/product-dialog';
import type { Product, ProductCategory } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";

// Mock data for products
const mockProducts: Product[] = [
  { id: 'prod_1', name: '6ft Cedar Picket', category: 'Fencing', unit: 'piece', price: 3.50, cost: 2.00, markupPercentage: 75, description: 'Standard cedar fence picket' },
  { id: 'prod_2', name: '4x4x8 Pressure Treated Post', category: 'Posts', unit: 'piece', price: 12.00, cost: 8.00, markupPercentage: 50, description: 'Ground contact rated post' },
  { id: 'prod_3', name: 'Vinyl Gate Kit', category: 'Gates', unit: 'kit', price: 150.00, cost: 100.00, markupPercentage: 50, description: 'Complete vinyl gate kit' },
  { id: 'prod_4', name: 'Stainless Steel Hinges', category: 'Hardware', unit: 'pair', price: 25.00, cost: 15.00, markupPercentage: 66.67, description: 'Heavy duty gate hinges' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSaveProduct = (productToSave: Product) => {
    setProducts(prevProducts => {
      const index = prevProducts.findIndex(p => p.id === productToSave.id);
      if (index !== -1) {
        const updatedProducts = [...prevProducts];
        updatedProducts[index] = productToSave;
        return updatedProducts;
      } else {
        return [...prevProducts, { ...productToSave, id: productToSave.id || crypto.randomUUID() }];
      }
    });
    toast({
      title: "Success",
      description: `Product ${productToSave.name} saved.`,
    });
  };

  const parseCsvToProducts = (csvData: string): Product[] => {
    const newProducts: Product[] = [];
    const lines = csvData.trim().split('\n');
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase()); // Normalize headers
    const expectedHeaders = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage', 'description'];
    
    const receivedHeadersSet = new Set(headers);
    // Check if all expected headers are present
    const allExpectedHeadersPresent = expectedHeaders.every(eh => receivedHeadersSet.has(eh));

    if (!allExpectedHeadersPresent) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file headers are incorrect or missing. Expected headers (case-insensitive): ${expectedHeaders.join(', ')}. Please ensure your CSV matches this format.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }

    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const productData: any = {};
      // Use actual headers from CSV for mapping
       lines[0].split(',').map(h => h.trim()).forEach((header, index) => {
        productData[header.toLowerCase()] = values[index];
      });

      if (!productData.name || !productData.category || !productData.unit) {
        console.warn(`Skipping row ${i+1}: missing name, category, or unit.`);
        toast({
            title: "Skipped Row",
            description: `Skipped row ${i+1} due to missing name, category, or unit.`,
            variant: "default",
            duration: 5000,
        });
        continue; 
      }
      
      const category = PRODUCT_CATEGORIES.find(cat => cat.toLowerCase() === (productData.category || '').toLowerCase()) || PRODUCT_CATEGORIES[0];

      const newProduct: Product = {
        id: crypto.randomUUID(),
        name: productData.name,
        category: category as ProductCategory,
        unit: productData.unit,
        price: parseFloat(productData.price) || 0,
        cost: parseFloat(productData.cost) || 0,
        markupPercentage: parseFloat(productData.markuppercentage) || 0,
        description: productData.description || undefined,
      };
      newProducts.push(newProduct);
    }
    return newProducts;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        try {
          const parsedProducts = parseCsvToProducts(csvData);
          if (parsedProducts.length > 0) {
            setProducts(prev => [...prev, ...parsedProducts]);
            toast({
              title: "Success",
              description: `${parsedProducts.length} products imported successfully.`,
            });
          } else if (csvData.trim().split('\n').length >=2) { 
             toast({
              title: "Info",
              description: "No new products were imported. Check CSV format or content. Required headers: name, category, unit.",
              duration: 7000,
            });
          }
        } catch (error) {
          console.error("Error parsing CSV for products:", error);
          toast({
            title: "Error Parsing CSV",
            description: "Failed to parse CSV file for products. Please check the file format and content.",
            variant: "destructive",
            duration: 10000,
          });
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Failed to read the file.", variant: "destructive" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHeader title="Products" description="Manage your product inventory.">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleFileChange}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <ProductDialog 
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            }
            onSave={handleSaveProduct} 
          />
        </div>
      </PageHeader>
      <ProductTable products={products} onSave={handleSaveProduct} />
    </>
  );
}
