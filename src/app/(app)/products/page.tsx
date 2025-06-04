
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
        const productData = doc.data() as Omit<Product, 'id'>;
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

    return () => unsubscribe();
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

    try {
      if (productToSave.id && products.some(p => p.id === productToSave.id)) {
        // Editing existing product
        const productRef = doc(db, 'products', productToSave.id);
        await setDoc(productRef, productToSave, { merge: true }); // Use setDoc with merge for update
        toast({
          title: "Product Updated",
          description: `Product ${productToSave.name} has been updated.`,
        });
      } else {
        // Adding new product
        const docRef = await addDoc(collection(db, 'products'), {
          ...productToSave,
          id: undefined // Firestore will generate ID, or use productToSave.id if you generate it client-side
        }); 
        // If you want to use client-generated ID with addDoc, it's more common to use setDoc
        // For example: await setDoc(doc(db, "products", productToSave.id || crypto.randomUUID()), productToSave);
        // For simplicity, we let Firestore generate the ID here if it's a new item without an ID from import/mock.
        // If productToSave.id IS present (e.g. from a previous client-side generation attempt or import), use setDoc:
        // await setDoc(doc(db, 'products', productToSave.id), productToSave);

        toast({
          title: "Product Added",
          description: `Product ${productToSave.name} has been added.`,
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
    const expectedHeaders = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage', 'description'];
    const receivedHeadersSet = new Set(headers);
    const missingRequiredHeaders = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage'].filter(eh => !receivedHeadersSet.has(eh));

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required headers: ${missingRequiredHeaders.join(', ')}. Expected: ${expectedHeaders.join(', ')}.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }

    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const productData: any = {};
      lines[0].split(',').map(h => h.trim().toLowerCase()).forEach((header, index) => {
        productData[header] = values[index];
      });

      if (!productData.name || !productData.category || !productData.unit || productData.price === undefined || productData.cost === undefined || productData.markuppercentage === undefined) {
        console.warn(`Skipping row ${i+1}: missing required fields.`);
        continue; 
      }
      
      const category = productData.category.trim();
      handleAddNewCategory(category); // Update local category list

      const newProduct: Omit<Product, 'id'> = {
        name: productData.name,
        category: category,
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
    // Keep 'id' in export headers in case user re-imports and wants to match
    const headers = ['id', 'name', 'category', 'unit', 'price', 'cost', 'markupPercentage', 'description'];
    const headerString = headers.join(',');
    const rows = productsToExport.map(product => 
      headers.map(header => {
        const value = product[header as keyof Product];
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`; // Handle quotes in strings
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
