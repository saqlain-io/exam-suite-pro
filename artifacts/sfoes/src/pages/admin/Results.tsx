import { useState } from "react";
import { useGetAdminResults, useGetPrograms, useGetFacultyExams } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ExcelJS from "exceljs";

export function AdminResults() {
  const [programId, setProgramId] = useState<number | undefined>();
  const [examId, setExamId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rollNumber" | "percentage" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: programs } = useGetPrograms();
  const { data: exams } = useGetFacultyExams();
  const { data: results, isLoading } = useGetAdminResults({ programId }, { query: { enabled: true } });

  // Filter by exam and search
  const filteredResults = results?.filter(r => {
    if (examId && r.examId !== examId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.studentName?.toLowerCase().includes(q) ||
        r.rollNumber?.toLowerCase().includes(q) ||
        r.examTitle?.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    let valA: any, valB: any;
    if (sortBy === "rollNumber") {
      valA = a.rollNumber || "";
      valB = b.rollNumber || "";
    } else if (sortBy === "percentage") {
      valA = a.percentage || 0;
      valB = b.percentage || 0;
    } else {
      valA = new Date(a.submittedAt).getTime();
      valB = new Date(b.submittedAt).getTime();
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: "rollNumber" | "percentage" | "date") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleExport = async () => {
    if (!sortedResults.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Exam Results");
    worksheet.columns = [
      { header: "Student Name", key: "studentName", width: 25 },
      { header: "Roll Number", key: "rollNumber", width: 20 },
      { header: "Program", key: "programName", width: 20 },
      { header: "Subject", key: "subjectName", width: 20 },
      { header: "Exam Title", key: "examTitle", width: 25 },
      { header: "Score", key: "score", width: 10 },
      { header: "Total Questions", key: "totalQuestions", width: 15 },
      { header: "Percentage (%)", key: "percentage", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Date Submitted", key: "submittedAt", width: 20 },
    ];

    // Header style
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
    });

    sortedResults.forEach(r => {
      const row = worksheet.addRow({
        studentName: r.studentName,
        rollNumber: r.rollNumber,
        programName: r.programName,
        subjectName: r.subjectName,
        examTitle: r.examTitle,
        score: r.score,
        totalQuestions: r.totalQuestions,
        percentage: r.percentage,
        status: r.percentage >= 50 ? "Pass" : "Fail",
        submittedAt: new Date(r.submittedAt).toLocaleString(),
      });

      // Color pass/fail
      const percentageCell = row.getCell("percentage");
      percentageCell.font = {
        color: { argb: r.percentage >= 50 ? "FF2E7D32" : "FFC62828" },
        bold: true
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SFOES_Results_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Exam Results</h1>
          <p className="text-gray-500 text-sm mt-1">
            {sortedResults.length} records found
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="bg-white" disabled={!sortedResults.length}>
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={programId?.toString() || "all"} onValueChange={(v) => { setProgramId(v === "all" ? undefined : parseInt(v)); setExamId(undefined); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs?.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={examId?.toString() || "all"} onValueChange={(v) => setExamId(v === "all" ? undefined : parseInt(v))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams?.map((e: any) => (
              <SelectItem key={e.id} value={e.id.toString()}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
          const [field, order] = v.split("-");
          setSortBy(field as any);
          setSortOrder(order as any);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Latest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="rollNumber-asc">Roll No. A-Z</SelectItem>
            <SelectItem value="rollNumber-desc">Roll No. Z-A</SelectItem>
            <SelectItem value="percentage-desc">Highest Score</SelectItem>
            <SelectItem value="percentage-asc">Lowest Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort("rollNumber")}
              >
                Student {sortBy === "rollNumber" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Subject / Exam</TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort("percentage")}
              >
                Score {sortBy === "percentage" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort("date")}
              >
                Date {sortBy === "date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500">Loading results...</TableCell></TableRow>
            ) : sortedResults.length > 0 ? (
              sortedResults.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{r.studentName}</div>
                    <div className="text-xs text-gray-500 font-mono">{r.rollNumber}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{r.programName}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.examTitle}</div>
                    <div className="text-xs text-gray-500">{r.subjectName}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold text-lg ${r.percentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                      {r.percentage}%
                    </span>
                    <div className="text-xs text-gray-500">{r.score}/{r.totalQuestions}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.percentage >= 50 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {r.percentage >= 50 ? "Pass" : "Fail"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {new Date(r.submittedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500">No results found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}