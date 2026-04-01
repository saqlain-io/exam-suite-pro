import { useState } from "react";
import { useGetAdminResults, useGetPrograms } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

export function AdminResults() {
  const [programId, setProgramId] = useState<number | undefined>();
  const { data: programs } = useGetPrograms();
  const { data: results, isLoading } = useGetAdminResults({ programId }, { query: { enabled: true } });

  const handleExport = () => {
    if (!results || results.length === 0) return;

    const wsData = results.map(r => ({
      "Student Name": r.studentName,
      "Roll Number": r.rollNumber,
      "Program": r.programName,
      "Subject": r.subjectName,
      "Exam Title": r.examTitle,
      "Score": r.score,
      "Total Questions": r.totalQuestions,
      "Percentage (%)": r.percentage,
      "Date Submitted": new Date(r.submittedAt).toLocaleString(),
      "Reason": r.submissionReason
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Results");
    XLSX.writeFile(wb, "SFOES_Exam_Results.xlsx");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Exam Results</h1>
          <p className="text-gray-500 text-sm mt-1">View and export all student examination records.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={programId?.toString() || "all"} onValueChange={(v) => setProgramId(v === "all" ? undefined : parseInt(v))}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExport} variant="outline" className="bg-white" disabled={!results?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Exam Title</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500">Loading results...</TableCell></TableRow>
            ) : results && results.length > 0 ? (
              results.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{r.studentName}</div>
                    <div className="text-xs text-gray-500">{r.rollNumber}</div>
                  </TableCell>
                  <TableCell>{r.programName}</TableCell>
                  <TableCell>{r.subjectName}</TableCell>
                  <TableCell className="font-medium text-gray-700">{r.examTitle}</TableCell>
                  <TableCell className="text-center">
                    <span className={r.percentage >= 50 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {r.percentage}%
                    </span>
                    <div className="text-xs text-gray-500">{r.score}/{r.totalQuestions}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                      {r.submissionReason.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {new Date(r.submittedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500">No results found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
