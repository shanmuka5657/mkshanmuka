import { NextResponse } from 'next/server';
import { testAI } from '@/ai/genkit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt') || 'Hello Gemini';

      const aiResponse = await testAI(prompt);
    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Error calling testAI:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error.message },
      { status: 500 }
    );
  }
}
