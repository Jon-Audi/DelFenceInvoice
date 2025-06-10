
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Icon } from '@/components/icons';

interface SelectCategoriesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allCategories: string[];
  onSubmit: (selectedCategories: string[]) => void;
}

export function SelectCategoriesDialog({
  isOpen,
  onOpenChange,
  allCategories,
  onSubmit,
}: SelectCategoriesDialogProps) {
  const [selectedCategoriesMap, setSelectedCategoriesMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize all categories as selected when the dialog opens or categories change
    if (isOpen) {
      const initialSelection = allCategories.reduce((acc, category) => {
        acc[category] = true; // Default to all selected
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedCategoriesMap(initialSelection);
    }
  }, [isOpen, allCategories]);

  const handleSelectionChange = (category: string, checked: boolean) => {
    setSelectedCategoriesMap(prev => ({ ...prev, [category]: checked }));
  };

  const handleSelectAll = () => {
    const newSelection = { ...selectedCategoriesMap };
    for (const category in newSelection) {
      newSelection[category] = true;
    }
    setSelectedCategoriesMap(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = { ...selectedCategoriesMap };
    for (const category in newSelection) {
      newSelection[category] = false;
    }
    setSelectedCategoriesMap(newSelection);
  };

  const handleSubmit = () => {
    const selected = Object.entries(selectedCategoriesMap)
      .filter(([, isSelected]) => isSelected)
      .map(([category]) => category);
    onSubmit(selected);
  };

  const someSelected = Object.values(selectedCategoriesMap).some(val => val);
  const allSelected = Object.values(selectedCategoriesMap).every(val => val) && Object.values(selectedCategoriesMap).length > 0;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Categories to Print</DialogTitle>
          <DialogDescription>
            Choose which product categories you want to include on the price sheet.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <Button variant="link" onClick={handleSelectAll} disabled={allSelected}>
              Select All
            </Button>
            <Button variant="link" onClick={handleDeselectAll} disabled={!someSelected}>
              Deselect All
            </Button>
          </div>
          {allCategories.length > 0 ? (
            <ScrollArea className="h-[250px] w-full rounded-md border p-4">
              <div className="space-y-2">
                {allCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategoriesMap[category] || false}
                      onCheckedChange={(checked) => handleSelectionChange(category, !!checked)}
                    />
                    <Label htmlFor={`category-${category}`} className="font-normal cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No product categories available.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={!someSelected}>
            <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
