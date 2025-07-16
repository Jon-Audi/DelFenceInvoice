
"use client";

import type { Product } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryTableProps {
  products: Product[];
  onUpdateStock: (product: Product) => void;
  isLoading: boolean;
}

export function InventoryTable({ products, onUpdateStock, isLoading }: InventoryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border shadow-sm p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Current Stock</TableHead>
            <TableHead className="w-[120px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell className="text-right font-semibold">{product.quantityInStock ?? 0}</TableCell>
              <TableCell className="text-center">
                <Button variant="outline" size="sm" onClick={() => onUpdateStock(product)}>
                  <Icon name="Edit" className="mr-2 h-4 w-4" />
                  Update
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
