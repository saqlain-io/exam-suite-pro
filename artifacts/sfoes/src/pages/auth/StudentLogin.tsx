import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, GraduationCap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const studentLoginSchema = z.object({
  rollNumber: z.string().min(1, "Roll number is required"),
  password: z.string().min(1, "Password is required"),
});

export function StudentLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof studentLoginSchema>>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { rollNumber: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof studentLoginSchema>) => {
    setIsLoading(true);
    try {
      const res = await fetch("https://examapi-chi.vercel.app/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: data.rollNumber, password: data.password }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: "Login Failed",
          description: result.message || "Invalid roll number or password",
          variant: "destructive",
        });
        return;
      }

      login(result.user, result.token);
      setLocation("/student");
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <CardDescription>Enter your roll number and password</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                <FormField
                  control={form.control}
                  name="rollNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g. GBSN-2026-001"
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  disabled={isLoading}
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  {isLoading ? "Logging in..." : "Student Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-600">
              Staff member?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
                Staff Login
              </Link>
            </p>
            <p className="text-xs text-gray-400 text-center">
              Forgot password? Contact your administrator to reset it.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}