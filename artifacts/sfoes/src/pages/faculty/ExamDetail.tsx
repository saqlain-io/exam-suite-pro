import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, ArrowLeft, Trash2, AlertCircle, FileSpreadsheet, Pencil } from "lucide-react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { 
  useGetExamById, 
  getGetExamByIdQueryKey,
  useBulkUploadMcqs,
  useDeleteMcq,
  McqInputCorrectOption
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FacultyExamDetail() {
  const { id } = useParams();
  const examId = parseInt(id || "0");
  
  const { data, isLoading } = useGetExamById(examId, { query: { enabled: !!examId, queryKey: getGetExamByIdQueryKey(examId) } });
  const bulkMut = useBulkUploadMcqs();
  const deleteMcqMut = useDeleteMcq();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    durationMinutes: 60,
    totalQuestions: 50,
    startTime: "",
    endTime: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-red-600">Exam not found</div>;

  const { exam, mcqs } = data;

 const openEdit = () => {
  const toLocalInput = (dateStr: any) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };
  setEditForm({
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    totalQuestions: exam.totalQuestions,
    startTime: toLocalInput((exam as any).startTime),
    endTime: toLocalInput((exam as any).endTime),
  });
  setIsEditOpen(true);
};
  const handleSaveEdit = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    
    // Convert local datetime to UTC ISO string
    const toUTC = (localStr: string) => {
      if (!localStr) return null;
      return new Date(localStr).toISOString();
    };

    const res = await fetch(`https://examapi-chi.vercel.app/api/faculty/exams/${examId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title,
        durationMinutes: Number(editForm.durationMinutes),
        totalQuestions: Number(editForm.totalQuestions),
        startTime: toUTC(editForm.startTime),
        endTime: toUTC(editForm.endTime),
      })
    });
    if (!res.ok) throw new Error("Failed to update exam");
    queryClient.invalidateQueries({ queryKey: getGetExamByIdQueryKey(examId) });
    toast({ title: "Exam updated successfully!" });
    setIsEditOpen(false);
  } catch (err: any) {
    toast({ title: "Error", description: err.message, variant: "destructive" });
  }
};
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`https://examapi-chi.vercel.app/api/exams/${examId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to publish");
      queryClient.invalidateQueries({ queryKey: getGetExamByIdQueryKey(examId) });
      toast({ title: "Exam published successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIsPublishing(false);
  };

  const handleUnpublish = async () => {
    setIsPublishing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`https://examapi-chi.vercel.app/api/exams/${examId}/unpublish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to unpublish");
      queryClient.invalidateQueries({ queryKey: getGetExamByIdQueryKey(examId) });
      toast({ title: "Exam moved to draft!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIsPublishing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    try {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => processParsedData(results.data),
          error: (error) => setParseError(`CSV Parse Error: ${error.message}`)
        });
      } else if (file.name.match(/\.(xlsx|xls)$/)) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const buffer = evt.target?.result as ArrayBuffer;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.worksheets[0];
            const headers: string[] = [];
            const rows: Record<string, any>[] = [];
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) {
                row.eachCell((cell) => headers.push(String(cell.value ?? "")));
              } else {
                const obj: Record<string, any> = {};
                row.eachCell((cell, colNumber) => {
                  obj[headers[colNumber - 1]] = cell.value;
                });
                rows.push(obj);
              }
            });
            processParsedData(rows);
          } catch (err: any) {
            setParseError(`Excel Parse Error: ${err.message}`);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setParseError("Invalid file type. Please upload CSV or Excel (.xlsx)");
      }
    } catch (err: any) {
      setParseError(err.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processParsedData = (data: any[]) => {
    try {
      const parsedMcqs = data.map((row: any, i: number) => {
        if (!row.questionText || !row.optionA || !row.optionB || !row.optionC || !row.optionD || !row.correctOption) {
          throw new Error(`Row ${i + 1} is missing required fields.`);
        }
        const correct = String(row.correctOption).toUpperCase().trim();
        if (!["A", "B", "C", "D"].includes(correct)) {
          throw new Error(`Row ${i + 1}: correctOption must be A, B, C, or D`);
        }
        return {
          questionNumber: parseInt(row.questionNumber) || i + 1,
          questionText: String(row.questionText),
          optionA: String(row.optionA),
          optionB: String(row.optionB),
          optionC: String(row.optionC),
          optionD: String(row.optionD),
          correctOption: correct as McqInputCorrectOption
        };
      });
      bulkMut.mutate({ id: examId, data: { mcqs: parsedMcqs } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetExamByIdQueryKey(examId) });
          toast({ title: "Questions uploaded successfully" });
        },
        onError: (err: any) => {
          setParseError(`Upload Failed: ${err.message}`);
        }
      });
    } catch (err: any) {
      setParseError(err.message);
    }
  };

  const handleDeleteMcq = (mcqId: number) => {
    deleteMcqMut.mutate({ id: mcqId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExamByIdQueryKey(examId) });
        toast({ title: "Question deleted" });
      }
    });
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");
    worksheet.columns = [
      { header: "questionNumber", key: "questionNumber" },
      { header: "questionText", key: "questionText" },
      { header: "optionA", key: "optionA" },
      { header: "optionB", key: "optionB" },
      { header: "optionC", key: "optionC" },
      { header: "optionD", key: "optionD" },
      { header: "correctOption", key: "correctOption" },
    ];
    worksheet.addRow({
      questionNumber: 1,
      questionText: "What is the powerhouse of the cell?",
      optionA: "Nucleus",
      optionB: "Mitochondria",
      optionC: "Ribosome",
      optionD: "Endoplasmic reticulum",
      correctOption: "B",
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MCQ_Upload_Template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/faculty/exams">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <p className="text-sm text-gray-500">{exam.programName} - {exam.subjectName}</p>
        </div>
        <Button variant="outline" onClick={openEdit}>
          <Pencil className="w-4 h-4 mr-2" /> Edit Exam
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exam Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Exam Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Duration (Minutes)</label>
                <Input
                  type="number"
                  value={editForm.durationMinutes}
                  onChange={(e) => setEditForm({...editForm, durationMinutes: Number(e.target.value)})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total Questions Required</label>
                <Input
                  type="number"
                  value={editForm.totalQuestions}
                  onChange={(e) => setEditForm({...editForm, totalQuestions: Number(e.target.value)})}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Start Time</label>
                <Input
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({...editForm, startTime: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">End Time</label>
                <Input
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({...editForm, endTime: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Exam Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Status</span>
              <Badge variant={exam.isActive ? "default" : "secondary"}>
                {exam.isActive ? "Active" : "Draft"}
              </Badge>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Duration</span>
              <span className="font-medium">{exam.durationMinutes} mins</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Total Required</span>
              <span className="font-medium">{exam.totalQuestions} questions</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Current MCQs</span>
              <span className={`font-medium ${mcqs.length >= exam.totalQuestions ? 'text-green-600' : 'text-amber-600'}`}>
                {mcqs.length} uploaded
              </span>
            </div>
            {(exam as any).startTime && (
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Start</span>
                <span className="font-medium text-xs">{new Date((exam as any).startTime).toLocaleString()}</span>
              </div>
            )}
            {(exam as any).endTime && (
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">End</span>
                <span className="font-medium text-xs">{new Date((exam as any).endTime).toLocaleString()}</span>
              </div>
            )}

            {!exam.isActive && mcqs.length >= exam.totalQuestions && (
              <Button className="w-full mt-2" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? "Publishing..." : "🚀 Publish Exam"}
              </Button>
            )}

            {exam.isActive && (
              <Button className="w-full mt-2" variant="outline" onClick={handleUnpublish} disabled={isPublishing}>
                {isPublishing ? "Processing..." : "⏸ Move to Draft"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bulk Upload MCQs</CardTitle>
          </CardHeader>
          <CardContent>
            {parseError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={bulkMut.isPending} className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                {bulkMut.isPending ? "Uploading..." : "Upload CSV / Excel"}
              </Button>
              <div className="text-sm text-gray-500 flex-1">
                Columns: <code className="bg-gray-100 px-1 py-0.5 rounded">questionNumber, questionText, optionA-D, correctOption</code>
              </div>
              <Button variant="outline" onClick={downloadTemplate} size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">Question Bank</h3>
          <span className="text-sm text-gray-500">{mcqs.length} questions</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Options</TableHead>
              <TableHead className="w-[80px] text-center">Correct</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mcqs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500">No questions uploaded yet.</TableCell></TableRow>
            ) : mcqs.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium text-gray-500">{q.questionNumber}</TableCell>
                <TableCell className="font-medium">{q.questionText}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="font-medium">A:</span> {q.optionA}</div>
                    <div><span className="font-medium">B:</span> {q.optionB}</div>
                    <div><span className="font-medium">C:</span> {q.optionC}</div>
                    <div><span className="font-medium">D:</span> {q.optionD}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-blue-600">{q.correctOption}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMcq(q.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}