
'use server';

/**
 * @fileOverview Genkit flow for generating invoice email drafts.
 *
 * - generateInvoiceEmailDraft - A function that generates an email draft for an invoice.
 * - InvoiceEmailDraftInput - The input type for the generateInvoiceEmailDraft function.
 * - InvoiceEmailDraftOutput - The return type for the generateInvoiceEmailDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InvoiceEmailDraftInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  companyName: z.string().optional().describe('The company name of the customer, if applicable.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The date of the invoice.'),
  invoiceTotal: z.number().describe('The total amount of the invoice.'),
  invoiceItems: z.string().describe('A description of the items in the invoice.'),
  dueDate: z.string().optional().describe('The due date of the invoice, if applicable.'),
  companyNameToDisplay: z.string().describe('The name of the company sending the email.'),
});
export type InvoiceEmailDraftInput = z.infer<typeof InvoiceEmailDraftInputSchema>;

const InvoiceEmailDraftOutputSchema = z.object({
  subject: z.string().describe('The subject line of the email.'),
  body: z.string().describe('The body of the email.'),
});
export type InvoiceEmailDraftOutput = z.infer<typeof InvoiceEmailDraftOutputSchema>;

export async function generateInvoiceEmailDraft(input: InvoiceEmailDraftInput): Promise<InvoiceEmailDraftOutput> {
  return generateInvoiceEmailDraftFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvoiceEmailDraftPrompt',
  input: {schema: InvoiceEmailDraftInputSchema},
  output: {schema: InvoiceEmailDraftOutputSchema},
  prompt: `You are an AI assistant specialized in drafting emails for a fence supply company.
  Your task is to generate a draft email for an invoice to be sent to the customer.
  Use the provided information to create a professional and informative email.

  Customer Name: {{{customerName}}}
  {{#if companyName}}
  Company Name: {{{companyName}}}
  {{/if}}
  Invoice Number: {{{invoiceNumber}}}
  Invoice Date: {{{invoiceDate}}}
  Invoice Total: {{{invoiceTotal}}}
  Invoice Items: {{{invoiceItems}}}
  {{#if dueDate}}
  Due Date: {{{dueDate}}}
  {{/if}}
  Company Name: {{{companyNameToDisplay}}}

  Compose a subject and body for the email. The email should include:
  - A polite notification about the attached invoice.
  - The invoice details (number, date, total, due date if available).
  - A brief mention of the items or services provided.
  - Payment instructions or a link to a payment portal (use a generic placeholder for this).
  - Contact information for any questions.
  - A professional closing.
  `,
});

const generateInvoiceEmailDraftFlow = ai.defineFlow(
  {
    name: 'generateInvoiceEmailDraftFlow',
    inputSchema: InvoiceEmailDraftInputSchema,
    outputSchema: InvoiceEmailDraftOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
