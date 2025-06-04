
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { ProductTable } from '@/components/products/product-table';
import { ProductDialog } from '@/components/products/product-dialog';
import type { Product } from '@/types';
import { INITIAL_PRODUCT_CATEGORIES } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch } from 'firebase/firestore';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(INITIAL_PRODUCT_CATEGORIES);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categoriesFromDb = new Set<string>(INITIAL_PRODUCT_CATEGORIES);
      snapshot.forEach((doc) => {
        const productData = doc.data() as Omit<Product, 'id'>; // Firestore data won't have id field itself
        fetchedProducts.push({ ...productData, id: doc.id });
        if (productData.category) {
          categoriesFromDb.add(productData.category);
        }
      });
      setProducts(fetchedProducts);
      setProductCategories(Array.from(categoriesFromDb).sort((a, b) => a.localeCompare(b)));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Could not fetch products from database.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, [toast]);

  const handleAddNewCategory = (category: string) => {
    if (category.trim() === '') return;
    const normalizedCategory = category.trim();
    if (!productCategories.find(pc => pc.toLowerCase() === normalizedCategory.toLowerCase())) {
      setProductCategories(prev => [...prev, normalizedCategory].sort((a, b) => a.localeCompare(b)));
       toast({
          title: "Category Added",
          description: `Category "${normalizedCategory}" has been added to the list. This will be fully saved when a product uses it.`,
      });
    }
  };

  const handleSaveProduct = async (productToSave: Product) => {
    handleAddNewCategory(productToSave.category); // Keep local category list updated

    // Remove id from the object to be saved if it's a new product, Firestore will generate one.
    // For existing products, keep id for the doc() reference, but don't save it as a field within the doc.
    const { id, ...productData } = productToSave;

    try {
      if (id && products.some(p => p.id === id)) {
        // Editing existing product
        const productRef = doc(db, 'products', id);
        await setDoc(productRef, productData); // Use setDoc to overwrite or create
        toast({
          title: "Product Updated",
          description: `Product ${productToSave.name} has been updated.`,
        });
      } else {
        // Adding new product
        // Firestore will generate an ID if we don't specify one in doc()
        const docRef = await addDoc(collection(db, 'products'), productData);
        toast({
          title: "Product Added",
          description: `Product ${productToSave.name} has been added with ID: ${docRef.id}.`,
        });
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Could not save product to database.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast({
        title: "Product Deleted",
        description: "The product has been removed.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Could not delete product from database.",
        variant: "destructive",
      });
    }
  };

  const parseCsvToProducts = (csvData: string): Omit<Product, 'id'>[] => {
    const newProducts: Omit<Product, 'id'>[] = [];
    const lines = csvData.trim().split('\n');
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    // 'id' is removed from expected headers for CSV import as Firestore will generate IDs
    const expectedHeaders = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage', 'description'];
    const receivedHeadersSet = new Set(headers);
    const missingRequiredHeaders = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage'].filter(eh => !receivedHeadersSet.has(eh));

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required headers: ${missingRequiredHeaders.join(', ')}. Expected: ${expectedHeaders.join(', ')}. Note: 'id' column should not be present for new imports.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }

    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const productDataFromCsv: any = {};
      lines[0].split(',').map(h => h.trim().toLowerCase()).forEach((header, index) => {
        productDataFromCsv[header] = values[index];
      });

      if (!productDataFromCsv.name || !productDataFromCsv.category || !productDataFromCsv.unit || productDataFromCsv.price === undefined || productDataFromCsv.cost === undefined || productDataFromCsv.markuppercentage === undefined) {
        console.warn(`Skipping row ${i+1}: missing required fields.`);
        continue; 
      }
      
      const category = productDataFromCsv.category.trim();
      handleAddNewCategory(category); // Update local category list

      const newProduct: Omit<Product, 'id'> = {
        name: productDataFromCsv.name,
        category: category,
        unit: productDataFromCsv.unit,
        price: parseFloat(productDataFromCsv.price) || 0,
        cost: parseFloat(productDataFromCsv.cost) || 0,
        markupPercentage: parseFloat(productDataFromCsv.markuppercentage) || 0,
        description: productDataFromCsv.description || undefined,
      };
      newProducts.push(newProduct);
    }
    return newProducts;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        try {
          const parsedProducts = parseCsvToProducts(csvData);
          if (parsedProducts.length > 0) {
            const batch = writeBatch(db);
            parsedProducts.forEach(product => {
              const newDocRef = doc(collection(db, 'products')); // Firestore generates ID
              batch.set(newDocRef, product);
            });
            await batch.commit();
            toast({
              title: "Success",
              description: `${parsedProducts.length} products imported successfully.`,
            });
          } else if (csvData.trim().split('\n').length >=2 && parseCsvToProducts(csvData).length === 0) { 
            // Error handled by parseCsvToProducts
          } else if (csvData.trim().split('\n').length <2) {
            // Error handled by parseCsvToProducts
          } else {
             toast({
              title: "Info",
              description: "No new products were imported. Check CSV file content.",
              duration: 7000,
            });
          }
        } catch (error) {
          console.error("Error importing CSV to Firestore:", error);
          toast({
            title: "Error Importing CSV",
            description: "Failed to save products to database. Check console for details.",
            variant: "destructive",
            duration: 10000,
          });
        }
      }
      // Reset file input to allow uploading the same file again if needed
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

  const productsToCsv = (productsToExport: Product[]): string => {
    if (!productsToExport.length) return "";
    // Keep 'id' in export headers in case user re-imports and wants to match (though import process currently ignores it)
    // Or, more safely, exclude 'id' from export if the import process strictly doesn't handle it.
    // For now, including it for completeness, but acknowledge the import logic might need adjustment if IDs are to be preserved.
    const headers = ['id', 'name', 'category', 'unit', 'price', 'cost', 'markupPercentage', 'description'];
    const headerString = headers.join(',');
    const rows = productsToExport.map(product => 
      headers.map(header => {
        const value = product[header as keyof Product];
        if (typeof value === 'string') {
          // Escape double quotes and wrap in double quotes if value contains comma or double quote
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return value !== undefined && value !== null ? value : '';
      }).join(',')
    );
    return [headerString, ...rows].join('\n');
  };

  const handleExportCsv = () => {
    if (products.length === 0) {
      toast({ title: "No Products", description: "There are no products to export.", variant: "default" });
      return;
    }
    const csvString = productsToCsv(products);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "products_export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Products exported to products_export.csv" });
    } else {
      toast({ title: "Export Failed", description: "Your browser doesn't support direct CSV download.", variant: "destructive" });
    }
  };
  
  if (isLoading) {
    return (
      <PageHeader title="Products" description="Loading product inventory...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

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
          <Button variant="outline" onClick={handleExportCsv}>
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
            productCategories={productCategories}
            onAddNewCategory={handleAddNewCategory}
          />
        </div>
      </PageHeader>
      <ProductTable 
        products={products} 
        onSave={handleSaveProduct} 
        onDelete={handleDeleteProduct}
        productCategories={productCategories}
        onAddNewCategory={handleAddNewCategory}
      />
    </>
  );
}
