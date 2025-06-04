
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
      snapshot.forEach((docSnap) => { // Renamed doc to docSnap to avoid conflict
        const productData = docSnap.data() as Omit<Product, 'id'>; // Firestore data won't have id field itself
        fetchedProducts.push({ ...productData, id: docSnap.id });
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
          title: "Category Added Locally",
          description: `Category "${normalizedCategory}" is available for selection. It will be saved if a product using it is saved.`,
      });
    }
  };

  const handleSaveProduct = async (productToSave: Product) => {
    // Ensure category from product is in local list for immediate UI consistency
    // onSnapshot will later confirm it from DB.
    if (productToSave.category) {
        const normalizedCategory = productToSave.category.trim();
        if (normalizedCategory && !productCategories.find(pc => pc.toLowerCase() === normalizedCategory.toLowerCase())) {
             // This local update is mostly for UI responsiveness before Firestore confirms.
            setProductCategories(prev => [...prev, normalizedCategory].sort((a, b) => a.localeCompare(b)));
        }
    }

    const { id, ...productData } = productToSave;

    try {
      if (id && products.some(p => p.id === id)) {
        const productRef = doc(db, 'products', id);
        await setDoc(productRef, productData); 
        toast({
          title: "Product Updated",
          description: `Product ${productToSave.name} has been updated.`,
        });
      } else {
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
      toast({ title: "CSV Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headerLine = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage']; // description is optional
    const receivedHeadersSet = new Set(headerLine);
    const missingRequiredHeaders = expectedHeaders.filter(eh => !receivedHeadersSet.has(eh) && eh !== 'description'); // only core fields are strictly required for header check

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required headers: ${missingRequiredHeaders.join(', ')}. Expected at least: ${expectedHeaders.slice(0, -1).join(', ')}.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }

    let parsedProductCount = 0;
    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const productDataFromCsv: any = {};
      headerLine.forEach((header, index) => {
        productDataFromCsv[header] = values[index];
      });

      const name = productDataFromCsv.name;
      const category = productDataFromCsv.category;
      const unit = productDataFromCsv.unit;
      const priceStr = productDataFromCsv.price;
      const costStr = productDataFromCsv.cost;
      const markupPercentageStr = productDataFromCsv.markuppercentage;

      if (!name || !category || !unit || priceStr === undefined || costStr === undefined || markupPercentageStr === undefined) {
        console.warn(`Skipping row ${i+1}: missing one or more required fields (name, category, unit, price, cost, markupPercentage).`);
        continue; 
      }
      
      const price = parseFloat(priceStr);
      const cost = parseFloat(costStr);
      const markupPercentage = parseFloat(markupPercentageStr);

      if (isNaN(price) || isNaN(cost) || isNaN(markupPercentage)) {
        console.warn(`Skipping row ${i+1}: price, cost, or markupPercentage is not a valid number.`);
        continue;
      }
      
      // Only call handleAddNewCategory if the product row is valid and will be added
      const trimmedCategory = category.trim();
      handleAddNewCategory(trimmedCategory); 

      const newProduct: Omit<Product, 'id'> = {
        name: name.trim(),
        category: trimmedCategory,
        unit: unit.trim(),
        price: price,
        cost: cost,
        markupPercentage: markupPercentage,
        description: productDataFromCsv.description?.trim() || undefined,
      };
      newProducts.push(newProduct);
      parsedProductCount++;
    }
    
    if (lineCount > 1 && parsedProductCount === 0 && missingRequiredHeaders.length === 0) {
        // Headers were okay, but no data rows were valid
        toast({
            title: "CSV Info",
            description: "CSV headers found, but no valid product data rows could be parsed. Please check row content for all required fields and correct data types.",
            variant: "default",
            duration: 8000,
        });
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
        const parsedProducts = parseCsvToProducts(csvData); // Called once

        if (parsedProducts.length > 0) {
          try {
            const batch = writeBatch(db);
            parsedProducts.forEach(product => {
              const newDocRef = doc(collection(db, 'products')); 
              batch.set(newDocRef, product);
            });
            await batch.commit();
            toast({
              title: "Success",
              description: `${parsedProducts.length} products imported successfully to Firestore.`,
            });
          } catch (error) {
            console.error("Error importing CSV to Firestore:", error);
            toast({
              title: "Firestore Error",
              description: "Failed to save products to database. Check console for details.",
              variant: "destructive",
              duration: 10000,
            });
          }
        } else {
          // If parsedProducts is empty, parseCsvToProducts should have already shown a specific toast
          // (header error, or no valid data rows). If not, this is a fallback.
          const lines = csvData.trim().split('\n');
          if (lines.length < 2) {
            // This case is already handled by parseCsvToProducts' initial check
          } else if (!toast.isActive(`csv-info-no-valid-rows`) && !toast.isActive('csv-header-error-toast')) {
            // Check if a more specific toast was already shown.
            // `toast.isActive` is a hypothetical check; useToast doesn't provide this.
            // We rely on parseCsvToProducts to have already toasted appropriately.
            // This fallback might be redundant if parseCsvToProducts covers all empty scenarios.
            console.log("CSV Import: parsedProducts was empty, specific toasts should have handled this.");
          }
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Failed to read the file.", variant: "destructive" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const productsToCsv = (productsToExport: Product[]): string => {
    if (!productsToExport.length) return "";
    const headers = ['id', 'name', 'category', 'unit', 'price', 'cost', 'markupPercentage', 'description'];
    const headerString = headers.join(',');
    const rows = productsToExport.map(product => 
      headers.map(header => {
        const value = product[header as keyof Product];
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        return value !== undefined && value !== null ? String(value) : '';
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

    