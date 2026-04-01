import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BookOpen, GraduationCap, MonitorPlay } from "lucide-react";

export function AdminDashboard() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (!dashboard) return <div className="p-8 text-center text-red-500">Failed to load dashboard</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboard.totalStudents}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Faculty Members</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboard.totalFaculty}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Exams (Active/Total)</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboard.activeExams} / {dashboard.totalExams}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Live Attempts</CardTitle>
            <MonitorPlay className="h-4 w-4 text-blue-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{dashboard.liveAttempts}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold text-gray-900">Student</TableHead>
                <TableHead className="font-semibold text-gray-900">Exam</TableHead>
                <TableHead className="font-semibold text-gray-900">Score</TableHead>
                <TableHead className="font-semibold text-gray-900">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.recentResults?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.studentName} <span className="text-gray-500 font-normal">({r.rollNumber})</span></TableCell>
                  <TableCell>{r.examTitle}</TableCell>
                  <TableCell>
                    <span className={r.percentage >= 50 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {r.score}/{r.totalQuestions} ({r.percentage}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{new Date(r.submittedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!dashboard.recentResults?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">No recent exam submissions</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
