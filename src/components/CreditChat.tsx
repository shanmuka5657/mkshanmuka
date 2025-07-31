'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { chatAboutCreditReport } from '@/ai/flows/credit-chat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function CreditChat({ creditReportText }: { creditReportText: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        // A bit of a hack to scroll to the bottom.
        // The underlying implementation of ScrollArea is Radix, which doesn't expose a simple imperative API to scroll to bottom.
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatAboutCreditReport({
        creditReportText,
        question: input,
      });
      const aiMessage: Message = { role: 'assistant', content: result.answer };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error getting chat response:', error);
      toast({
        variant: 'destructive',
        title: 'Chat Failed',
        description:
          error.message?.includes('503')
            ? 'The AI model is currently overloaded. Please try again in a moment.'
            : error.message || 'Could not get chat response. Please try again.',
      });
       const systemMessage: Message = { role: 'assistant', content: "Sorry, I couldn't get a response. Please try again." };
      setMessages((prev) => [...prev, systemMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-full max-w-md shadow-2xl print:hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-primary" />
          AI Credit Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <Bot size={20} />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-xs rounded-lg px-4 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.content}
                </div>
                 {message.role === 'user' && (
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                    <User size={20} />
                  </span>
                )}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <Bot size={20} />
                </span>
                <div className="bg-muted max-w-xs rounded-lg px-4 py-2 text-sm flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your report..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
