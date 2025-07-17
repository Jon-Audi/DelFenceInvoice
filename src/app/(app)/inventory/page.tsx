
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import type { Product } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PrintableInventorySheet } from '@/components/inventory/printable-inventory-sheet';
import { PrintableStockValuationSheet } from '@/components/inventory/printable-stock-valuation-sheet';
import { SelectCategoriesDialog } from '@/components/products/select-categories-dialog';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false);
  const [productForStockUpdate, setProductForStockUpdate] = useState<Product | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState<string>('');
  
  const [isSelectCategoriesDialogOpen, setIsSelectCategoriesDialogOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'countSheet' | 'valuationSheet' | null>(null);
  const [productsForPrinting, setProductsForPrinting] = useState<Product[] | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categoriesFromDb = new Set<string>();
      snapshot.forEach((docSnap) => {
        const productData = docSnap.data() as Omit<Product, 'id'>;
        fetchedProducts.push({ ...productData, id: docSnap.id });
        if (productData.category) {
            categoriesFromDb.add(productData.category);
        }
      });
      setProducts(fetchedProducts.sort((a,b) => a.name.localeCompare(b.name)));
      setProductCategories(Array.from(categoriesFromDb).sort());
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products for inventory:", error);
      toast({
        title: "Error",
        description: "Could not fetch products from database.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return products.filter(product => {
      const name = product.name.toLowerCase();
      const category = product.category?.toLowerCase() || '';
      return name.includes(lowercasedFilter) || category.includes(lowercasedFilter);
    });
  }, [products, searchTerm]);

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
      const productRef = doc(db, 'products', productForStockUpdate.id);
      await setDoc(productRef, { quantityInStock: newQuantity }, { merge: true });
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
  
  const handlePrintRequest = (selectedCategories: string[]) => {
     if (selectedCategories.length === 0) {
      toast({ title: "No Categories Selected", description: "Please select at least one category to print.", variant: "default" });
      setIsSelectCategoriesDialogOpen(false);
      return;
    }
    
    const productsToPrint = products.filter(p => selectedCategories.includes(p.category));

    if (productsToPrint.length === 0) {
      toast({ title: "No Products Found", description: "No products in the selected categories to print.", variant: "default" });
      setIsSelectCategoriesDialogOpen(false);
      return;
    }
    
    setProductsForPrinting(productsToPrint);

    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const title = printMode === 'valuationSheet' ? 'Stock Valuation' : 'Inventory Count Sheet';
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>${title}</title>
                <style>
                  body { font-family: sans-serif; margin: 2rem; }
                  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; page-break-inside: avoid; }
                  th { background-color: #f2f2f2; }
                  h1, h2 { text-align: center; }
                  tfoot { display: table-footer-group; }
                  @page { size: auto; margin: 25mm; }
                  section { page-break-after: always; }
                  section:last-child { page-break-after: avoid; }
                </style>
              </head>
              <body>
                ${printContents}
              </body>
            </html>
          `);
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 250);
        } else {
          toast({ title: "Print Error", description: "Could not open print window. Please check your browser's popup blocker.", variant: "destructive" });
        }
      }
      setProductsForPrinting(null);
      setPrintMode(null);
    }, 100);

    setIsSelectCategoriesDialogOpen(false);
  };
  
  const handleOpenPrintDialog = (mode: 'countSheet' | 'valuationSheet') => {
    setPrintMode(mode);
    setIsSelectCategoriesDialogOpen(true);
  };

  if (isLoading && products.length === 0) {
    return (
      <PageHeader title="Inventory Management" description="Loading product inventory...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Inventory Management" description="View and update product stock levels.">
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenPrintDialog('countSheet')} disabled={isLoading || products.length === 0}>
                <Icon name="Printer" className="mr-2 h-4 w-4" />
                Print Count Sheet
            </Button>
            <Button variant="outline" onClick={() => handleOpenPrintDialog('valuationSheet')} disabled={isLoading || products.length === 0}>
                <Icon name="Calculator" className="mr-2 h-4 w-4" />
                Print Stock Valuation
            </Button>
        </div>
      </PageHeader>
      
      <div className="mb-4">
        <Input
          placeholder="Search by product name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <InventoryTable
        products={filteredProducts}
        onUpdateStock={handleOpenStockUpdateDialog}
        isLoading={isLoading}
      />

      {filteredProducts.length === 0 && !isLoading && (
        <p className="p-4 text-center text-muted-foreground">
          {searchTerm ? "No products match your search." : "No products found."}
        </p>
      )}

      {isStockUpdateDialogOpen && productForStockUpdate && (
        <Dialog open={isStockUpdateDialogOpen} onOpenChange={setIsStockUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock for: {productForStockUpdate.name}</DialogTitle>
              <DialogDescription>Set the new quantity in stock for this product. This is a manual override and does not affect past orders.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="stock-quantity">New Quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                value={newStockQuantity}
                onChange={(e) => setNewStockQuantity(e.target.value)}
                placeholder="Enter new stock count"
                min="0"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockUpdateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateStock} disabled={isLoading}>Update Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isSelectCategoriesDialogOpen && (
        <SelectCategoriesDialog
          isOpen={isSelectCategoriesDialogOpen}
          onOpenChange={setIsSelectCategoriesDialogOpen}
          allCategories={productCategories}
          onSubmit={handlePrintRequest}
        />
      )}

      <div style={{ display: 'none' }}>
        {productsForPrinting && printMode === 'countSheet' && <PrintableInventorySheet ref={printRef} products={productsForPrinting} />}
        {productsForPrinting && printMode === 'valuationSheet' && <PrintableStockValuationSheet ref={printRef} products={productsForPrinting} />}
      </div>
    </>
  );
}
