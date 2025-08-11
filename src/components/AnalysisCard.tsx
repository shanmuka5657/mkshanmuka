
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function AnalysisCard({ title, description, children }: AnalysisCardProps) {
    return (
        <div className="border rounded-lg bg-background">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">{title}</h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    )
}
