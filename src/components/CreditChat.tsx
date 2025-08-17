
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, X, Loader2, Paperclip, ArrowDown, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { aiAgentChat, AiAgentChatHistory } from '@/ai/flows/ai-agent-chat';
import { useToast } from '@/hooks/use-toast';

interface AiAgentChatProps {
  cibilReportAvailable: boolean;
  bankStatementAvailable?: boolean;
}

export function AiAgentChat({ cibilReportAvailable, bankStatementAvailable = false }: AiAgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<AiAgentChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTo({ top: scrollViewport.scrollHeight, behavior });
      }
    }, 100);
  };
  
  useEffect(() => {
    scrollToBottom('auto');
  }, [history]);
  
  useEffect(() => {
    if (isOpen) {
        scrollToBottom('auto');
    }
  }, [isOpen, isMaximized]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isScrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setShowScrollDown(!isScrolledToBottom);
  };
  
  const handleSendMessage = async (fileDataUri?: string) => {
    const userMessage = message.trim();
    if (!userMessage && !fileDataUri) return;

    setIsLoading(true);
    
    // Note: The AI flow currently only supports text history. 
    // Multi-modal input is not fully wired up in the v1 flow yet.
    // We'll send the text part for now.
    const newUserMessage: AiAgentChatHistory = { role: 'user', content: userMessage };
    const newHistory = [...history, newUserMessage];
    setHistory(newHistory);
    setMessage('');
    
    try {
      const output = await aiAgentChat({
        history: newHistory,
        cibilReportAvailable,
        bankStatementAvailable,
      });

      const modelResponse: AiAgentChatHistory = {
        role: 'model',
        content: output.answer,
      };
      setHistory(prev => [...prev, modelResponse]);

      if (output.audioDataUri && audioRef.current) {
          audioRef.current.src = output.audioDataUri;
          audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Communicating with AI',
        description: error.message || 'An unknown error occurred.',
      });
      // Remove the user's message if the API call fails
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
          title: "File Upload (Not Implemented)",
          description: "Multi-modal chat is not fully supported in this version. Your message will be sent without the file.",
      });
      // The logic to handle fileDataUri is commented out until the AI flow supports it.
      // const reader = new FileReader();
      // reader.onload = (e) => {
      //   handleSendMessage(e.target?.result as string);
      // };
      // reader.readAsDataURL(file);
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-24 right-4 z-50 rounded-full h-16 w-16 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-8 w-8" />
        <span className="sr-only">Open AI Chat</span>
      </Button>
    );
  }

  return (
    <Card className={cn(
        "fixed bottom-4 right-4 z-50 shadow-2xl transition-all duration-300 ease-in-out",
        isMaximized ? "w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] md:w-96 md:h-[70vh]" : "w-80 h-[500px]"
    )}>
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
            <Bot className="h-6 w-6" />
            <CardTitle className="text-lg">AI Assistant</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close chat</span>
        </Button>
      </CardHeader>
      <CardContent className="p-0 h-full flex flex-col">
        <div className="flex-1 relative">
            <ScrollArea className="h-[calc(100%-4rem)]" onScroll={handleScroll} ref={scrollAreaRef}>
              <div className="p-4 space-y-4">
                {history.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground p-8">
                    Ask me anything about your credit report!
                  </div>
                )}
                {history.map((entry, index) => (
                  <div key={index} className={cn('flex items-start gap-3', entry.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {entry.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                    <div className={cn('max-w-xs rounded-lg p-3 text-sm', entry.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                       <p className="whitespace-pre-wrap">{entry.content}</p>
                    </div>
                    {entry.role === 'user' && <User className="h-6 w-6 text-muted-foreground flex-shrink-0" />}
                  </div>
                ))}
                {isLoading && (
                   <div className="flex items-start gap-3 justify-start">
                     <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                     <div className="bg-muted rounded-lg p-3 flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span className="text-sm">AI is thinking...</span>
                     </div>
                   </div>
                )}
              </div>
            </ScrollArea>
             {showScrollDown && (
                <Button variant="outline" size="icon" className="absolute bottom-20 right-4 rounded-full" onClick={() => scrollToBottom()}>
                    <ArrowDown className="h-4 w-4" />
                </Button>
            )}
        </div>
        <div className="p-3 border-t bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
            <Button type="submit" disabled={isLoading || !message.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </CardContent>
      <audio ref={audioRef} className="hidden" />
    </Card>
  );
}
