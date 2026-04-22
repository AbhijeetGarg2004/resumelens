import { useState, useEffect } from "react";
import { useAnalyzeResume } from "@workspace/api-client-react";
import { FileUploader } from "@/components/FileUploader";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, AlertTriangle, Lightbulb, UserCircle2, ArrowRight, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LOADING_MESSAGES = [
  "Analyzing your resume...",
  "Scoring your resume for the selected role...",
  "Generating your improvement report...",
  "Sending the report to your inbox..."
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [roleMode, setRoleMode] = useState<string>("");
  const [customRole, setCustomRole] = useState("");
  const [email, setEmail] = useState("");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const { toast } = useToast();
  const { mutateAsync, isPending, data } = useAnalyzeResume();

  const handleAnalyze = async () => {
    if (!file || !email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const finalRole = roleMode === "Other" ? customRole : roleMode === "None" ? "" : roleMode;

      await mutateAsync({
        data: {
          fileName: file.name,
          pdfBase64: base64,
          role: finalRole,
          email
        }
      });
    } catch (err) {
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing your resume. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isPending]);

  const isValid = file && email && (roleMode !== "Other" || customRole.trim().length > 0);

  if (data?.analysis) {
    const a = data.analysis;
    return (
      <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Your Resume Analysis</h1>
            <p className="text-muted-foreground">Evaluated for: <span className="font-medium text-foreground">{a.roleEvaluated || "General Best Practices"}</span></p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 bg-card border-card-border shadow-sm">
              <CardContent className="pt-6 flex flex-col items-center justify-center space-y-6">
                <ScoreGauge score={a.score} label="Overall Score" size={160} strokeWidth={10} />
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg">{a.verdict}</h3>
                  <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                    <span className="text-muted-foreground">ATS Compatibility:</span>
                    <Badge variant={a.atsScore > 75 ? "default" : a.atsScore > 50 ? "secondary" : "destructive"}>
                      {a.atsScore}/100
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-card border-card-border shadow-sm">
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <UserCircle2 className="w-5 h-5 text-primary" />
                    Summary
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{a.summary}</p>
                </div>
                {a.atsFeedback && (
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-1">ATS Feedback</h4>
                    <p className="text-sm text-muted-foreground">{a.atsFeedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Strengths
              </h3>
              <div className="space-y-3">
                {a.strengths.map((item, idx) => (
                  <div key={idx} className="bg-card p-4 rounded-lg border shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                    <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Missing & Improvements
              </h3>
              <div className="space-y-3">
                {[...a.missing, ...a.improvements].map((item, idx) => (
                  <div key={idx} className="bg-card p-4 rounded-lg border shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                    <div className="mt-0.5"><Lightbulb className="w-4 h-4 text-orange-500" /></div>
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary mb-3">
                <ChevronRight className="w-5 h-5" />
                Recommended Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {a.keywordSuggestions.map((kw, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-background text-foreground border-border hover:bg-background">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-primary/10">
              <h3 className="text-lg font-semibold text-primary mb-2">Final Recommendation</h3>
              <p className="text-muted-foreground">{a.finalRecommendation}</p>
            </div>
          </div>

          {data.emailSent && (
            <div className="flex items-center justify-center p-4 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400 rounded-lg text-sm font-medium animate-in zoom-in duration-500">
              📩 Your detailed resume report has been sent to your email successfully.
            </div>
          )}

          <div className="text-center pt-8">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Analyze Another Resume
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">ResumeLens</h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Get an instant AI score and detailed actionable feedback on your resume.
            </p>
          </div>

          <Card className="border-border shadow-lg overflow-hidden">
            {isPending ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="h-6 overflow-hidden">
                  <p className="font-medium text-foreground animate-in slide-in-from-bottom-2 fade-in" key={loadingMsgIdx}>
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">1. Upload your resume</Label>
                  <FileUploader 
                    selectedFile={file} 
                    onFileSelect={setFile} 
                    onFileClear={() => setFile(null)} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">2. Target Role (Optional)</Label>
                    <Select value={roleMode} onValueChange={setRoleMode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">General Evaluation (No specific role)</SelectItem>
                        <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                        <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                        <SelectItem value="Full Stack Developer">Full Stack Developer</SelectItem>
                        <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                        <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                        <SelectItem value="Product Manager">Product Manager</SelectItem>
                        <SelectItem value="UI/UX Designer">UI / UX Designer</SelectItem>
                        <SelectItem value="HR / Human Resources">HR / Human Resources</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {roleMode === "Other" && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                      <Label className="text-sm text-muted-foreground">Specify Custom Role</Label>
                      <Input 
                        placeholder="e.g. Product Manager" 
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-base">3. Where should we send the full report?</Label>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full h-12 text-base font-medium group" 
                  onClick={handleAnalyze}
                  disabled={!isValid}
                >
                  Analyze My Resume
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
          </Card>
          
        </div>
      </main>
    </div>
  );
}
