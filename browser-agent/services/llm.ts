import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let calls = 0;
const BUDGET = 2;

export async function askLLM(prompt: string): Promise<string> {
  if (calls >= BUDGET) return '';
  calls++;
  try {
    const res = await groq.chat.completions.create({ model: 'openai/gpt-oss-20b', messages: [{ role: 'user', content: prompt }] });
    return res.choices[0].message.content || '';
  } catch {
    return '';
  }
}
