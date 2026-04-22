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
import {
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  UserCircle2,
  ArrowRight,
  FileText,
  Sparkles,
  Zap,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LOADING_MESSAGES = [
  "Analyzing your resume...",
  "Scoring your resume for the selected role...",
  "Generating your improvement report...",
  "Sending the report to your inbox...",
];

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full bg-[hsl(180_60%_55%_/_0.18)] blur-3xl" />
      <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-[hsl(200_70%_55%_/_0.15)] blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-[hsl(170_60%_55%_/_0.12)] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
      />
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
      {n}
    </span>
  );
}

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
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );

      const finalRole = roleMode === "Other" ? customRole : roleMode === "None" ? "" : roleMode;

      await mutateAsync({
        data: {
          fileName: file.name,
          pdfBase64: base64,
          role: finalRole,
          email,
        },
      });
    } catch (err) {
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing your resume. Please try again.",
        variant: "destructive",
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
      <div className="relative min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
        <Backdrop />
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center space-y-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Analysis complete
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Your{" "}
              <span className="bg-gradient-to-r from-[hsl(180_55%_38%)] via-[hsl(190_60%_42%)] to-[hsl(210_55%_45%)] bg-clip-text text-transparent">
                Resume Report
              </span>
            </h1>
            <p className="text-muted-foreground">
              Evaluated for:{" "}
              <span className="font-medium text-foreground">{a.roleEvaluated || "General Best Practices"}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 relative overflow-hidden border-card-border shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <CardContent className="relative pt-8 pb-6 flex flex-col items-center justify-center space-y-6">
                <ScoreGauge score={a.score} label="Overall Score" size={170} strokeWidth={11} />
                <div className="text-center space-y-2">
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

            <Card className="md:col-span-2 border-card-border shadow-lg">
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
                  <div
                    key={idx}
                    className="bg-card p-4 rounded-xl border shadow-sm flex items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all animate-in fade-in slide-in-from-left-4"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "both" }}
                  >
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-green-500/10">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
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
                  <div
                    key={idx}
                    className="bg-card p-4 rounded-xl border shadow-sm flex items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all animate-in fade-in slide-in-from-right-4"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "both" }}
                  >
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/10">
                      <Lightbulb className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-6 md:p-8 space-y-6">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary mb-3">
                <ChevronRight className="w-5 h-5" />
                Recommended Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {a.keywordSuggestions.map((kw, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-background/80 backdrop-blur text-foreground border-border hover:bg-background"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="relative pt-4 border-t border-primary/10">
              <h3 className="text-lg font-semibold text-primary mb-2">Final Recommendation</h3>
              <p className="text-muted-foreground leading-relaxed">{a.finalRecommendation}</p>
            </div>
          </div>

          {data.emailSent ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400 rounded-xl text-sm font-medium animate-in zoom-in duration-500 border border-green-200/60 dark:border-green-900/40">
              <span>📩</span>
              Your detailed resume report has been sent to your email successfully.
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-300 rounded-xl text-sm border border-orange-200/60 dark:border-orange-900/40">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Email not delivered</p>
                <p className="text-xs leading-relaxed">{data.emailMessage}</p>
              </div>
            </div>
          )}

          <div className="text-center pt-4">
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-full px-6">
              Analyze Another Resume
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col overflow-hidden">
      <Backdrop />
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 py-12">
        <div className="w-full max-w-xl mx-auto space-y-10">
          <div className="text-center space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="w-3 h-3" />
              AI-powered · Free to use
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
                  <div className="relative inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-primary to-[hsl(200_55%_40%)] rounded-2xl shadow-lg">
                    <FileText className="w-7 h-7 text-primary-foreground" />
                  </div>
                </div>
              </div>

              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                Resume
                <span className="bg-gradient-to-r from-[hsl(180_55%_38%)] via-[hsl(190_60%_42%)] to-[hsl(210_55%_45%)] bg-clip-text text-transparent">
                  Lens
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                Upload your resume and get an instant AI score with detailed, actionable feedback.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs text-muted-foreground shadow-sm">
                <Zap className="w-3 h-3 text-primary" /> Instant analysis
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs text-muted-foreground shadow-sm">
                <ShieldCheck className="w-3 h-3 text-primary" /> ATS scoring
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs text-muted-foreground shadow-sm">
                <Mail className="w-3 h-3 text-primary" /> Full email report
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent opacity-60 blur-sm" />
            <Card className="relative border-border/60 shadow-xl rounded-2xl overflow-hidden bg-card/80 backdrop-blur">
              {isPending ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="h-6 overflow-hidden">
                    <p
                      className="font-medium text-foreground animate-in slide-in-from-bottom-2 fade-in"
                      key={loadingMsgIdx}
                    >
                      {LOADING_MESSAGES[loadingMsgIdx]}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8 space-y-7">
                  <div className="space-y-2.5">
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      <StepNumber n={1} /> Upload your resume
                    </Label>
                    <FileUploader
                      selectedFile={file}
                      onFileSelect={setFile}
                      onFileClear={() => setFile(null)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <Label className="flex items-center gap-2 text-base font-semibold">
                        <StepNumber n={2} /> Target Role{" "}
                        <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                      </Label>
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
                          placeholder="e.g. Solutions Architect"
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      <StepNumber n={3} /> Where should we send the report?
                    </Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold group rounded-xl shadow-md bg-gradient-to-r from-primary to-[hsl(200_55%_38%)] hover:opacity-95 transition-opacity"
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

          <p className="text-center text-xs text-muted-foreground">
            Your resume is processed securely and never stored.
          </p>
        </div>
      </main>
    </div>
  );
}
