
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Loader2, Send, User, Paperclip, X, Minus, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { aiAgentChat, AiAgentChatHistory, AiAgentChatInput } from '@/ai/flows/ai-agent-chat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import type { FlowUsage } from 'genkit/flow';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  mediaPreview?: string;
  mediaDataUri?: string; // Keep original data for history
}

export function AiAgentChat({ 
  cibilReportText, 
  bankStatementText,
  onNewChat,
  onTokensUsed,
}: { 
  cibilReportText?: string;
  bankStatementText?: string;
  onNewChat?: () => void;
  onTokensUsed?: (usage: FlowUsage) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [mediaDataUri, setMediaDataUri] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized && scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages, isOpen, isMinimized]);

  // When a new report is loaded, clear the chat history.
  useEffect(() => {
    if ((cibilReportText || bankStatementText) && messages.length > 0) {
      setMessages([]);
      onNewChat?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cibilReportText, bankStatementText]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setMediaDataUri(dataUri);
        setMediaPreview(URL.createObjectURL(file)); // Use blob URL for preview for better performance
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !mediaDataUri) || isLoading) return;

    // Add user message to display
    const userMessageForDisplay: DisplayMessage = { 
        role: 'user', 
        content: input, 
        mediaPreview: mediaPreview || undefined,
        mediaDataUri: mediaDataUri || undefined
    };
    setMessages((prev) => [...prev, userMessageForDisplay]);
    
    // Construct conversation history for the AI
    const conversationHistory: AiAgentChatHistory[] = [...messages, userMessageForDisplay].map(msg => {
      const content = [];
      if (msg.content) content.push({ text: msg.content });
      if (msg.mediaDataUri) content.push({ media: { url: msg.mediaDataUri }});
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        content,
      }
    });
    
    setIsLoading(true);
    setInput('');
    setMediaDataUri(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    try {
      const flowInput: AiAgentChatInput = {
        history: conversationHistory,
        cibilReportAvailable: !!cibilReportText,
        bankStatementAvailable: !!bankStatementText,
      };
      const { output, usage } = await aiAgentChat(flowInput);
      onTokensUsed?.(usage);
      const aiMessage: DisplayMessage = { role: 'assistant', content: output.answer };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error getting chat response:', error);
      toast({
        variant: 'destructive',
        title: 'Chat Failed',
        description:
          error.message?.includes('503') || error.message?.includes('overloaded')
            ? 'The AI model is currently overloaded. Please try again in a moment.'
            : error.message || 'Could not get chat response. Please try again.',
      });
       // Restore user input on error
       setMessages(prev => prev.slice(0, -1)); // remove the optimistic user message
       setInput(userMessageForDisplay.content);
       setMediaDataUri(userMessageForDisplay.mediaDataUri || null);
       setMediaPreview(userMessageForDisplay.mediaPreview || null);

    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-24 right-4 z-50 h-16 w-16 rounded-full shadow-2xl print:hidden"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare size={32} />
      </Button>
    )
  }

  return (
    <Card className={cn(
        "fixed bottom-24 right-4 z-50 w-full max-w-md shadow-2xl print:hidden transition-all",
        isMinimized ? "h-16 overflow-hidden" : "h-[600px] flex flex-col"
      )}>
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="text-primary" />
          AI Agent
        </CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
                <Minus className="h-4 w-4" />
                <span className="sr-only">Minimize</span>
            </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </Button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <>
        <CardContent className="p-4 pt-4 flex-1">
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
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
                    {message.mediaPreview && (
                      <Image
                        src={message.mediaPreview}
                        alt="Uploaded content"
                        width={200}
                        height={200}
                        className="rounded-md mb-2 max-w-full h-auto"
                      />
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }}></div>
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
        </CardContent>
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {mediaPreview && (
              <div className="relative w-24 h-24 mb-2">
                <Image
                  src={mediaPreview}
                  alt="Preview"
                  fill
                  style={{objectFit: 'cover'}}
                  className="rounded-md"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => {
                    setMediaDataUri(null);
                    setMediaPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Attach file</span>
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,application/pdf"
              />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI Agent anything..."
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || (!input.trim() && !mediaDataUri)} size="icon">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </form>
        </div>
        </>
      )}
    </Card>
  );
}
