
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ShareTargetPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4">Share Received!</CardTitle>
          <CardDescription>
            The content you shared has been successfully received by CreditWise AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-6">
            In a full application, this page would process the shared data (like analyzing a shared link or document). For now, this confirms the share functionality is working.
          </p>
          <Button asChild>
            <Link href="/">
              Return to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
