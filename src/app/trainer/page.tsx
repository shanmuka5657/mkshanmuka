
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Bot, BrainCircuit, Plus, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import Link from 'next/link';

type TrainingExample = {
  id: number;
  rawCibilText: string;
  name: string;
  dob: string;
  pan: string;
  address: string;
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
        rawCibilText: '',
        name: '',
        dob: '',
        pan: '',
        address: '',
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
        description: 'Please give your extraction model a name.',
      });
      return;
    }
    if (examples.length < 1) {
      toast({
        variant: 'destructive',
        title: 'More Examples Needed',
        description: 'Please provide at least one complete example.',
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
        description: `Your model "${modelName}" is now ready to be used for data extraction.`,
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
            AI Data Extraction Trainer
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Teach our AI to read CIBIL reports. Paste in raw report text and then fill in the correct corresponding details. The more high-quality examples you provide, the better the AI will get at automatic data extraction.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <BrainCircuit className="mr-3 h-6 w-6 text-primary" />
              1. Name Your Extraction Model
            </CardTitle>
            <CardDescription>Give your custom data extraction model a unique name.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., 'CIBIL Consumer Info Extractor'"
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
             Add examples by pasting raw CIBIL text and filling out the data you want the AI to learn to find.
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <Label htmlFor={`rawCibil-${index}`}>Raw CIBIL Report Text</Label>
                      <Textarea 
                        id={`rawCibil-${index}`} 
                        placeholder="Paste the entire raw text from a CIBIL report here..." 
                        value={example.rawCibilText} 
                        onChange={e => updateExample(example.id, 'rawCibilText', e.target.value)}
                        className="h-64"
                      />
                  </div>
                  <div className="space-y-4">
                      <div>
                        <Label htmlFor={`name-${index}`}>Name</Label>
                        <Input 
                          id={`name-${index}`} 
                          placeholder="e.g., 'Ramesh Kumar'" 
                          value={example.name} 
                          onChange={e => updateExample(example.id, 'name', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor={`dob-${index}`}>Date of Birth</Label>
                        <Input 
                          id={`dob-${index}`} 
                          placeholder="e.g., '01-01-1990'" 
                          value={example.dob} 
                          onChange={e => updateExample(example.id, 'dob', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor={`pan-${index}`}>PAN</Label>
                        <Input 
                          id={`pan-${index}`} 
                          placeholder="e.g., 'ABCDE1234F'" 
                          value={example.pan} 
                          onChange={e => updateExample(example.id, 'pan', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor={`address-${index}`}>Address</Label>
                        <Textarea 
                          id={`address-${index}`} 
                          placeholder="e.g., '123, Main Street, Bengaluru, Karnataka, 560001'" 
                          value={example.address} 
                          onChange={e => updateExample(example.id, 'address', e.target.value)}
                          className="h-24"
                        />
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
