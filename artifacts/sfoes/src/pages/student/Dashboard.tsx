import { Link } from "wouter";
import { useGetAvailableExams } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, AlertCircle, FileText, CheckCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";

export function StudentDashboard() {
  const { data: exams, isLoading } = useGetAvailableExams();
  const { user } = useAuth();

  const checkAttemptStatus = async (examId: number): Promise<string> => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`https://examapi-chi.vercel.app/api/student/exam-status/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return 'available';
      const data = await res.json();
      return data.status;
    } catch {
      return 'available';
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading available exams...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Available Exams</h1>
        <p className="text-gray-500 text-sm mt-1">Select an exam below to begin. Ensure you have a stable connection.</p>
      </div>

      {!exams || exams.length === 0 ? (
        <Alert className="bg-gray-50 border-gray-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No exams available</AlertTitle>
          <AlertDescription>
            There are currently no active exams assigned to your program and semester.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam: any) => {
            const now = new Date();
            const startTime = exam.startTime ? new Date(exam.startTime) : null;
            const endTime = exam.endTime ? new Date(exam.endTime) : null;
            const notStarted = startTime && now < startTime;
            const expired = endTime && now > endTime;
            const alreadySubmitted = exam.isSubmitted;

            return (
              <Card key={exam.id} className="flex flex-col shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                    alreadySubmitted ? 'bg-green-100 text-green-600' :
                    expired ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {alreadySubmitted ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <CardTitle className="text-lg leading-tight">{exam.title}</CardTitle>
                  <CardDescription className="text-gray-500">{exam.subjectName}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-sm space-y-3">
                  <div className="flex items-center text-gray-600 gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Duration: <strong>{exam.durationMinutes} minutes</strong></span>
                  </div>
                  <div className="flex items-center text-gray-600 gap-2">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span>Questions: <strong>{exam.totalQuestions}</strong></span>
                  </div>
                  {startTime && (
                    <div className="flex items-center text-gray-600 gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Start: <strong>{startTime.toLocaleString()}</strong></span>
                    </div>
                  )}
                  {endTime && (
                    <div className="flex items-center text-gray-600 gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>End: <strong>{endTime.toLocaleString()}</strong></span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t border-gray-100">
                  {alreadySubmitted ? (
                    <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" /> Already Submitted
                    </Button>
                  ) : expired ? (
                    <Button className="w-full" variant="outline" disabled>
                      Exam Expired
                    </Button>
                  ) : notStarted ? (
                    <Button className="w-full" variant="outline" disabled>
                      Starts {startTime?.toLocaleString()}
                    </Button>
                  ) : (
                    <Button className="w-full" asChild>
                      <Link href={`/student/exam/${exam.id}`}>
                        Start Exam
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}