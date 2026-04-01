import { useGetLiveExams } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AdminLiveExams() {
  const { data: activeAttempts, isLoading } = useGetLiveExams();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Live Exam Monitor</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time view of students currently taking exams.</p>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle className="text-lg">Active Sessions</CardTitle>
          <CardDescription>
            {activeAttempts?.length || 0} students currently taking an exam.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Exam Title</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">Loading active sessions...</TableCell>
                </TableRow>
              ) : activeAttempts && activeAttempts.length > 0 ? (
                activeAttempts.map((attempt) => {
                  const progress = Math.round((attempt.answeredCount / attempt.totalQuestions) * 100) || 0;
                  return (
                    <TableRow key={attempt.attemptId}>
                      <TableCell className="font-medium pl-6">{attempt.studentName}</TableCell>
                      <TableCell>{attempt.rollNumber}</TableCell>
                      <TableCell>{attempt.examTitle}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{attempt.answeredCount}/{attempt.totalQuestions}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(attempt.startedAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Progress</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No active exam sessions right now.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
