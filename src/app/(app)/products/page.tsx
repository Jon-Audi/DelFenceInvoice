import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { ProductTable } from '@/components/products/product-table';
import { ProductDialog } from '@/components/products/product-dialog';
import type { Product } from '@/types';

// Mock data for products
const mockProducts: Product[] = [
  { id: 'prod_1', name: '6ft Cedar Picket', category: 'Fencing', unit: 'piece', price: 3.50, cost: 2.00, markupPercentage: 75, description: 'Standard cedar fence picket' },
  { id: 'prod_2', name: '4x4x8 Pressure Treated Post', category: 'Posts', unit: 'piece', price: 12.00, cost: 8.00, markupPercentage: 50, description: 'Ground contact rated post' },
  { id: 'prod_3', name: 'Vinyl Gate Kit', category: 'Gates', unit: 'kit', price: 150.00, cost: 100.00, markupPercentage: 50, description: 'Complete vinyl gate kit' },
  { id: 'prod_4', name: 'Stainless Steel Hinges', category: 'Hardware', unit: 'pair', price: 25.00, cost: 15.00, markupPercentage: 66.67, description: 'Heavy duty gate hinges' },
];

export default function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="Manage your product inventory.">
        <div className="flex gap-2">
          <Button variant="outline">
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <ProductDialog triggerButton={
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          } />
        </div>
      </PageHeader>
      <ProductTable products={mockProducts} />
    </>
  );
}
