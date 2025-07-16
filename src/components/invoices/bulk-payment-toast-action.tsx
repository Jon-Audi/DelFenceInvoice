
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';

interface BulkPaymentToastActionProps {
  onPrint: () => void;
}

export const BulkPaymentToastAction: React.FC<BulkPaymentToastActionProps> = ({ onPrint }) => {
  return (
    <ToastAction asChild altText="Print Receipt">
      <Button variant="secondary" size="sm" onClick={onPrint}>
        Print Receipt
      </Button>
    </ToastAction>
  );
};
