import { useGetMyResults } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, CheckCircle, XCircle } from "lucide-react";

export function StudentResults() {
  const { data: results, isLoading } = useGetMyResults();

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading results...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Exam Results</h1>
        <p className="text-gray-500 text-sm mt-1">View your performance across all completed exams.</p>
      </div>

      {!results || results.length === 0 ? (
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Results Yet</h3>
            <p className="text-gray-500 max-w-sm mt-1">You haven't completed any exams yet. Once you take an exam, your results will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="border-gray-200 shadow-sm overflow-hidden">
              <div className={`h-2 w-full ${result.percentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`} />
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{result.examTitle}</CardTitle>
                  <CardDescription>{result.subjectName}</CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${result.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.percentage}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {result.percentage >= 50 ? 'Passed' : 'Failed'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Score</p>
                    <p className="font-medium">{result.score} / {result.totalQuestions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Date Taken</p>
                    <p className="font-medium text-gray-900">{new Date(result.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Submission Type</p>
                    <div className="flex items-center gap-1.5">
                      {result.submissionReason === 'manual' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="font-medium text-gray-700 capitalize">
                        {result.submissionReason.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
