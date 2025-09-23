
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateInvoiceEmailDraft } from "@/ai/flows/invoice-email-draft";
import type {
  Invoice,
  Customer,
  Product,
  Estimate,
  Order,
  CompanySettings,
  EmailContact,
  Payment,
  BulkPaymentReceiptData,
} from "@/types";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import type { InvoiceFormData } from "@/components/invoices/invoice-form";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  doc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { PrintableInvoice } from "@/components/invoices/printable-invoice";
import { PrintableInvoicePackingSlip } from "@/components/invoices/printable-invoice-packing-slip";
import { LineItemsViewerDialog } from "@/components/shared/line-items-viewer-dialog";
import { BulkPaymentDialog } from "@/components/invoices/bulk-payment-dialog";
import { PrintableBulkPaymentReceipt } from "@/components/invoices/printable-bulk-payment-receipt";
import { BulkPaymentToastAction } from "@/components/invoices/bulk-payment-toast-action";

const COMPANY_SETTINGS_DOC_ID = "main";

type SortableInvoiceKeys =
  | "invoiceNumber"
  | "customerName"
  | "poNumber"
  | "date"
  | "dueDate"
  | "total"
  | "amountPaid"
  | "balanceDue"
  | "status";

export default function InvoicesPage() {
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stableProductCategories, setStableProductCategories] = useState<string[]>([]);

  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [targetCustomerForEmail, setTargetCustomerForEmail] = useState<Customer | null>(null);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]);
  const [additionalRecipientEmail, setAdditionalRecipientEmail] = useState<string>("");

  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>("");
  const [editableBody, setEditableBody] = useState<string>("");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  const [isConvertingInvoice, setIsConvertingInvoice] = useState(false);
  const [conversionInvoiceData, setConversionInvoiceData] =
    useState<Partial<InvoiceFormData> & { lineItems: InvoiceFormData["lineItems"]; payments?: Payment[] } | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);
  const [packingSlipToPrintForInvoice, setPackingSlipToPrintForInvoice] = useState<any | null>(null);
  const [bulkPaymentReceiptToPrint, setBulkPaymentReceiptToPrint] = useState<BulkPaymentReceiptData | null>(null);
  const [isBulkPaymentDialogOpen, setIsBulkPaymentDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortableInvoiceKeys; direction: "asc" | "desc" }>({
    key: "date",
    direction: "desc",
  });

  const [invoiceForViewingItems, setInvoiceForViewingItems] = useState<Invoice | null>(null);
  const [isLineItemsViewerOpen, setIsLineItemsViewerOpen] = useState(false);

  useEffect(() => setIsClient(true), []);

  // Handle "convert estimate/order to invoice" handoff from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
  
    const pendingEstimateRaw = localStorage.getItem("estimateToConvert_invoice");
    const pendingOrderRaw = localStorage.getItem("orderToConvert_invoice");
    let newInvoiceData:
      | (Partial<InvoiceFormData> & { lineItems: InvoiceFormData["lineItems"]; payments?: Payment[] })
      | null = null;

    if (pendingEstimateRaw) {
      try {
        const estimateToConvert = JSON.parse(pendingEstimateRaw) as Estimate;
        newInvoiceData = {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`,
          customerId: estimateToConvert.customerId,
          date: new Date(),
          status: "Draft",
          poNumber: estimateToConvert.poNumber || "",
          lineItems: estimateToConvert.lineItems.map((li) => ({
            id: li.id,
            productId: li.productId,
            productName: li.productName,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            isReturn: li.isReturn || false,
            isNonStock: li.isNonStock || false,
            addToProductList: li.addToProductList ?? false,
          })),
          notes: estimateToConvert.notes || "",
          paymentTerms: "Due upon receipt",
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          payments: [],
        };
        localStorage.removeItem("estimateToConvert_invoice");
      } catch (e) {
        console.error("Error processing estimate for invoice conversion:", e);
        toast({ title: "Conversion Error", description: "Could not process estimate data for invoice.", variant: "destructive" });
        localStorage.removeItem("estimateToConvert_invoice");
      }
    } else if (pendingOrderRaw) {
      try {
        const orderToConvert = JSON.parse(pendingOrderRaw) as Order;
        newInvoiceData = {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`,
          customerId: orderToConvert.customerId,
          date: new Date(),
          status: "Draft",
          poNumber: orderToConvert.poNumber || "",
          lineItems: orderToConvert.lineItems.map((li) => ({
            id: li.id,
            productId: li.productId,
            productName: li.productName,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            isReturn: li.isReturn || false,
            isNonStock: li.isNonStock || false,
            addToProductList: li.addToProductList ?? false,
          })),
          notes: `Converted from Order #${orderToConvert.orderNumber}. ${orderToConvert.notes || ""}`.trim(),
          paymentTerms: "Due upon receipt",
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          payments: orderToConvert.payments?.map((p) => ({ ...p, date: p.date })) || [],
        };
        localStorage.removeItem("orderToConvert_invoice");
      } catch (e) {
        console.error("Error processing order for invoice conversion:", e);
        toast({ title: "Conversion Error", description: "Could not process order data for invoice.", variant: "destructive" });
        localStorage.removeItem("orderToConvert_invoice");
      }
    }

    if (newInvoiceData) setConversionInvoiceData(newInvoiceData);
  }, [toast]);

  useEffect(() => {
    if (conversionInvoiceData && !isLoadingProducts && !isLoadingCustomers) {
      setIsConvertingInvoice(true);
    }
  }, [conversionInvoiceData, isLoadingProducts, isLoadingCustomers]);

  // Live data
  useEffect(() => {
    setIsLoadingInvoices(true);
    const unsub = onSnapshot(
      collection(db, "invoices"),
      (snapshot) => {
        const fetched: Invoice[] = [];
        snapshot.forEach((s) => {
          const data = s.data() as any;
          fetched.push({
            ...(data as Omit<Invoice, "id" | "total" | "amountPaid" | "balanceDue">),
            id: s.id,
            total: data.total || 0,
            amountPaid: data.amountPaid || 0,
            balanceDue:
              data.balanceDue !== undefined ? data.balanceDue : (data.total || 0) - (data.amountPaid || 0),
            payments: data.payments || [],
            poNumber: data.poNumber || undefined,
          });
        });
        setInvoices(fetched);
        setIsLoadingInvoices(false);
      },
      (err) => {
        console.error("Error fetching invoices:", err);
        toast({ title: "Error", description: "Could not fetch invoices.", variant: "destructive" });
        setIsLoadingInvoices(false);
      }
    );
    return () => unsub();
  }, [toast]);

  useEffect(() => {
    setIsLoadingCustomers(true);
    const unsub = onSnapshot(
      collection(db, "customers"),
      (snapshot) => {
        const fetched: Customer[] = [];
        snapshot.forEach((s) => fetched.push({ ...(s.data() as Omit<Customer, "id">), id: s.id }));
        setCustomers(fetched);
        setIsLoadingCustomers(false);
      },
      (err) => {
        console.error("Error fetching customers:", err);
        toast({ title: "Error", description: "Could not fetch customers for invoices.", variant: "destructive" });
        setIsLoadingCustomers(false);
      }
    );
    return () => unsub();
  }, [toast]);

  useEffect(() => {
    setIsLoadingProducts(true);
    const unsub = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const fetched: Product[] = [];
        snapshot.forEach((s) => fetched.push({ ...(s.data() as Omit<Product, "id">), id: s.id }));
        setProducts(fetched);
        setIsLoadingProducts(false);
      },
      (err) => {
        console.error("Error fetching products:", err);
        toast({ title: "Error", description: "Could not fetch products for invoices.", variant: "destructive" });
        setIsLoadingProducts(false);
      }
    );
    return () => unsub();
  }, [toast]);

  useEffect(() => {
    if (products?.length) {
      const next = Array.from(new Set(products.map((p) => p.category))).sort();
      setStableProductCategories((curr) => (JSON.stringify(next) !== JSON.stringify(curr) ? next : curr));
    } else {
      setStableProductCategories((curr) => (curr.length ? [] : curr));
    }
  }, [products]);

  // ---------- SAVE INVOICE (transaction-safe) ----------
  const handleSaveInvoice = async (invoiceToSave: Invoice) => {
    try {
      await runTransaction(db, async (transaction) => {
        const hasId = Boolean(invoiceToSave.id);
        const invoiceRef = hasId ? doc(db, "invoices", invoiceToSave.id!) : doc(collection(db, "invoices"));

        // Prepare write data (strip id)
        const { id: _ignore, ...invoiceDataFromDialog } = invoiceToSave;

        // PHASE 1: READS ONLY
        let originalInvoice: Invoice | null = null;
        if (hasId) {
          const originalSnap = await transaction.get(invoiceRef);
          if (originalSnap.exists()) {
            originalInvoice = { id: invoiceToSave.id!, ...(originalSnap.data() as any) } as Invoice;
          }
        }

        // Get a map of product IDs that currently exist.
        const productIdsInState = new Set(products.map(p => p.id));
        const inventoryChanges = new Map<string, number>();

        if (originalInvoice) {
            for (const item of originalInvoice.lineItems || []) {
                if (item.productId && !item.isNonStock && productIdsInState.has(item.productId)) {
                    const delta = item.isReturn ? -item.quantity : item.quantity;
                    inventoryChanges.set(item.productId, (inventoryChanges.get(item.productId) || 0) + delta);
                }
            }
        }

        for (const item of invoiceDataFromDialog.lineItems || []) {
            if (item.productId && !item.isNonStock && productIdsInState.has(item.productId)) {
                const delta = item.isReturn ? item.quantity : -item.quantity;
                inventoryChanges.set(item.productId, (inventoryChanges.get(item.productId) || 0) + delta);
            }
        }

        const productIds = Array.from(inventoryChanges.keys());
        const productSnaps: { id: string; snap: any }[] = [];
        if (productIds.length) {
          const refs = productIds.map((pid) => doc(db, "products", pid));
          const snaps = await Promise.all(refs.map((r) => transaction.get(r)));
          snaps.forEach((snap, i) => productSnaps.push({ id: refs[i].id, snap }));
        }

        // Validate reads
        for (const { id, snap } of productSnaps) {
          if (!snap.exists()) throw new Error(`Product with ID ${id} not found during transaction.`);
        }

        // PHASE 2: WRITES ONLY
        for (const { id, snap } of productSnaps) {
          const qtyChange = inventoryChanges.get(id) ?? 0;
          if (!qtyChange) continue;
          const currentStock = (snap.data() as any)?.quantityInStock ?? 0;
          transaction.update(snap.ref, { quantityInStock: currentStock + qtyChange });
        }

        transaction.set(invoiceRef, invoiceDataFromDialog, hasId ? { merge: true } : {});
      });

      toast({
        title: invoiceToSave.id ? "Invoice Updated" : "Invoice Added",
        description: `Invoice ${invoiceToSave.invoiceNumber} and stock levels have been updated.`,
      });
    } catch (error: any) {
      console.error("Error saving invoice in transaction:", error);
      toast({
        title: "Error Saving Invoice",
        description: `Could not save invoice: ${error.message}`,
        variant: "destructive",
        duration: 8000,
      });
    }

    if (isConvertingInvoice) {
      setIsConvertingInvoice(false);
      setConversionInvoiceData(null);
    }
  };

  // Save a product created inline from the invoice dialog
  const handleSaveProduct = async (productToSave: Omit<Product, "id">): Promise<string | void> => {
    try {
      const docRef = await addDoc(collection(db, "products"), productToSave);
      toast({
        title: "Product Added",
        description: `Product ${productToSave.name} has been added to the product list.`,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving new product from invoice:", error);
      toast({
        title: "Error Saving Product",
        description: "Could not save the new item to the product list.",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveCustomerWrapper = (c: Omit<Customer, "id"> & { id?: string; }) => {
    const id = c.id ?? "";
    const fullCustomer: Customer = { ...c, id: id } as Customer;
    // fire-and-forget to match the `()=>void` prop type
    void handleSaveCustomer(fullCustomer).catch(err => {
      console.error("Failed to save customer from invoice dialog:", err);
      toast({ title: "Error", description: "Could not save customer.", variant: "destructive" });
    });
  };

  const handleSaveCustomer = async (customerToSave: Customer): Promise<string | void> => {
    const { id, ...customerData } = customerToSave;
    try {
      if (id && customers.some(c => c.id === id)) {
        const customerRef = doc(db, 'customers', id);
        await runTransaction(db, async (transaction) => {
            transaction.set(customerRef, customerData, { merge: true });
        });
        toast({ title: "Customer Updated", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.` });
        return id;
      } else {
        const dataToSave = { ...customerData, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'customers'), dataToSave);
        toast({ title: "Customer Added", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added.` });
        return docRef.id;
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save customer to database.", variant: "destructive" });
    }
  };


  // ---------- BULK PAYMENT (transaction-safe) ----------
  const handleBulkPaymentSave = async (
    customerId: string,
    paymentDetails: Omit<Payment, "id" | "amount"> & { amount: number },
    invoiceIdsToPay: string[]
  ) => {
    let affectedInvoicesData: { invoiceNumber: string; amountApplied: number }[] = [];

    try {
      await runTransaction(db, async (transaction) => {
        let remaining = paymentDetails.amount;
        affectedInvoicesData = [];

        // READS: fetch all invoices by id via transaction.get BEFORE writes
        const refs = invoiceIdsToPay.map((id) => doc(db, "invoices", id));
        const snaps = await Promise.all(refs.map((r) => transaction.get(r)));
        const docs = snaps
          .filter((s) => s.exists())
          .map((s) => ({ snap: s, data: s.data() as Invoice }));

        // oldest first
        docs.sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime());

        // WRITES
        for (const { snap, data: invoice } of docs) {
          if (remaining <= 0) break;
          if (invoice.customerId !== customerId) continue;

          const paid = invoice.amountPaid ?? 0;
          const total = invoice.total ?? 0;
          const balanceDue = invoice.balanceDue ?? total - paid;
          if (balanceDue <= 0) continue;

          const amountToApply = Math.min(remaining, balanceDue);
          const newPayment: Payment = {
            id: crypto.randomUUID(),
            date: paymentDetails.date,
            amount: amountToApply,
            method: paymentDetails.method,
            notes: paymentDetails.notes
              ? `${paymentDetails.notes} (Applied from bulk payment)`
              : "Bulk payment application",
          };

          const newAmountPaid = paid + amountToApply;
          const newBalanceDue = Math.max(0, total - newAmountPaid);
          const newStatus: Invoice["status"] = newBalanceDue <= 0.005 ? "Paid" : "Partially Paid";

          transaction.update(snap.ref, {
            payments: [...(invoice.payments || []), newPayment],
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
          });

          affectedInvoicesData.push({ invoiceNumber: invoice.invoiceNumber, amountApplied: amountToApply });
          remaining -= amountToApply;
        }

        if (remaining > 0.01) {
          throw new Error(
            `$${remaining.toFixed(
              2
            )} of the payment could not be applied. Please check invoice balances. No changes were saved.`
          );
        }
      });

      const customer = customers.find((c) => c.id === customerId);
      const receiptData: BulkPaymentReceiptData = {
        paymentDetails: { ...paymentDetails, id: crypto.randomUUID() },
        customerName: customer?.companyName || `${customer?.firstName} ${customer?.lastName}` || "N/A",
        affectedInvoices: affectedInvoicesData,
        companySettings: (await fetchCompanySettings())!,
        logoUrl: typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png",
      };

      toast({
        title: "Bulk Payment Successful",
        description: `Payment of $${paymentDetails.amount.toFixed(2)} applied successfully.`,
        action: <BulkPaymentToastAction onPrint={() => handlePrepareAndPrintBulkReceipt(receiptData)} />,
      });
      setIsBulkPaymentDialogOpen(false);
    } catch (error: any) {
      console.error("Error during bulk payment:", error);
      toast({
        title: "Bulk Payment Failed",
        description: error.message || "Could not apply payments. The transaction was rolled back.",
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  // Printing helpers
  const handlePrepareAndPrintBulkReceipt = (receiptData: BulkPaymentReceiptData) => {
    setBulkPaymentReceiptToPrint(receiptData);
    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const win = window.open("", "_blank");
        if (win) {
          win.document.write("<html><head><title>Print Bulk Payment Receipt</title>");
          win.document.write(
            '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">'
          );
          win.document.write(
            "<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>"
          );
          win.document.write("</head><body>");
          win.document.write(printContents);
          win.document.write("</body></html>");
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 750);
        } else {
          toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
        }
      }
      setBulkPaymentReceiptToPrint(null);
    }, 100);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      toast({ title: "Invoice Deleted", description: "The invoice has been removed." });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({ title: "Error", description: "Could not delete invoice.", variant: "destructive" });
    }
  };

  // Keep signature compatible with InvoiceTable (and also accept Date for safety)
  const formatDate = (dateInput: string | Date | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateInput) return "N/A";
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (!isClient) return d.toISOString().split("T")[0];
    return d.toLocaleDateString(undefined, options);
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    try {
      const docRef = doc(db, "companySettings", COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return docSnap.data() as CompanySettings;
      toast({
        title: "Company Settings Not Found",
        description: "Please configure company settings for printing.",
        variant: "default",
      });
      return null;
    } catch (error) {
      console.error("Error fetching company settings:", error);
      toast({ title: "Error", description: "Could not fetch company settings.", variant: "destructive" });
      return null;
    }
  };

  const handlePrepareAndPrintInvoice = async (invoice: Invoice) => {
    const settings = await fetchCompanySettings();
    if (!settings) {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
      return;
    }

    setInvoiceToPrint({
      invoice,
      companySettings: settings,
      logoUrl: typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png",
    });
    setPackingSlipToPrintForInvoice(null);

    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const win = window.open("", "_blank");
        if (win) {
          win.document.write("<html><head><title>Print Invoice</title>");
          win.document.write(
            '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">'
          );
          win.document.write(
            "<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>"
          );
          win.document.write("</head><body>");
          win.document.write(printContents);
          win.document.write("</body></html>");
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 750);
        } else {
          toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
        }
      }
      setInvoiceToPrint(null);
    }, 100);
  };

  const handlePrepareAndPrintInvoicePackingSlip = async (invoice: Invoice) => {
    const settings = await fetchCompanySettings();
    if (!settings) {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
      return;
    }

    setPackingSlipToPrintForInvoice({
      invoice,
      companySettings: settings,
      logoUrl: typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png",
    });
    setInvoiceToPrint(null);

    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const win = window.open("", "_blank");
        if (win) {
          win.document.write("<html><head><title>Print Packing Slip</title>");
          win.document.write(
            '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">'
          );
          win.document.write(
            "<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>"
          );
          win.document.write("</head><body>");
          win.document.write(printContents);
          win.document.write("</body></html>");
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 750);
        } else {
          toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
        }
      }
      setPackingSlipToPrintForInvoice(null);
    }, 100);
  };

  // Email
  const handleGenerateEmail = async (invoice: Invoice) => {
    setSelectedInvoiceForEmail(invoice);
    const customer = customers.find((c) => c.id === invoice.customerId);
    setTargetCustomerForEmail(customer || null);
    setSelectedRecipientEmails([]);
    setAdditionalRecipientEmail("");

    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject("");
    setEditableBody("");

    try {
      const customerDisplayName = customer
        ? customer.companyName || `${customer.firstName} ${customer.lastName}`
        : invoice.customerName || "Valued Customer";
      const customerCompanyName = customer?.companyName;

      const invoiceItemsDescription =
        invoice.lineItems
          .map(
            (item) =>
              `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(
                2
              )}, Total: $${item.total.toFixed(2)})`
          )
          .join("\n") || "Services/Products as per invoice.";

      const companyNameForDisplay = (await fetchCompanySettings())?.companyName || "Delaware Fence Pro";

      const result = await generateInvoiceEmailDraft({
        customerName: customerDisplayName,
        companyName: customerCompanyName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.date).toLocaleDateString(),
        invoiceTotal: invoice.total,
        invoiceItems: invoiceItemsDescription,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : undefined,
        companyNameToDisplay: companyNameForDisplay,
      });

      setEmailDraft({ subject: result.subject, body: result.body });
      setEditableSubject(result.subject);
      setEditableBody(result.body);
    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error generating subject", body: "Could not generate email content." });
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoiceForEmail || !editableSubject || !editableBody) {
      toast({ title: "Error", description: "Email content or invoice details missing.", variant: "destructive" });
      return;
    }

    const finalRecipients: { email: string; name: string }[] = [];
    if (targetCustomerForEmail?.emailContacts) {
      selectedRecipientEmails.forEach((sel) => {
        const contact = targetCustomerForEmail.emailContacts.find((ec) => ec.email === sel);
        if (contact) finalRecipients.push({ email: contact.email, name: contact.name || "" });
      });
    }
    if (additionalRecipientEmail.trim() !== "") {
      const addr = additionalRecipientEmail.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
        if (!finalRecipients.some((r) => r.email === addr)) finalRecipients.push({ email: addr, name: "" });
      } else {
        toast({ title: "Invalid Email", description: "The additional email address is not valid.", variant: "destructive" });
        return;
      }
    }

    if (finalRecipients.length === 0) {
      toast({ title: "No Recipients", description: "Please select or add at least one email recipient.", variant: "destructive" });
      return;
    }

    setIsLoadingEmail(true);
    try {
      await addDoc(collection(db, "emails"), {
        to: finalRecipients,
        subject: editableSubject,
        html: editableBody,
      });
      toast({
        title: "Email Queued",
        description: `Email for invoice ${selectedInvoiceForEmail.invoiceNumber} has been queued for sending.`,
      });
      setIsEmailModalOpen(false);
    } catch (error: any) {
      console.error("Error queueing email:", error);
      toast({
        title: "Email Queue Failed",
        description: error.message || "Could not queue the email. Check Firestore permissions and console.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };
  
  const handleSendToPacking = async (invoice: Invoice) => {
    if (invoice.status === 'Ordered') {
      toast({ title: 'Already in Packing', description: 'This invoice is already in a state to be packed.', variant: 'default' });
      return;
    }
    const updatedInvoice = { ...invoice, status: 'Ordered' as const };
    await handleSaveInvoice(updatedInvoice);
    toast({ title: 'Sent to Packing', description: `Invoice #${invoice.invoiceNumber} has been moved to packing.` });
  };


  // Sorting/search helpers
  const requestSort = (key: SortableInvoiceKeys) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    } else {
      direction =
        key === "date" || key === "dueDate" || key === "total" || key === "amountPaid" || key === "balanceDue"
          ? "desc"
          : "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredInvoices = useMemo(() => {
    let list = invoices.filter((invoice) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const fields = [invoice.invoiceNumber, invoice.customerName, invoice.poNumber, invoice.status];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    });

    if (sortConfig.key) {
      list.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Invoice] as any;
        const valB = b[sortConfig.key as keyof Invoice] as any;

        let cmp = 0;
        if (valA == null) cmp = 1;
        else if (valB == null) cmp = -1;
        else if (sortConfig.key === "date" || sortConfig.key === "dueDate") {
          cmp = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        } else if (typeof valA === "number" && typeof valB === "number") {
          cmp = valA - valB;
        } else {
          cmp = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }

        return sortConfig.direction === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [invoices, searchTerm, sortConfig]);

  const renderSortArrow = (columnKey: SortableInvoiceKeys) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? (
      <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" />
    ) : (
      <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />
    );
  };

  // Loading state
  if (isLoadingInvoices || isLoadingCustomers || isLoadingProducts) {
    return (
      <PageHeader title="Invoices" description="Loading invoices database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
    }

  // Render
  return (
    <>
      <PageHeader title="Invoices" description="Create and manage customer invoices.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setIsBulkPaymentDialogOpen(true)} disabled={isLoadingCustomers}>
            <Icon name="ClipboardList" className="mr-2 h-4 w-4" />
            Record Bulk Payment
          </Button>
          <InvoiceDialog
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            }
            onSave={handleSaveInvoice}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
          />
        </div>
      </PageHeader>

      <BulkPaymentDialog
        isOpen={isBulkPaymentDialogOpen}
        onOpenChange={setIsBulkPaymentDialogOpen}
        customers={customers}
        onSave={handleBulkPaymentSave}
      />

      {isConvertingInvoice && conversionInvoiceData && (
        <InvoiceDialog
          isOpen={isConvertingInvoice}
          onOpenChange={(open) => {
            setIsConvertingInvoice(open);
            if (!open) setConversionInvoiceData(null);
          }}
          initialData={conversionInvoiceData}
          onSave={handleSaveInvoice}
          onSaveProduct={handleSaveProduct}
          onSaveCustomer={handleSaveCustomer}
          customers={customers}
          products={products}
          productCategories={stableProductCategories}
          isDataLoading={isLoadingCustomers || isLoadingProducts}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by #, customer, PO, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mb-4"
          />

          <InvoiceTable
            invoices={sortedAndFilteredInvoices}
            // Wrap async fns to satisfy (..)=>void signatures
            onSave={(inv) => {
              void handleSaveInvoice(inv);
            }}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            onDelete={(id) => {
              void handleDeleteInvoice(id);
            }}
            onGenerateEmail={(inv) => {
              void handleGenerateEmail(inv);
            }}
            onSendToPacking={(inv) => {
              void handleSendToPacking(inv);
            }}
            onPrint={(inv) => {
              void handlePrepareAndPrintInvoice(inv);
            }}
            onPrintPackingSlip={(inv) => {
              void handlePrepareAndPrintInvoicePackingSlip(inv);
            }}
            formatDate={formatDate}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
            onViewItems={(inv) => setInvoiceForViewingItems(inv)}
            sortConfig={sortConfig}
            requestSort={requestSort}
            renderSortArrow={renderSortArrow}
          />

          {sortedAndFilteredInvoices.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              {invoices.length === 0 ? "No invoices found." : "No invoices match your search."}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedInvoiceForEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Invoice {selectedInvoiceForEmail.invoiceNumber}</DialogTitle>
              <DialogDescription>Review and send the email to {selectedInvoiceForEmail.customerName}.</DialogDescription>
            </DialogHeader>

            {isLoadingEmail && !emailDraft ? (
              <div className="flex flex-col justify-center items-center h-60 space-y-2">
                <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
                <p>Loading email draft...</p>
              </div>
            ) : emailDraft ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Recipients</Label>
                  {targetCustomerForEmail && targetCustomerForEmail.emailContacts.length > 0 ? (
                    <ScrollArea className="h-24 w-full rounded-md border p-2 mb-2">
                      {targetCustomerForEmail.emailContacts.map((contact: EmailContact) => (
                        <div key={contact.id} className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`email-contact-invoice-${contact.id}`}
                            checked={selectedRecipientEmails.includes(contact.email)}
                            onCheckedChange={(checked) => {
                              setSelectedRecipientEmails((prev) =>
                                checked ? [...prev, contact.email] : prev.filter((e) => e !== contact.email)
                              );
                            }}
                          />
                          <Label htmlFor={`email-contact-invoice-${contact.id}`} className="text-sm font-normal">
                            {contact.email} ({contact.type} - {contact.name || "N/A"})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-2">No saved email contacts for this customer.</p>
                  )}

                  <FormFieldWrapper>
                    <Label htmlFor="additionalEmailInvoice">Or add another email:</Label>
                    <Input
                      id="additionalEmailInvoice"
                      type="email"
                      placeholder="another@example.com"
                      value={additionalRecipientEmail}
                      onChange={(e) => setAdditionalRecipientEmail(e.target.value)}
                    />
                  </FormFieldWrapper>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="emailSubjectInvoice">Subject</Label>
                  <Input
                    id="emailSubjectInvoice"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emailBodyInvoice">Body</Label>
                  <Textarea
                    id="emailBodyInvoice"
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    rows={8}
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            ) : (
              <p className="text-center py-4">Could not load email draft.</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                {isLoadingEmail && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* hidden print area */}
      <div style={{ display: "none" }}>
        {invoiceToPrint && <PrintableInvoice ref={printRef} {...invoiceToPrint} />}
        {packingSlipToPrintForInvoice && <PrintableInvoicePackingSlip ref={printRef} {...packingSlipToPrintForInvoice} />}
        {bulkPaymentReceiptToPrint && <PrintableBulkPaymentReceipt ref={printRef} receiptData={bulkPaymentReceiptToPrint} />}
      </div>

      <LineItemsViewerDialog
  isOpen={isLineItemsViewerOpen}
  onOpenChange={(open) => {
    setIsLineItemsViewerOpen(open);
    if (!open) setInvoiceForViewingItems(null);
  }}
  lineItems={invoiceForViewingItems?.lineItems ?? []}
  documentType="Invoice"
  documentNumber={invoiceForViewingItems?.invoiceNumber ?? ''}
/>

    </>
  );
}

const FormFieldWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);

    