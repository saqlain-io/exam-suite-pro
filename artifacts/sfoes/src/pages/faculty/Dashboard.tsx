import { useGetFacultyDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Database, Activity, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FacultyDashboard() {
  const { data: dashboard, isLoading } = useGetFacultyDashboard();

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (!dashboard) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Faculty Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Exams Created</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboard.totalExams}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Questions Bank (MCQs)</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboard.totalMcqs}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Active Exams</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{dashboard.activeExams}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-gray-400" />
            Recent Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Program / Subject</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.recentExams?.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium text-gray-900">{exam.title}</TableCell>
                  <TableCell className="text-gray-500">{exam.programName} - {exam.subjectName}</TableCell>
                  <TableCell>
                    {exam.mcqCount || 0} / {exam.totalQuestions}
                  </TableCell>
                  <TableCell>
                    {exam.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Draft</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!dashboard.recentExams?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">You haven't created any exams yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
