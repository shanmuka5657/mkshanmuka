
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Bot, BrainCircuit, Plus, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import Link from 'next/link';

type TrainingExample = {
  id: number;
  decision: 'Approved' | 'Rejected';
  creditScore: string;
  income: string;
  debt: string;
  creditSummary: string;
  reason: string;
};

export default function ModelTrainerPage() {
  const [modelName, setModelName] = useState('');
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [isTraining, setIsTraining] = useState(false);

  const addExample = () => {
    setExamples([
      ...examples,
      {
        id: Date.now(),
        decision: 'Approved',
        creditScore: '',
        income: '',
        debt: '',
        creditSummary: '',
        reason: '',
      },
    ]);
  };

  const updateExample = (id: number, field: keyof Omit<TrainingExample, 'id'>, value: string) => {
    setExamples(
      examples.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  };

  const removeExample = (id: number) => {
    setExamples(examples.filter((ex) => ex.id !== id));
  };

  const handleTrainModel = () => {
    if (!modelName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Model Name Required',
        description: 'Please give your model a name.',
      });
      return;
    }
    if (examples.length < 2) {
      toast({
        variant: 'destructive',
        title: 'More Examples Needed',
        description: 'Please provide at least two examples (one approved, one rejected is best).',
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
        description: `Your model "${modelName}" is now ready to be used for underwriting.`,
      });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
            <div className="mr-4 flex items-center">
              <Bot className="h-6 w-6 mr-2 text-primary" />
              <span className="font-bold text-lg">CreditWise AI</span>
            </div>
            <nav className="flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
              <Link
                href="/"
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                Analyzer
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
            AI Underwriting Model Trainer
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Teach our AI to underwrite loans according to your rules. Provide examples of loan decisions, and we'll create a custom model for you.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <BrainCircuit className="mr-3 h-6 w-6 text-primary" />
              1. Name Your Model
            </CardTitle>
            <CardDescription>Give your custom underwriting model a unique name.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., 'Conservative Personal Loan Model'"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <UploadCloud className="mr-3 h-6 w-6 text-primary" />
              2. Provide Training Examples
            </CardTitle>
            <CardDescription>
              Add examples of decisions you would make. The more examples you provide, the smarter your model will become.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {examples.map((example, index) => (
              <Card key={example.id} className="p-4 bg-muted/50 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => removeExample(example.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`decision-${index}`}>Decision</Label>
                      <Select
                        value={example.decision}
                        onValueChange={(value) => updateExample(example.id, 'decision', value)}
                      >
                        <SelectTrigger id={`decision-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`score-${index}`}>Credit Score</Label>
                      <Input id={`score-${index}`} placeholder="e.g., 750" value={example.creditScore} onChange={e => updateExample(example.id, 'creditScore', e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor={`income-${index}`}>Monthly Income (₹)</Label>
                      <Input id={`income-${index}`} placeholder="e.g., 50000" value={example.income} onChange={e => updateExample(example.id, 'income', e.target.value)}/>
                    </div>
                    <div>
                      <Label htmlFor={`debt-${index}`}>Total Monthly Debt (₹)</Label>
                      <Input id={`debt-${index}`} placeholder="e.g., 20000" value={example.debt} onChange={e => updateExample(example.id, 'debt', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <Label htmlFor={`summary-${index}`}>Credit Summary</Label>
                        <Textarea id={`summary-${index}`} placeholder="e.g., High credit utilization at 95%. One recent late payment." value={example.creditSummary} onChange={e => updateExample(example.id, 'creditSummary', e.target.value)} />
                     </div>
                      <div>
                        <Label htmlFor={`reason-${index}`}>Reason for Decision</Label>
                        <Input id={`reason-${index}`} placeholder="e.g., High DTI ratio" value={example.reason} onChange={e => updateExample(example.id, 'reason', e.target.value)} />
                      </div>
                  </div>
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={addExample}>
              <Plus className="mr-2" />
              Add Example
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-center">
            <Button size="lg" onClick={handleTrainModel} disabled={isTraining}>
              {isTraining ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Bot className="mr-2" />
              )}
              {isTraining ? 'Training Model...' : `Train "${modelName || 'Custom'}" Model`}
            </Button>
          </div>
      </main>
       <footer className="text-center py-6 text-sm text-muted-foreground">
         <p>© {new Date().getFullYear()} CreditWise AI. Built with Firebase and Google AI.</p>
      </footer>
    </div>
  );
}
