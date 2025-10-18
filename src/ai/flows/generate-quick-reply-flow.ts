'use server';
/**
 * @fileOverview Flow for generating a quick reply suggestion based on a customer's message.
 *
 * - generateQuickReply - A function that calls the AI flow.
 * - GenerateQuickReplyInput - The input type for the flow.
 * - GenerateQuickReplyOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GenerateQuickReplyInputSchema = z.object({
  customerMessage: z.string().describe("The customer's message to reply to."),
});
export type GenerateQuickReplyInput = z.infer<typeof GenerateQuickReplyInputSchema>;

export const GenerateQuickReplyOutputSchema = z.object({
  suggestion: z.string().describe('The suggested reply to the customer.'),
});
export type GenerateQuickReplyOutput = z.infer<typeof GenerateQuickReplyOutputSchema>;

export async function generateQuickReply(input: GenerateQuickReplyInput): Promise<GenerateQuickReplyOutput> {
  return generateQuickReplyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuickReplyPrompt',
  input: { schema: GenerateQuickReplyInputSchema },
  output: { schema: GenerateQuickReplyOutputSchema },
  prompt: `你是一个专业的在线客服。请根据客户的以下问题，为客服人员生成一个简洁、专业且友好的回复建议。

客户问题: "{{customerMessage}}"

请直接生成建议的回复内容。`,
});

const generateQuickReplyFlow = ai.defineFlow(
  {
    name: 'generateQuickReplyFlow',
    inputSchema: GenerateQuickReplyInputSchema,
    outputSchema: GenerateQuickReplyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
