'use server';

/**
 * @fileOverview Genkit flow for generating estimate email drafts.
 *
 * - estimateEmailDraft - A function that generates an email draft for an estimate.
 * - EstimateEmailDraftInput - The input type for the estimateEmailDraft function.
 * - EstimateEmailDraftOutput - The return type for the estimateEmailDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateEmailDraftInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  estimateContent: z.string().describe('The content of the estimate.'),
  companyName: z.string().optional().describe('The company name of the customer, if applicable.'),
});
export type EstimateEmailDraftInput = z.infer<typeof EstimateEmailDraftInputSchema>;

const EstimateEmailDraftOutputSchema = z.object({
  emailDraft: z.string().describe('The generated email draft for the estimate.'),
});
export type EstimateEmailDraftOutput = z.infer<typeof EstimateEmailDraftOutputSchema>;

export async function estimateEmailDraft(input: EstimateEmailDraftInput): Promise<EstimateEmailDraftOutput> {
  return estimateEmailDraftFlow(input);
}

const estimateEmailDraftPrompt = ai.definePrompt({
  name: 'estimateEmailDraftPrompt',
  input: {schema: EstimateEmailDraftInputSchema},
  output: {schema: EstimateEmailDraftOutputSchema},
  prompt: `You are an expert email writer for a fence company.
  Your job is to create a draft email based on the estimate provided and the customer information.

  Customer Name: {{{customerName}}}
  {{#if companyName}}
  Company Name: {{{companyName}}}
  {{/if}}
  Estimate Content: {{{estimateContent}}}

  Draft Email:`, 
});

const estimateEmailDraftFlow = ai.defineFlow(
  {
    name: 'estimateEmailDraftFlow',
    inputSchema: EstimateEmailDraftInputSchema,
    outputSchema: EstimateEmailDraftOutputSchema,
  },
  async input => {
    const {output} = await estimateEmailDraftPrompt(input);
    return output!;
  }
);
