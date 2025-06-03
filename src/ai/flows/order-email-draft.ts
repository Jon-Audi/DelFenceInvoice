'use server';

/**
 * @fileOverview A flow to generate a draft email for an order.
 *
 * - generateOrderEmailDraft - A function that generates the order email draft.
 * - GenerateOrderEmailDraftInput - The input type for the generateOrderEmailDraft function.
 * - GenerateOrderEmailDraftOutput - The return type for the generateOrderEmailDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateOrderEmailDraftInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  customerEmail: z.string().email().describe('The email address of the customer.'),
  orderNumber: z.string().describe('The order number.'),
  orderDate: z.string().describe('The order date.'),
  orderItems: z.string().describe('A description of the items ordered.'),
  orderTotal: z.number().describe('The total amount of the order.'),
  companyName: z.string().describe('The name of the company sending the email.'),
});

export type GenerateOrderEmailDraftInput = z.infer<
  typeof GenerateOrderEmailDraftInputSchema
>;

const GenerateOrderEmailDraftOutputSchema = z.object({
  subject: z.string().describe('The subject line of the email.'),
  body: z.string().describe('The body of the email.'),
});

export type GenerateOrderEmailDraftOutput = z.infer<
  typeof GenerateOrderEmailDraftOutputSchema
>;

export async function generateOrderEmailDraft(
  input: GenerateOrderEmailDraftInput
): Promise<GenerateOrderEmailDraftOutput> {
  return generateOrderEmailDraftFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOrderEmailDraftPrompt',
  input: {schema: GenerateOrderEmailDraftInputSchema},
  output: {schema: GenerateOrderEmailDraftOutputSchema},
  prompt: `You are an AI assistant specialized in drafting emails for a fence supply company.
  Your task is to generate a draft email for a new order to be sent to the customer.
  Use the provided information to create a professional and informative email.

  Customer Name: {{{customerName}}}
  Customer Email: {{{customerEmail}}}
  Order Number: {{{orderNumber}}}
  Order Date: {{{orderDate}}}
  Order Items: {{{orderItems}}}
  Order Total: {{{orderTotal}}}
  Company Name: {{{companyName}}}

  Compose a subject and body for the email. The email should include:
  - A thank you message for the order.
  - The order details (number, date, total).
  - A list the items ordered.
  - Contact information for any questions.
  - A professional closing.
  `,
});

const generateOrderEmailDraftFlow = ai.defineFlow(
  {
    name: 'generateOrderEmailDraftFlow',
    inputSchema: GenerateOrderEmailDraftInputSchema,
    outputSchema: GenerateOrderEmailDraftOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
