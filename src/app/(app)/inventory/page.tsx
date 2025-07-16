
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false);
  const [productForStockUpdate, setProductForStockUpdate] = useState<Product | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        const productData = docSnap.data() as Omit<Product, 'id'>;
        fetchedProducts.push({ ...productData, id: docSnap.id });
      });
      setProducts(fetchedProducts.sort((a,b) => a.name.localeCompare(b.name)));
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
  
    setIsLoading(true); // You might want a more granular loading state for this operation
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
        {/* Actions like bulk update could go here in the future */}
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
    </>
  );
}
