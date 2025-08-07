
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Bot, BrainCircuit, ThumbsUp, ThumbsDown, Trash2, Loader2, FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getTrainingCandidates, approveCandidate, rejectCandidate, type TrainingCandidate } from '@/lib/training-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';


export default function ModelTrainerPage() {
  const [modelName, setModelName] = useState('CreditUnderwritingModel-v1');
  const [candidates, setCandidates] = useState<TrainingCandidate[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure this runs only on the client
    setIsClient(true);
    // Load candidates from our simulated store
    setCandidates(getTrainingCandidates());
  }, []);
  
  const handleApprove = (id: string) => {
    approveCandidate(id);
    setCandidates(getTrainingCandidates());
    toast({
      title: 'Candidate Approved',
      description: 'This example can now be used for future model training.',
    });
  };

  const handleReject = (id: string) => {
    rejectCandidate(id);
    setCandidates(getTrainingCandidates());
     toast({
      variant: 'destructive',
      title: 'Candidate Rejected',
      description: 'This example has been deleted and will not be used for training.',
    });
  };


  const handleTrainModel = () => {
    const approvedCandidates = candidates.filter(c => c.status === 'approved');
    if (!modelName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Model Name Required',
        description: 'Please give your model a name.',
      });
      return;
    }
    if (approvedCandidates.length < 1) {
      toast({
        variant: 'destructive',
        title: 'No Approved Examples',
        description: 'Please approve at least one candidate before training.',
      });
      return;
    }

    setIsTraining(true);
    toast({
      title: 'Training Started',
      description: `Your custom model "${modelName}" is being created...`,
    });

    // Simulate training process
    setTimeout(() => {
      setIsTraining(false);
      toast({
        variant: 'default',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        title: 'Training Complete!',
        description: `Your model "${modelName}" is now ready to be used.`,
      });
    }, 2500);
  };
  
  const approvedCount = candidates.filter(c => c.status === 'approved').length;

  if (!isClient) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
            <div className="mr-4 flex items-center">
              <Logo />
            </div>
            <nav className="flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
              <Link
                href="/credit"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                Credit Analysis
              </Link>
              <Link
                href="/verify"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                Verify PDF
              </Link>
              <Link
                href="/trainer"
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                AI Model Trainer
              </Link>
            </nav>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            AI Learning & Review Center
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            The app automatically captures analysis results as "training candidates." Review them here to teach the AI. Your feedback creates a high-quality dataset for building smarter, custom AI models.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <BrainCircuit className="mr-3 h-6 w-6 text-primary" />
              1. Review Training Candidates
            </CardTitle>
            <CardDescription>
             Approve candidates you want to use for training your custom AI model. Reject any that are inaccurate or irrelevant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4"/>
                    <h3 className="text-lg font-semibold">No Training Candidates Found</h3>
                    <p>Use the "Credit Analysis" page to process a credit report. The results will automatically appear here for your review.</p>
                </div>
            ) : (
                <Accordion type="multiple" className="w-full">
                    {candidates.map((candidate, index) => (
                      <AccordionItem value={candidate.id} key={candidate.id}>
                        <AccordionTrigger className="font-semibold text-left">
                          Candidate #{index + 1} (Status: <span className={`capitalize ${candidate.status === 'approved' ? 'text-green-500' : candidate.status === 'pending_review' ? 'text-yellow-500' : 'text-red-500'}`}>{candidate.status.replace('_', ' ')}</span>)
                        </AccordionTrigger>
                        <AccordionContent>
                           <Card className="p-4 bg-muted/50 relative">
                                <pre className="whitespace-pre-wrap text-xs bg-background p-4 rounded-lg max-h-96 overflow-auto">
                                  {JSON.stringify(candidate.data, null, 2)}
                                </pre>
                                <CardFooter className="pt-4 flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleApprove(candidate.id)} disabled={candidate.status === 'approved'}>
                                    <ThumbsUp className="mr-2"/> Approve
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleReject(candidate.id)}>
                                    <ThumbsDown className="mr-2"/> Reject & Delete
                                  </Button>
                                </CardFooter>
                           </Card>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
            )}
          </CardContent>
        </Card>

         <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center text-xl">
                <Sparkles className="mr-3 h-6 w-6 text-primary" />
                2. Train Your Custom Model
                </CardTitle>
                <CardDescription>Once you have approved enough examples, you can train your custom model.</CardDescription>
            </CardHeader>
            <CardContent>
                <Label htmlFor="model-name">Custom Model Name</Label>
                <Input
                    id="model-name"
                    placeholder="e.g., 'ConservativeUnderwriting_v1'"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                />
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                 <Button size="lg" onClick={handleTrainModel} disabled={isTraining || approvedCount === 0}>
                    {isTraining ? (
                        <Loader2 className="mr-2 animate-spin" />
                    ) : (
                        <Bot className="mr-2" />
                    )}
                    {isTraining ? 'Training Model...' : `Train Model with ${approvedCount} Approved Examples`}
                </Button>
                {approvedCount === 0 && <p className="text-sm text-muted-foreground">You must approve at least one candidate to enable training.</p>}
            </CardFooter>
        </Card>

      </main>
       <footer className="text-center py-6 text-sm text-muted-foreground">
         <p>© {new Date().getFullYear()} CreditWise AI. Built with Firebase and Google AI.</p>
      </footer>
    </div>
  );
}
