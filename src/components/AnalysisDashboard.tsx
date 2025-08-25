
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Calculator, Crosshair, Shield, Landmark, Award } from "lucide-react"
import { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface AnalysisDashboardProps {
    analysisResult: AnalyzeCreditReportOutput | null
    onSelectView: (view: string) => void
}

const DashboardButton = ({ icon: Icon, title, disabled, onClick, tooltipContent }: { icon: React.ElementType, title: string, disabled?: boolean, onClick?: () => void, tooltipContent?: string }) => {
    const buttonContent = (
         <button 
            onClick={onClick}
            disabled={disabled}
            className={`p-4 border rounded-lg text-center flex flex-col items-center justify-center gap-2 transition-all duration-200 ease-in-out ${disabled ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60' : 'bg-background hover:bg-muted hover:shadow-md transform hover:-translate-y-1 cursor-pointer'}`}
        >
            <Icon className={`h-6 w-6 ${disabled ? 'text-muted-foreground' : 'text-primary'}`} />
            <span className="text-xs font-semibold">{title}</span>
        </button>
    );

    if (disabled && tooltipContent) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltipContent}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return buttonContent;
}

export function AnalysisDashboard({ analysisResult, onSelectView }: AnalysisDashboardProps) {
    const isReady = !!analysisResult;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                    <Crosshair className="text-primary" />
                    Analysis Dashboard
                </CardTitle>
                <CardDescription>Select a section to view its detailed analysis. Some sections require previous steps to be completed.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DashboardButton icon={BarChart} title="Credit Summary" disabled={!isReady} onClick={() => onSelectView('summary')} tooltipContent="Complete analysis first." />
                    <DashboardButton icon={Landmark} title="Financials" disabled={!isReady} onClick={() => onSelectView('financials')} tooltipContent="Complete analysis first." />
                    <DashboardButton icon={Shield} title="AI Risk Assessment" disabled={!isReady} onClick={() => onSelectView('risk')} tooltipContent="Complete analysis first." />
                    <DashboardButton icon={Award} title="AI Credit Meter" disabled={true} tooltipContent="Under Construction" />
                </div>
            </CardContent>
        </Card>
    )
}
