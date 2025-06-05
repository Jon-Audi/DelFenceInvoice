
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { ProductTable } from '@/components/products/product-table';
import { ProductDialog } from '@/components/products/product-dialog';
import type { Product } from '@/types';
import { INITIAL_PRODUCT_CATEGORIES } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { db, auth as firebaseAuthInstance } from '@/lib/firebase'; // Import firebaseAuthInstance
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';

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
      snapshot.forEach((docSnap) => {
        const productData = docSnap.data() as Omit<Product, 'id'>;
        fetchedProducts.push({ ...productData, id: docSnap.id });
        if (productData.category) {
          categoriesFromDb.add(productData.category);
        }
      });
      setProducts(fetchedProducts.sort((a,b) => a.name.localeCompare(b.name)));
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
          title: "Category Added Locally",
          description: `Category "${normalizedCategory}" is available for selection. It will be saved if a product using it is saved.`,
      });
    }
  };

  const handleSaveProduct = async (productToSave: Product) => {
    if (productToSave.category) {
        const normalizedCategory = productToSave.category.trim();
        if (normalizedCategory && !productCategories.find(pc => pc.toLowerCase() === normalizedCategory.toLowerCase())) {
            setProductCategories(prev => [...prev, normalizedCategory].sort((a, b) => a.localeCompare(b)));
        }
    }

    const { id, ...productData } = productToSave;

    const currentUser = firebaseAuthInstance.currentUser;
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "No user logged in. Cannot save product.",
        variant: "destructive",
      });
      return;
    }
    console.log(`Attempting to save product. User UID: ${currentUser.uid}. Please ensure this user has 'Admin' role in Firestore /users/${currentUser.uid} for write access.`);


    try {
      setIsLoading(true);
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
        title: "Error Saving Product",
        description: `Could not save product. Check your Firestore '/users/${currentUser.uid}' document to ensure the 'role' field is set to 'Admin'. Details: ${(error as Error).message}`,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplyCategoryMarkup = async (categoryName: string, markup: number) => {
    if (isNaN(markup) || markup < 0) {
      toast({ title: "Invalid Markup", description: "Markup percentage must be a non-negative number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('category', '==', categoryName));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        toast({ title: "No Products", description: `No products found in category "${categoryName}".`, variant: "default" });
        setIsLoading(false);
        return;
      }
  
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        const product = docSnap.data() as Omit<Product, 'id'>;
        const newPrice = product.cost * (1 + markup / 100);
        batch.update(docSnap.ref, { 
          price: parseFloat(newPrice.toFixed(2)), 
          markupPercentage: parseFloat(markup.toFixed(2)) 
        });
      });
  
      await batch.commit();
      toast({
        title: "Markup Applied",
        description: `Markup of ${markup}% applied to ${querySnapshot.size} products in category "${categoryName}". Prices updated.`,
      });
    } catch (error) {
      console.error("Error applying category markup:", error);
      toast({ title: "Error", description: "Could not apply markup. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    const productsUsingCategory = products.filter(p => p.category === categoryToDelete);
    if (productsUsingCategory.length > 0) {
      toast({
        title: "Cannot Delete Category",
        description: `Category "${categoryToDelete}" cannot be deleted because ${productsUsingCategory.length} product(s) are still using it.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

    setProductCategories(prev => prev.filter(cat => cat !== categoryToDelete));
    toast({
      title: "Category Deleted",
      description: `Category "${categoryToDelete}" has been removed.`,
    });
  };


  const parseCsvToProducts = (csvData: string): Omit<Product, 'id'>[] => {
    const newProductsData: Omit<Product, 'id'>[] = [];
    const lines = csvData.trim().split(/\r\n|\n/);
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "CSV Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const rawHeaders = lines[0].split(',').map(h => h.trim());
    const normalizedCsvHeaders = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, ''));
    
    const expectedRequiredHeadersNormalized = ['name', 'category', 'unit', 'price', 'cost', 'markuppercentage'];
    
    const csvHeaderMap: Record<string, number> = {};
    normalizedCsvHeaders.forEach((header, index) => {
      csvHeaderMap[header] = index;
    });
    
    const missingRequiredHeaders = expectedRequiredHeadersNormalized.filter(eh => csvHeaderMap[eh] === undefined);

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required headers: ${missingRequiredHeaders.join(', ')}. Required headers (case-insensitive, spaces ignored): ${expectedRequiredHeadersNormalized.join(', ')}. Optional header: description.`,
            variant: "destructive",
            duration: 15000,
        });
        return [];
    }

    let parsedProductCount = 0;
    let skippedRowCount = 0;

    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const productDataFromCsv: Record<string, string> = {};
      
      normalizedCsvHeaders.forEach((header, index) => {
        if (values[index] !== undefined) {
            productDataFromCsv[header] = values[index];
        }
      });

      const name = productDataFromCsv.name;
      const category = productDataFromCsv.category;
      const unit = productDataFromCsv.unit;
      const priceStr = productDataFromCsv.price;
      const costStr = productDataFromCsv.cost;
      const markupPercentageStr = productDataFromCsv.markuppercentage === "" ? "0" : productDataFromCsv.markuppercentage;
      const descriptionFromCsv = productDataFromCsv.description; 

      let rowIsValid = true;
      let missingFieldsForRow: string[] = [];

      if (!name) { missingFieldsForRow.push('name'); rowIsValid = false; }
      if (!category) { missingFieldsForRow.push('category'); rowIsValid = false; }
      if (!unit) { missingFieldsForRow.push('unit'); rowIsValid = false; }
      if (priceStr === undefined) { missingFieldsForRow.push('price'); rowIsValid = false; }
      if (costStr === undefined) { missingFieldsForRow.push('cost'); rowIsValid = false; }
      if (markupPercentageStr === undefined) { missingFieldsForRow.push('markuppercentage'); rowIsValid = false; }

      if (!rowIsValid) {
        console.warn(`Skipping CSV row ${i+1}: missing required field(s): ${missingFieldsForRow.join(', ')}. Row data: ${lines[i]}`);
        skippedRowCount++;
        continue; 
      }
      
      const price = parseFloat(priceStr);
      const cost = parseFloat(costStr);
      const markupPercentage = parseFloat(markupPercentageStr || "0");

      if (isNaN(price)) { console.warn(`Skipping CSV row ${i+1}: 'price' ("${priceStr}") is not a valid number. Row data: ${lines[i]}`); skippedRowCount++; continue; }
      if (isNaN(cost)) { console.warn(`Skipping CSV row ${i+1}: 'cost' ("${costStr}") is not a valid number. Row data: ${lines[i]}`); skippedRowCount++; continue; }
      if (isNaN(markupPercentage)) { console.warn(`Skipping CSV row ${i+1}: 'markupPercentage' ("${productDataFromCsv.markuppercentage}" -> "${markupPercentageStr}") is not a valid number. Row data: ${lines[i]}`); skippedRowCount++; continue; }
      
      const trimmedCategory = category.trim();
      
      const newProductData: Omit<Product, 'id'> = {
        name: name.trim(),
        category: trimmedCategory,
        unit: unit.trim(),
        price: price,
        cost: cost,
        markupPercentage: markupPercentage,
      };

      const trimmedDescription = descriptionFromCsv?.trim();
      if (trimmedDescription) {
        (newProductData as any).description = trimmedDescription;
      }

      newProductsData.push(newProductData);
      parsedProductCount++;
    }
    
    if (parsedProductCount > 0) {
        toast({
            title: "CSV Parsed",
            description: `${parsedProductCount} products parsed. ${skippedRowCount > 0 ? `${skippedRowCount} rows skipped (see console for details).` : 'All rows processed.'}`,
            variant: skippedRowCount > 0 ? "default" : "default",
            duration: 8000,
        });
    } else if (lineCount > 1 && missingRequiredHeaders.length === 0) {
        toast({
            title: "CSV Info",
            description: `Headers matched, but no valid product data rows could be parsed. ${skippedRowCount} rows were skipped. Please check row content for all required fields and correct data types (see console for details).`,
            variant: "default",
            duration: 10000,
        });
    }
    return newProductsData;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        const parsedProducts = parseCsvToProducts(csvData); 

        if (parsedProducts.length > 0) {
          const newCategoriesFromCsv = new Set<string>();
          parsedProducts.forEach(p => {
            if (p.category && !productCategories.some(existingCat => existingCat.toLowerCase() === p.category.toLowerCase())) {
              newCategoriesFromCsv.add(p.category);
            }
          });
          if (newCategoriesFromCsv.size > 0) {
            setProductCategories(prev => [...prev, ...Array.from(newCategoriesFromCsv)].sort((a,b) => a.localeCompare(b)));
          }
          setIsLoading(true);
          try {
            const batch = writeBatch(db);
            parsedProducts.forEach(productData => { 
              const newDocRef = doc(collection(db, 'products'));
              const productToWrite: any = {...productData};
              if (productData.description === undefined) {
                delete productToWrite.description;
              }
              batch.set(newDocRef, productToWrite);
            });
            await batch.commit();
            toast({
              title: "Import Successful",
              description: `${parsedProducts.length} products imported to Firestore.`,
            });
          } catch (error: any) {
            console.error("Error importing CSV to Firestore:", error);
            toast({
              title: "Firestore Error",
              description: `Failed to save products to database. ${error.message || 'Check console for details.'}`,
              variant: "destructive",
              duration: 10000,
            });
          } finally {
            setIsLoading(false);
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
    const headers = ['id', 'name', 'category', 'unit', 'price', 'cost', 'markuppercentage', 'description'];
    const headerString = headers.join(',');
    const rows = productsToExport.map(product =>
      headers.map(header => {
        let value;
        if (header === 'markuppercentage') {
          value = product['markupPercentage' as keyof Product];
        } else {
          value = product[header as keyof Product];
        }
        
        if (header === 'description' && value === undefined) {
          return '';
        }

        if (typeof value === 'string') {
          const escapedValue = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${escapedValue}"`;
          }
          return escapedValue;
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

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    productCategories.forEach(category => {
        groups.set(category, []); 
    });
    products.forEach(product => {
      const category = product.category || 'Uncategorized'; 
      if (!groups.has(category)) {
        groups.set(category, []); // Should not happen if productCategories is up-to-date
      }
      groups.get(category)!.push(product);
    });
    // Sort categories: those with products first, then alphabetically.
    // Then sort empty categories alphabetically.
    return new Map([...groups.entries()].sort(([catA, prodsA], [catB, prodsB]) => {
        const hasProdsA = prodsA.length > 0;
        const hasProdsB = prodsB.length > 0;

        if (hasProdsA && !hasProdsB) return -1; // A comes before B
        if (!hasProdsA && hasProdsB) return 1;  // B comes before A
        
        // If both have products or both are empty, sort alphabetically
        return catA.localeCompare(catB);
    }));
  }, [products, productCategories]);
  
  if (isLoading && products.length === 0) { 
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
            disabled={isLoading}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCsv} disabled={isLoading || products.length === 0}>
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <ProductDialog 
            triggerButton={
              <Button disabled={isLoading}>
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
        groupedProducts={groupedProducts} 
        onSave={handleSaveProduct} 
        onDelete={handleDeleteProduct}
        productCategories={productCategories}
        onAddNewCategory={handleAddNewCategory}
        isLoading={isLoading}
        onApplyCategoryMarkup={handleApplyCategoryMarkup}
        onDeleteCategory={handleDeleteCategory}
      />
    </>
  );
}

