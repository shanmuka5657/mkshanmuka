
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Calculator, Crosshair, Shield, Landmark, UserCheck } from "lucide-react"
import { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis"

interface AnalysisDashboardProps {
    analysisResult: AnalyzeCreditReportOutput | null
    onSelectView: (view: string) => void
}

const DashboardButton = ({ icon: Icon, title, disabled, onClick }: { icon: React.ElementType, title: string, disabled?: boolean, onClick?: () => void }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`p-4 border rounded-lg text-center flex flex-col items-center justify-center gap-2 transition-all duration-200 ease-in-out ${disabled ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60' : 'bg-background hover:bg-muted hover:shadow-md transform hover:-translate-y-1 cursor-pointer'}`}
    >
        <Icon className={`h-6 w-6 ${disabled ? 'text-muted-foreground' : 'text-primary'}`} />
        <span className="text-xs font-semibold">{title}</span>
    </button>
)

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
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <DashboardButton icon={BarChart} title="Credit Summary" disabled={!isReady} onClick={() => onSelectView('summary')} />
                    <DashboardButton icon={Shield} title="AI Risk Assessment" disabled={!isReady} onClick={() => onSelectView('risk')} />
                    <DashboardButton icon={Calculator} title="AI Credit Meter" disabled={!isReady} onClick={() => onSelectView('rating')} />
                    <DashboardButton icon={Landmark} title="Financials" disabled={!isReady} onClick={() => onSelectView('financials')} />
                    <DashboardButton icon={UserCheck} title="AI Underwriting" disabled={!isReady} onClick={() => onSelectView('underwriting')} />
                </div>
            </CardContent>
        </Card>
    )
}
