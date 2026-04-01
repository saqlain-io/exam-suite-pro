import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

// Auth
import { Login } from "@/pages/auth/Login";
import { StudentLogin } from "@/pages/auth/StudentLogin";

// Admin
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AdminUsers } from "@/pages/admin/Users";
import { AdminPrograms } from "@/pages/admin/Programs";
import { AdminYears } from "@/pages/admin/Years";
import { AdminSubjects } from "@/pages/admin/Subjects";
import { AdminLiveExams } from "@/pages/admin/LiveExams";
import { AdminResults } from "@/pages/admin/Results";

// Faculty
import { FacultyDashboard } from "@/pages/faculty/Dashboard";
import { FacultyExams } from "@/pages/faculty/Exams";
import { FacultyExamDetail } from "@/pages/faculty/ExamDetail";

// Student
import { StudentDashboard } from "@/pages/student/Dashboard";
import { StudentExam } from "@/pages/student/Exam";
import { StudentResults } from "@/pages/student/Results";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Route Guards
function ProtectedRoute({ component: Component, allowedRoles, hideLayout = false }: { component: any, allowedRoles?: string[], hideLayout?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading profile...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Redirect to="/admin" />;
    if (user.role === 'faculty') return <Redirect to="/faculty" />;
    return <Redirect to="/student" />;
  }

  if (hideLayout) {
    return <Component />;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function HomeRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

  if (!user) return <Redirect to="/login" />;

  if (user.role === 'admin') return <Redirect to="/admin" />;
  if (user.role === 'faculty') return <Redirect to="/faculty" />;
  return <Redirect to="/student" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRouter} />
      <Route path="/login" component={Login} />
      <Route path="/student-login" component={StudentLogin} />

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsers} allowedRoles={['admin']} />
      </Route>
      <Route path="/admin/programs">
        <ProtectedRoute component={AdminPrograms} allowedRoles={['admin']} />
      </Route>
      <Route path="/admin/years">
        <ProtectedRoute component={AdminYears} allowedRoles={['admin']} />
      </Route>
      <Route path="/admin/subjects">
        <ProtectedRoute component={AdminSubjects} allowedRoles={['admin']} />
      </Route>
      <Route path="/admin/live-exams">
        <ProtectedRoute component={AdminLiveExams} allowedRoles={['admin']} />
      </Route>
      <Route path="/admin/results">
        <ProtectedRoute component={AdminResults} allowedRoles={['admin']} />
      </Route>

      {/* Faculty Routes */}
      <Route path="/faculty">
        <ProtectedRoute component={FacultyDashboard} allowedRoles={['faculty', 'admin']} />
      </Route>
      <Route path="/faculty/exams">
        <ProtectedRoute component={FacultyExams} allowedRoles={['faculty', 'admin']} />
      </Route>
      <Route path="/faculty/exams/:id">
        <ProtectedRoute component={FacultyExamDetail} allowedRoles={['faculty', 'admin']} />
      </Route>

      {/* Student Routes */}
      <Route path="/student">
        <ProtectedRoute component={StudentDashboard} allowedRoles={['student']} />
      </Route>
      <Route path="/student/exam/:id">
        <ProtectedRoute component={StudentExam} allowedRoles={['student']} hideLayout={true} />
      </Route>
      <Route path="/student/results">
        <ProtectedRoute component={StudentResults} allowedRoles={['student']} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
