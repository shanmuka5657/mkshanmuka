
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, Volume2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { aiAgentChat, AiAgentChatHistory } from '@/ai/flows/ai-agent-chat';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ChatPage() {
  const [messages, setMessages] = useState<AiAgentChatHistory[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cibilReportAvailable, setCibilReportAvailable] = useState(false);
  const [bankStatementAvailable, setBankStatementAvailable] = useState(false);

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: AiAgentChatHistory = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage];
      const result = await aiAgentChat({
        history: chatHistory,
        cibilReportAvailable,
        bankStatementAvailable,
      });

      if (result.answer) {
        const modelMessage: AiAgentChatHistory = { role: 'model', content: result.answer };
        setMessages((prev) => [...prev, modelMessage]);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An error occurred while fetching the response.',
      });
      // Optionally remove the user's message if the call fails
      setMessages(prev => prev.slice(0, prev.length -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-10rem)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            CreditWise AI Assistant
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Ask me anything about the documents you've uploaded. I'm here to help you understand your financial data.
          </p>
        </div>

        <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Chat</CardTitle>
                    <CardDescription>Simulate document uploads to provide context to the AI.</CardDescription>
                </div>
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Switch id="cibil-switch" checked={cibilReportAvailable} onCheckedChange={setCibilReportAvailable} />
                        <Label htmlFor="cibil-switch">CIBIL Report</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="bank-switch" checked={bankStatementAvailable} onCheckedChange={setBankStatementAvailable} />
                        <Label htmlFor="bank-switch">Bank Statement</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Bot className="h-16 w-16 mb-4"/>
                        <p>No messages yet. Start the conversation!</p>
                        <p className="text-xs mt-2">Example: "What is my CIBIL score?"</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={cn('flex items-start gap-3', msg.role === 'user' ? 'justify-end' : '')}>
                            {msg.role === 'model' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'p-3 rounded-lg max-w-sm',
                                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}>
                                <p className="text-sm">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))
                )}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot /></AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-muted flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin"/>
                        </div>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </Card>
    </main>
  );
}
