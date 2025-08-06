
import { FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex items-center">
            <span className="font-bold text-lg">CreditWise AI</span>
          </div>
          <nav className="flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
             <Link
                href="/credit"
                className="transition-colors hover:text-foreground/80 text-foreground"
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
                className="transition-colors hover:text-foreground/80 text-muted-foreground"
              >
                AI Model Trainer
              </Link>
          </nav>
        </div>
      </header>
       <main className="container mx-auto p-4 md:p-8">
         <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Welcome to CreditWise AI</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Your powerful suite of AI tools for financial document analysis. Choose a tool below to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link href="/credit">
                <Card className="h-full hover:shadow-xl hover:border-primary transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <FileText className="h-8 w-8 text-primary" />
                            Credit Analysis
                        </CardTitle>
                        <CardDescription>
                            Upload a CIBIL report to perform a deep, AI-powered analysis of credit health, risk, and loan eligibility.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold">Features Include:</p>
                        <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1">
                            <li>Comprehensive Credit Summary</li>
                            <li>AI-Powered Risk Assessment</li>
                            <li>Loan Eligibility Simulation</li>
                            <li>Full Underwriting Decisioning</li>
                        </ul>
                    </CardContent>
                </Card>
            </Link>
             <Link href="/verify">
                <Card className="h-full hover:shadow-xl hover:border-primary transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                           <ShieldCheck className="h-8 w-8 text-primary" />
                           PDF Verification
                        </CardTitle>
                        <CardDescription>
                           Upload any document (e.g., salary slips, bank statements) for a forensic AI analysis to detect fraud and tampering.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold">Features Include:</p>
                         <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1">
                            <li>Multi-Document Consistency Checks</li>
                            <li>Formatting & Layout Anomaly Detection</li>
                            <li>Tampering Indicator Analysis</li>
                            <li>Authenticity Confidence Scoring</li>
                        </ul>
                    </CardContent>
                </Card>
            </Link>
        </div>
      </main>
       <footer className="text-center py-6 text-sm text-muted-foreground">
         <div>© {new Date().getFullYear()} CreditWise AI. Built with Firebase and Google AI.</div>
      </footer>
    </div>
  );
}
