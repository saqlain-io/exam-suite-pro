import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Eye } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetFacultyExams, 
  getGetFacultyExamsQueryKey, 
  useCreateExam, 
  useDeleteExam,
  useGetPrograms,
  useGetSubjects,
  useGetSemesters,
  useGetYears
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  programId: z.coerce.number().min(1, "Program is required"),
  subjectId: z.coerce.number().min(1, "Subject is required"),
  semesterId: z.coerce.number().min(1, "Semester is required"),
  yearId: z.coerce.number().optional().nullable(),
  durationMinutes: z.coerce.number().min(1, "Duration must be > 0"),
  totalQuestions: z.coerce.number().min(1, "Must have > 0 questions"),
  isActive: z.boolean()
});

export function FacultyExams() {
  const { data: exams, isLoading } = useGetFacultyExams();
  const { data: programs } = useGetPrograms();
  const { data: semesters } = useGetSemesters();
  const { data: subjects } = useGetSubjects();
  const { data: years } = useGetYears();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMut = useCreateExam();
  const deleteMut = useDeleteExam();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { 
      title: "", 
      programId: 0, 
      subjectId: 0, 
      semesterId: 0, 
      yearId: null,
      durationMinutes: 60,
      totalQuestions: 100,
      isActive: false
    }
  });

  // Filter subjects based on selected program and semester
  const selectedProgramId = form.watch("programId");
  const selectedSemesterId = form.watch("semesterId");
  const filteredSubjects = subjects?.filter(s => 
    (!selectedProgramId || s.programId === selectedProgramId) && 
    (!selectedSemesterId || s.semesterId === selectedSemesterId)
  ) || [];

  const onSubmit = (data: z.infer<typeof schema>) => {
    createMut.mutate({ data: { ...data, yearId: data.yearId || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFacultyExamsQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Exam created successfully" });
        form.reset();
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFacultyExamsQueryKey() });
        toast({ title: "Exam deleted" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Exams</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-exam">
              <Plus className="w-4 h-4 mr-2" /> Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem><FormLabel>Exam Title</FormLabel><FormControl><Input {...field} placeholder="e.g. Midterm 2026" /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="programId" render={({field}) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>{programs?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="semesterId" render={({field}) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>{semesters?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="subjectId" render={({field}) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""} disabled={!selectedProgramId || !selectedSemesterId}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="yearId" render={({field}) => (
                    <FormItem>
                      <FormLabel>Academic Year (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {years?.map(y => <SelectItem key={y.id} value={y.id.toString()}>{y.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="durationMinutes" render={({field}) => (
                    <FormItem><FormLabel>Duration (Minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="totalQuestions" render={({field}) => (
                    <FormItem><FormLabel>Total Questions Required</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="isActive" render={({field}) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-gray-500">
                        Students can only see and start active exams.
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createMut.isPending}>
                    Create Exam
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Program/Subject</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500">Loading exams...</TableCell></TableRow>
            ) : exams?.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-gray-900">{e.title}</TableCell>
                <TableCell>
                  <div className="text-sm">{e.programName}</div>
                  <div className="text-xs text-gray-500">{e.subjectName}</div>
                </TableCell>
                <TableCell>{e.durationMinutes}m</TableCell>
                <TableCell>
                  <span className={e.mcqCount === e.totalQuestions ? "text-green-600" : "text-amber-600"}>
                    {e.mcqCount || 0}
                  </span> / {e.totalQuestions}
                </TableCell>
                <TableCell>
                  <Badge variant={e.isActive ? "default" : "secondary"} className={e.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                    {e.isActive ? "Active" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/faculty/exams/${e.id}`}>
                        <Eye className="w-4 h-4 mr-2" /> Details
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete exam?</AlertDialogTitle>
                          <AlertDialogDescription>This action will permanently delete this exam and all its MCQs.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {exams?.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500">No exams found. Create one to get started.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
