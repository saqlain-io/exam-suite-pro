import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useStartExam, 
  useSaveAnswer, 
  useSubmitExam, 
  ExamSession 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function StudentExam() {
  const { id } = useParams();
  const examId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const startMut = useStartExam();
  const saveMut = useSaveAnswer();
  const submitMut = useSubmitExam();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);

  // Auto Submit Function
  const autoSubmit = useCallback((reason: "timeout" | "tab_switch") => {
    if (isSubmitting || !session) return;
    setIsSubmitting(true);
    
    submitMut.mutate({
      id: examId,
      data: {
        attemptId: session.attemptId,
        answers: answers,
        submissionReason: reason
      }
    }, {
      onSuccess: () => {
        localStorage.removeItem(`exam_${examId}_timeLeft`);
        toast({ title: `Exam Auto-Submitted (${reason === 'timeout' ? 'Time Out' : 'Violation'})` });
        setLocation("/student/results");
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ title: "Failed to submit exam", variant: "destructive" });
      }
    });
  }, [examId, session, answers, isSubmitting, submitMut, setLocation, toast]);

  // Start Exam on Mount
  useEffect(() => {
    if (!examId || initialized.current) return;
    initialized.current = true;

    startMut.mutate({ id: examId }, {
      onSuccess: (data) => {
        setSession(data);
        setAnswers(data.existingAnswers || {});
        
        // Timer Logic
        const storedTime = localStorage.getItem(`exam_${examId}_timeLeft`);
        const initialTime = storedTime ? parseInt(storedTime) : data.durationMinutes * 60;
        setTimeLeft(initialTime);

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              autoSubmit("timeout");
              return 0;
            }
            const newTime = prev - 1;
            localStorage.setItem(`exam_${examId}_timeLeft`, newTime.toString());
            return newTime;
          });
        }, 1000);
      },
      onError: (err: any) => {
        toast({ title: "Cannot start exam", description: err.message, variant: "destructive" });
        setLocation("/student");
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  // Anti-Cheat Hooks
  useEffect(() => {
    const disableContextMenu = (e: Event) => e.preventDefault();
    const disableCopy = (e: Event) => e.preventDefault();

    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('copy', disableCopy);
    document.addEventListener('cut', disableCopy);
    document.addEventListener('paste', disableCopy);

    const handleVisibilityChange = () => {
      if (document.hidden && session) {
        setTabSwitchCount(c => {
          const newCount = c + 1;
          if (newCount >= 3) {
            autoSubmit("tab_switch");
          } else {
            toast({
              title: "Warning!",
              description: `Tab switching detected (${newCount}/3). Exam will auto-submit on 3rd violation.`,
              variant: "destructive",
            });
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('copy', disableCopy);
      document.removeEventListener('cut', disableCopy);
      document.removeEventListener('paste', disableCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [session, autoSubmit, toast]);

  const handleAnswerChange = (questionId: number, optionLabel: string) => {
    if (!session) return;
    
    // Optimistic update
    const qIdStr = questionId.toString();
    setAnswers(prev => ({ ...prev, [qIdStr]: optionLabel }));

    // API save
    saveMut.mutate({
      id: examId,
      data: {
        attemptId: session.attemptId,
        questionId: questionId,
        selectedOption: optionLabel
      }
    });
  };

  const handleManualSubmit = () => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);
    
    submitMut.mutate({
      id: examId,
      data: {
        attemptId: session.attemptId,
        answers: answers,
        submissionReason: "manual"
      }
    }, {
      onSuccess: () => {
        localStorage.removeItem(`exam_${examId}_timeLeft`);
        toast({ title: "Exam submitted successfully" });
        setLocation("/student/results");
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ title: "Failed to submit exam", variant: "destructive" });
      }
    });
  };

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-500 animate-pulse">Initializing Secure Exam Environment...</div>
    </div>
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalAnswered = Object.keys(answers).length;
  const isComplete = totalAnswered === session.questions.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-md flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          {tabSwitchCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Warnings: {tabSwitchCount}/3
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md">
            Answered: {totalAnswered} / {session.questions.length}
          </div>
          <Button onClick={() => setShowSubmitConfirm(true)} variant={isComplete ? "default" : "secondary"}>
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 pb-24">
        {tabSwitchCount > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Integrity Warning</AlertTitle>
            <AlertDescription>
              Navigating away from this page is strictly prohibited. You have <strong>{3 - tabSwitchCount}</strong> warnings left before automatic submission.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">
          {session.questions.map((q, idx) => (
            <Card key={q.id} className="border-gray-200 shadow-sm" id={`q-${q.displayNumber}`}>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-start gap-3">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-bold">
                    {q.displayNumber}
                  </span>
                  <span className="pt-1">{q.questionText}</span>
                </h3>
                
                <RadioGroup 
                  value={answers[q.id.toString()] || ""} 
                  onValueChange={(val) => handleAnswerChange(q.id, val)}
                  className="space-y-3 ml-11"
                >
                  {q.shuffledOptions.map((opt) => (
                    <div key={opt.label} className="flex items-center space-x-3">
                      <RadioGroupItem value={opt.label} id={`q${q.id}-${opt.label}`} />
                      <Label htmlFor={`q${q.id}-${opt.label}`} className="text-base font-normal cursor-pointer leading-relaxed text-gray-700">
                        {opt.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              {totalAnswered < session.questions.length ? (
                <span className="text-red-600 font-medium">You have {session.questions.length - totalAnswered} unanswered questions! </span>
              ) : ""}
              Are you sure you want to submit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Return to Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleManualSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              Yes, Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
