
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
import { Badge } from '@/components/ui/badge';
import { ProductDialog } from './product-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";


interface ProductTableProps {
  products: Product[];
  onSave: (product: Product) => void;
}

export function ProductTable({ products, onSave }: ProductTableProps) {
  const { toast } = useToast();

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleDeleteProduct = (productId: string) => {
    console.log("Attempting to delete product:", productId);
    // In a real app, this would involve an API call and updating state based on response.
    // For now, we'll just show a toast.
    // To actually remove, the products state would need to be managed in the parent page
    // and a delete handler passed down. This onSave prop is for add/edit.
    toast({
      title: "Delete (Simulation)",
      description: `Product with ID ${productId} would be deleted. Actual deletion not implemented in mock.`,
      variant: "default"
    });
  };


  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Markup</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
              <TableCell>{product.unit}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
              <TableCell className="text-right">
                {typeof product.markupPercentage === 'number' && !isNaN(product.markupPercentage)
                  ? `${product.markupPercentage.toFixed(2)}%`
                  : 'N/A'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Icon name="MoreHorizontal" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ProductDialog 
                      product={product}
                      triggerButton={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      }
                      onSave={onSave} 
                    />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
