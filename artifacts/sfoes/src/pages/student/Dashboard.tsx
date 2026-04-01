import { Link } from "wouter";
import { useGetAvailableExams } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function StudentDashboard() {
  const { data: exams, isLoading } = useGetAvailableExams();

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
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <FileText className="w-5 h-5" />
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
              </CardContent>
              <CardFooter className="pt-4 border-t border-gray-100">
                <Button className="w-full" asChild>
                  <Link href={`/student/exam/${exam.id}`}>
                    Start Exam
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
