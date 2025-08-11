
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Briefcase, Calculator, Crosshair, Scale, Shield, UserCheck, Wallet } from "lucide-react"
import { AnalyzeCreditReportOutput } from "@/ai/flows/credit-report-analysis"

interface AnalysisDashboardProps {
    rawText: string | null
    analysisResult: AnalyzeCreditReportOutput | null
    onSelectView: (view: string) => void
}

const DashboardButton = ({ icon: Icon, title, disabled, onClick }: { icon: React.ElementType, title: string, disabled?: boolean, onClick?: () => void }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`p-4 border rounded-lg text-center flex flex-col items-center justify-center gap-2 ${disabled ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-background hover:bg-muted cursor-pointer'}`}
    >
        <Icon className="h-6 w-6" />
        <span className="text-xs font-medium">{title}</span>
    </button>
)

export function AnalysisDashboard({ rawText, analysisResult, onSelectView }: AnalysisDashboardProps) {
    const isReady = !!rawText && !!analysisResult;
    
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
                    <DashboardButton icon={Shield} title="AI Risk Assessment" disabled={!isReady} />
                    <DashboardButton icon={Calculator} title="AI Credit Meter" disabled={!isReady} />
                    <DashboardButton icon={Wallet} title="Financials" disabled={!isReady} />
                    <DashboardButton icon={Scale} title="Loan Eligibility" disabled={!isReady} />
                    <DashboardButton icon={Briefcase} title="Financial Risk" disabled={!isReady} />
                    <DashboardButton icon={UserCheck} title="Underwriting" disabled={!isReady} />
                </div>
            </CardContent>
        </Card>
    )
}
