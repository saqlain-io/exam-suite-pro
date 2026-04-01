import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useStudentLogin, 
  useGetStudentPrograms, 
  useGetYears, 
  useGetStudentList 
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const studentLoginSchema = z.object({
  programId: z.number().min(1, "Program is required"),
  yearId: z.number().min(1, "Academic Year is required"),
  studentId: z.number().min(1, "Student selection is required"),
});

export function StudentLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useStudentLogin();

  const { data: programs } = useGetStudentPrograms();
  const { data: years } = useGetYears();

  const form = useForm<z.infer<typeof studentLoginSchema>>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      programId: 0,
      yearId: 0,
      studentId: 0,
    },
  });

  const programId = form.watch("programId");
  const yearId = form.watch("yearId");

  const { data: students, isLoading: isLoadingStudents } = useGetStudentList(
    { programId, yearId },
    { 
      query: { 
        enabled: programId > 0 && yearId > 0 
      } 
    }
  );

  // Reset student selection when program or year changes
  useEffect(() => {
    form.setValue("studentId", 0);
  }, [programId, yearId, form]);

  const onSubmit = (data: z.infer<typeof studentLoginSchema>) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          login(res.user, res.token);
          setLocation("/student");
        },
        onError: (err: any) => {
          toast({
            title: "Login Failed",
            description: err?.message || err?.data?.message || "Could not authenticate student",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">SFOES Portal</h2>
          <p className="mt-2 text-sm text-gray-600">Sehhat Foundation Online Exam System</p>
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-200/50">
          <CardHeader className="space-y-1 text-center border-b border-gray-100 bg-white rounded-t-xl pb-6">
            <CardTitle className="text-xl">Student Login</CardTitle>
            <CardDescription>Select your details to access exams</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-program">
                            <SelectValue placeholder="Select Program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programs?.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} ({p.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-year">
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years?.map((y) => (
                            <SelectItem key={y.id} value={y.id.toString()}>
                              {y.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Name</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                        value={field.value ? field.value.toString() : ""}
                        disabled={!programId || !yearId || isLoadingStudents || !students?.length}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-student">
                            <SelectValue placeholder={
                              !programId || !yearId ? "Select Program & Year first" :
                              isLoadingStudents ? "Loading students..." : 
                              students?.length ? "Select your name" : "No students found"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  disabled={loginMutation.isPending || !form.watch("studentId")}
                  data-testid="button-student-login"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  {loginMutation.isPending ? "Entering..." : "Enter Portal"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-600">
              Staff member?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
                Staff Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
