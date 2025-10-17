"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { ProductTable } from '@/components/products/product-table';
import { ProductDialog } from '@/components/products/product-dialog';
import { BulkAddProductsDialog } from '@/components/products/bulk-add-products-dialog';
import type { Product, CompanySettings, Customer } from '@/types';
import { INITIAL_PRODUCT_CATEGORIES, ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { db, auth as firebaseAuthInstance } from '@/lib/firebase'; 
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch, query, where, getDocs, getDoc as getFirestoreDoc, runTransaction } from 'firebase/firestore';
import { PrintablePriceSheet } from '@/components/products/printable-price-sheet';
import { SelectCategoriesDialog } from '@/components/products/select-categories-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COMPANY_SETTINGS_DOC_ID = "main";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(INITIAL_PRODUCT_CATEGORIES);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const [productsForPrinting, setProductsForPrinting] = useState<Map<string, Product[]> | null>(null);
  const [customerForPrinting, setCustomerForPrinting] = useState<Customer | null>(null);
  const [companySettingsForPrinting, setCompanySettingsForPrinting] = useState<CompanySettings | null>(null);
  const [isLoadingCompanySettings, setIsLoadingCompanySettings] = useState(false);
  const [isSelectCategoriesDialogOpen, setIsSelectCategoriesDialogOpen] = useState(false);
  const [isCustomerSelectDialogOpen, setIsCustomerSelectDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false);
  const [productForStockUpdate, setProductForStockUpdate] = useState<Product | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categoriesFromDb = new Set<string>(INITIAL_PRODUCT_CATEGORIES);
      const subcategoriesFromDb = new Set<string>();
      snapshot.forEach((docSnap) => {
        const productData = docSnap.data() as Omit<Product, 'id'>;
        fetchedProducts.push({ ...productData, id: docSnap.id });
        if (productData.category) {
          categoriesFromDb.add(productData.category);
        }
        if (productData.subcategory) {
          subcategoriesFromDb.add(productData.subcategory);
        }
      });
      setProducts(fetchedProducts.sort((a,b) => a.name.localeCompare(b.name)));
      setProductCategories(Array.from(categoriesFromDb).sort((a, b) => a.localeCompare(b)));
      setProductSubcategories(Array.from(subcategoriesFromDb).sort((a, b) => a.localeCompare(b)));
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
  
  useEffect(() => {
    setIsLoadingCustomers(true);
    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const customerData = docSnap.data() as Omit<Customer, 'id'>;
        fetchedCustomers.push({ ...customerData, id: docSnap.id });
      });
      setCustomers(fetchedCustomers.sort((a, b) => (a.companyName || `${a.firstName} ${a.lastName}`).localeCompare(b.companyName || `${b.firstName} ${b.lastName}`)));
      setIsLoadingCustomers(false);
    }, (error) => {
      console.error("[ProductsPage] Error fetching customers:", error);
      setIsLoadingCustomers(false);
    });
     return () => unsubscribeCustomers();
  }, []);

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

  const handleAddNewSubcategory = (subcategory: string) => {
    if (subcategory.trim() === '') return;
    const normalized = subcategory.trim();
    if (!productSubcategories.find(sc => sc.toLowerCase() === normalized.toLowerCase())) {
      setProductSubcategories(prev => [...prev, normalized].sort((a, b) => a.localeCompare(b)));
    }
  };


  const handleSaveProduct = async (productToSave: Product) => {
    if (productToSave.category) {
        const normalizedCategory = productToSave.category.trim();
        if (normalizedCategory && !productCategories.find(pc => pc.toLowerCase() === normalizedCategory.toLowerCase())) {
            setProductCategories(prev => [...prev, normalizedCategory].sort((a, b) => a.localeCompare(b)));
        }
    }
    if (productToSave.subcategory) {
        const normalizedSub = productToSave.subcategory.trim();
        if (normalizedSub && !productSubcategories.find(sc => sc.toLowerCase() === normalizedSub.toLowerCase())) {
            setProductSubcategories(prev => [...prev, normalizedSub].sort((a,b) => a.localeCompare(b)));
        }
    }

    const { id, ...restOfProductData } = productToSave;

    const dataForFirestore: Partial<Omit<Product, 'id'>> = {
      name: restOfProductData.name,
      category: restOfProductData.category,
      subcategory: restOfProductData.subcategory,
      unit: restOfProductData.unit,
      cost: restOfProductData.cost,
      price: restOfProductData.price,
      markupPercentage: restOfProductData.markupPercentage,
      quantityInStock: restOfProductData.quantityInStock || 0,
      isAssembly: restOfProductData.isAssembly || false,
      components: restOfProductData.components || [],
    };

    if (restOfProductData.description !== undefined) {
      dataForFirestore.description = restOfProductData.description;
    }
    if (dataForFirestore.subcategory === undefined || dataForFirestore.subcategory === '') {
      delete dataForFirestore.subcategory;
    }
    
    const currentUser = firebaseAuthInstance.currentUser;
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "No user logged in. Cannot save product.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      if (id && products.some(p => p.id === id)) {
        const productRef = doc(db, 'products', id);
        await setDoc(productRef, dataForFirestore, { merge: true });
        toast({
          title: "Product Updated",
          description: `Product ${productToSave.name} has been updated.`,
        });
      } else {
        const docRef = await addDoc(collection(db, 'products'), dataForFirestore); 
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
  
  const handleBulkUpdateProducts = async (updatedProducts: Product[]) => {
    setIsLoading(true);
    const batch = writeBatch(db);
    updatedProducts.forEach(product => {
      const { id, ...productData } = product;
      const productRef = doc(db, "products", id);
      batch.update(productRef, {
        price: product.price,
        cost: product.cost,
        markupPercentage: product.markupPercentage,
      });
    });
    try {
      await batch.commit();
      toast({
        title: "Bulk Update Successful",
        description: `${updatedProducts.length} products have been updated.`,
      });
    } catch (error) {
      console.error("Error during bulk product update:", error);
      toast({
        title: "Bulk Update Failed",
        description: `Could not update products. Error: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBulkStockUpdate = async (updatedProducts: { id: string; quantityInStock: number }[]) => {
    setIsLoading(true);
    const batch = writeBatch(db);
    updatedProducts.forEach(product => {
      const productRef = doc(db, "products", product.id);
      batch.update(productRef, { quantityInStock: product.quantityInStock });
    });
    try {
      await batch.commit();
      toast({
        title: "Bulk Stock Update Successful",
        description: `${updatedProducts.length} products have had their stock updated.`,
      });
    } catch (error) {
      console.error("Error during bulk stock update:", error);
      toast({
        title: "Bulk Stock Update Failed",
        description: `Could not update stock levels. Error: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMultipleProducts = async (productsToSave: Omit<Product, 'id'>[]) => {
    const currentUser = firebaseAuthInstance.currentUser;
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "No user logged in. Cannot save products.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      productsToSave.forEach(productData => {
        const newDocRef = doc(collection(db, 'products'));
        batch.set(newDocRef, productData);
      });
      await batch.commit();
      toast({
        title: "Bulk Add Successful",
        description: `${productsToSave.length} products have been added successfully.`,
      });
    } catch (error) {
      console.error("Error saving multiple products:", error);
      toast({
        title: "Error During Bulk Add",
        description: `Could not save products. Error: ${(error as Error).message}`,
        variant: "destructive",
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
        skippedRowCount++;
        continue; 
      }
      
      const price = parseFloat(priceStr);
      const cost = parseFloat(costStr);
      const markupPercentage = parseFloat(markupPercentageStr || "0");

      if (isNaN(price)) { skippedRowCount++; continue; }
      if (isNaN(cost)) { skippedRowCount++; continue; }
      if (isNaN(markupPercentage)) { skippedRowCount++; continue; }
      
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
            parsedProducts.forEach(productDataFromCsv => { 
              const newDocRef = doc(collection(db, 'products'));
              const productToWrite: Partial<Product> = { ...productDataFromCsv, quantityInStock: 0 };
              if (productToWrite.description === undefined) {
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
    const headers = ['id', 'name', 'category', 'subcategory', 'unit', 'price', 'cost', 'markuppercentage', 'quantityInStock', 'description'];
    const headerString = headers.join(',');
    const rows = productsToExport.map(product =>
      headers.map(header => {
        let value;
        if (header === 'markuppercentage') {
          value = product['markupPercentage' as keyof Product];
        } else {
          value = product[header as keyof Product];
        }
        
        if ((header === 'description' || header === 'subcategory') && value === undefined) {
          return '';
        }

        if (typeof value === 'string') {
          const escapedValue = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
            return `"${escapedValue}"`;
          }
          return escapedValue;
        }
        return value !== undefined && value !== null ? String(value) : '';
      }).join(',')
    );
    return [headerString, ...rows].join('\\n');
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
        groups.set(category, []);
      }
      groups.get(category)!.push(product);
    });
    return new Map([...groups.entries()].sort(([catA, prodsA], [catB, prodsB]) => {
        const hasProdsA = prodsA.length > 0;
        const hasProdsB = prodsB.length > 0;

        if (hasProdsA && !hasProdsB) return -1; 
        if (!hasProdsA && hasProdsB) return 1;  
        
        return catA.localeCompare(catB);
    }));
  }, [products, productCategories]);
  

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    setIsLoadingCompanySettings(true);
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getFirestoreDoc(docRef); 
      if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
      }
      toast({ title: "Company Settings Not Found", description: "Please configure company settings for printing.", variant: "default" });
      return null;
    } catch (error) {
      console.error("Error fetching company settings:", error);
      toast({ title: "Error", description: "Could not fetch company settings.", variant: "destructive" });
      return null;
    } finally {
      setIsLoadingCompanySettings(false);
    }
  };
  
  const calculateCustomerPrice = (product: Product, customer: Customer): number => {
    let finalPrice = product.price; 
    if (customer.specificMarkups && customer.specificMarkups.length > 0) {
      const specificRule = customer.specificMarkups.find(m => m.categoryName === product.category);
      const allCategoriesRule = customer.specificMarkups.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);

      if (specificRule) {
        finalPrice = product.cost * (1 + specificRule.markupPercentage / 100);
      } else if (allCategoriesRule) {
        finalPrice = product.cost * (1 + allCategoriesRule.markupPercentage / 100);
      }
    }
    return parseFloat(finalPrice.toFixed(2));
  };

  const handlePrintPriceSheetAction = async (selectedCategories: string[]) => {
    if (selectedCategories.length === 0) {
      toast({ title: "No Categories Selected", description: "Please select at least one category to print.", variant: "default" });
      setIsSelectCategoriesDialogOpen(false);
      return;
    }
    setIsLoadingCompanySettings(true);
    const settings = await fetchCompanySettings();
    setIsLoadingCompanySettings(false);

    if (settings) {
      let productsWithCorrectPrices = products;
      
      if(customerForPrinting) {
        productsWithCorrectPrices = products.map(p => ({
          ...p,
          price: calculateCustomerPrice(p, customerForPrinting)
        }));
      }

      const productsToPrint = productsWithCorrectPrices.filter(p => selectedCategories.includes(p.category));

      if (productsToPrint.length === 0) {
        toast({ title: "No Products in Selected Categories", description: "No products found in the chosen categories to print.", variant: "default" });
        setIsSelectCategoriesDialogOpen(false);
        setCustomerForPrinting(null); 
        return;
      }

      const filteredGroupedProducts = new Map<string, Product[]>();
      selectedCategories.forEach(categoryName => {
        const categoryProducts = productsToPrint.filter(p => p.category === categoryName);
        if (categoryProducts.length > 0) {
          filteredGroupedProducts.set(categoryName, categoryProducts);
        }
      });
      
      setCompanySettingsForPrinting(settings);
      setProductsForPrinting(filteredGroupedProducts); 

      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Price Sheet</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; font-size: 10pt !important; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } .print-only table { page-break-inside: auto; } .print-only tr { page-break-inside: avoid; page-break-after: auto; } .print-only thead { display: table-header-group; } } </style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { 
              win.print(); 
              win.close(); 
              setProductsForPrinting(null);
              setCompanySettingsForPrinting(null);
              setCustomerForPrinting(null);
            }, 750); 
          } else {
            toast({ title: "Print Error", description: "Popup blocked. Please allow popups for this site.", variant: "destructive" });
            setProductsForPrinting(null);
            setCompanySettingsForPrinting(null);
            setCustomerForPrinting(null);
          }
        } else {
          toast({ title: "Print Error", description: "Printable content not found.", variant: "destructive" });
          setProductsForPrinting(null);
          setCompanySettingsForPrinting(null);
          setCustomerForPrinting(null);
        }
      }, 100);

    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
    }
    setIsSelectCategoriesDialogOpen(false); 
  };
  
  const handleCustomerSelectedForPrinting = (customer: Customer) => {
    setCustomerForPrinting(customer);
    setIsCustomerSelectDialogOpen(false);
    setIsSelectCategoriesDialogOpen(true);
  };
  
  const handleOpenStandardPriceSheet = () => {
    setCustomerForPrinting(null);
    setIsSelectCategoriesDialogOpen(true);
  }

  const handleOpenStockUpdateDialog = (product: Product) => {
    setProductForStockUpdate(product);
    setNewStockQuantity(String(product.quantityInStock || 0));
    setIsStockUpdateDialogOpen(true);
  };
  
  const handleUpdateStock = async () => {
    if (!productForStockUpdate) return;
  
    const newQuantity = parseInt(newStockQuantity, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({ title: "Invalid Quantity", description: "Stock quantity must be a non-negative number.", variant: "destructive" });
      return;
    }
  
    setIsLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
          const productRef = doc(db, 'products', productForStockUpdate.id);
          transaction.update(productRef, { quantityInStock: newQuantity });
      });
      toast({
        title: "Stock Updated",
        description: `Stock for ${productForStockUpdate.name} has been set to ${newQuantity}.`
      });
      setIsStockUpdateDialogOpen(false);
      setProductForStockUpdate(null);
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({ title: "Error", description: "Could not update stock quantity.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && products.length === 0) { 
    return (
      <PageHeader title="Products" description="Loading product inventory...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  const absoluteLogoUrl = typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png";

  return (
    <>
      <PageHeader title="Products" description="Manage your product inventory.">
        <div className="flex flex-wrap gap-2">
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
          <Button variant="outline" onClick={handleOpenStandardPriceSheet} disabled={isLoading || products.length === 0 || isLoadingCompanySettings}>
            <Icon name="Printer" className="mr-2 h-4 w-4" />
            Print Price Sheet
          </Button>
           <Button variant="outline" onClick={() => setIsCustomerSelectDialogOpen(true)} disabled={isLoading || products.length === 0 || isLoadingCompanySettings || isLoadingCustomers}>
            <Icon name="Users" className="mr-2 h-4 w-4" />
            Print Customer Price Sheet
          </Button>
           <ProductDialog 
            triggerButton={
              <Button disabled={isLoading}>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            }
            onSave={handleSaveProduct}
            allProducts={products}
            productCategories={productCategories}
            onAddNewCategory={handleAddNewCategory}
            productSubcategories={productSubcategories}
            onAddNewSubcategory={handleAddNewSubcategory}
          />
          <BulkAddProductsDialog
            triggerButton={
              <Button variant="secondary" disabled={isLoading}>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Bulk Add Products
              </Button>
            }
            onSave={handleSaveMultipleProducts}
            productCategories={productCategories}
          />
        </div>
      </PageHeader>
      <ProductTable 
        groupedProducts={groupedProducts} 
        allProducts={products}
        onSave={handleSaveProduct} 
        onDelete={handleDeleteProduct}
        productCategories={productCategories}
        onAddNewCategory={handleAddNewCategory}
        productSubcategories={productSubcategories}
        onAddNewSubcategory={handleAddNewSubcategory}
        isLoading={isLoading}
        onApplyCategoryMarkup={handleApplyCategoryMarkup}
        onDeleteCategory={handleDeleteCategory}
        onUpdateStock={handleOpenStockUpdateDialog}
        onBulkUpdate={handleBulkUpdateProducts}
        onBulkStockUpdate={handleBulkStockUpdate}
      />
       {groupedProducts.size === 0 && !isLoading && (
        <p className="p-4 text-center text-muted-foreground">
          No products found. Try adding one or importing a CSV.
        </p>
      )}

      <Dialog open={isCustomerSelectDialogOpen} onOpenChange={setIsCustomerSelectDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Select a Customer</DialogTitle>
                <DialogDescription>Choose a customer to generate their specific price sheet.</DialogDescription>
            </DialogHeader>
            <Command>
              <CommandInput placeholder="Search customer..." />
              <CommandList>
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => {
                    const displayName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
                    return (
                      <CommandItem
                        value={displayName}
                        key={customer.id}
                        onSelect={() => handleCustomerSelectedForPrinting(customer)}
                      >
                        {displayName}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
        </DialogContent>
      </Dialog>
      
      {isSelectCategoriesDialogOpen && (
        <SelectCategoriesDialog
          isOpen={isSelectCategoriesDialogOpen}
          onOpenChange={(open) => {
            setIsSelectCategoriesDialogOpen(open);
            if(!open) setCustomerForPrinting(null); // Reset customer if dialog is closed
          }}
          allCategories={productCategories}
          onSubmit={handlePrintPriceSheetAction}
        />
      )}

      {isStockUpdateDialogOpen && productForStockUpdate && (
        <Dialog open={isStockUpdateDialogOpen} onOpenChange={setIsStockUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock for: {productForStockUpdate.name}</DialogTitle>
              <DialogDescription>Set the new quantity in stock for this product.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="stock-quantity">New Quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                value={newStockQuantity}
                onChange={(e) => setNewStockQuantity(e.target.value)}
                placeholder="Enter new stock count"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockUpdateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateStock} disabled={isLoading}>Update Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div style={{ display: 'none' }}>
        {(productsForPrinting && companySettingsForPrinting) && (
          <PrintablePriceSheet
            ref={printRef}
            groupedProducts={productsForPrinting}
            companySettings={companySettingsForPrinting}
            logoUrl={absoluteLogoUrl}
            customerName={customerForPrinting?.companyName || (customerForPrinting ? `${customerForPrinting.firstName} ${customerForPrinting.lastName}`: undefined)}
          />
        )}
      </div>

       {(isLoadingCompanySettings && (isSelectCategoriesDialogOpen || isCustomerSelectDialogOpen)) && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-white" />
            <p className="ml-2 text-white">Preparing...</p>
        </div>
      )}
    </>
  );
}
