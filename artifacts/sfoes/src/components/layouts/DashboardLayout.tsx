import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LogOut, 
  User as UserIcon, 
  Building2, 
  BookOpen, 
  Users, 
  Calendar, 
  BarChart3, 
  FileText, 
  CheckSquare, 
  ClipboardList, 
  MonitorPlay,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { href: "/admin/programs", label: "Programs", icon: <Building2 className="w-4 h-4" /> },
  { href: "/admin/years", label: "Academic Years", icon: <Calendar className="w-4 h-4" /> },
  { href: "/admin/subjects", label: "Subjects", icon: <BookOpen className="w-4 h-4" /> },
  { href: "/admin/live-exams", label: "Live Exams", icon: <MonitorPlay className="w-4 h-4" /> },
  { href: "/admin/results", label: "Results", icon: <ClipboardList className="w-4 h-4" /> },
];

const facultyNav: NavItem[] = [
  { href: "/faculty", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
  { href: "/faculty/exams", label: "Exams", icon: <FileText className="w-4 h-4" /> },
];

const studentNav: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
  { href: "/student/results", label: "My Results", icon: <CheckSquare className="w-4 h-4" /> },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = user?.role === "admin" 
    ? adminNav 
    : user?.role === "faculty" 
      ? facultyNav 
      : studentNav;

  const isActive = (href: string) => {
    if (href === "/admin" || href === "/faculty" || href === "/student") {
      return location === href;
    }
    return location.startsWith(href);
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link 
          key={item.href} 
          href={item.href} 
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive(item.href) 
              ? "bg-blue-50 text-blue-700" 
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </>
  );

  const UserInfo = () => (
    <div className="flex items-center gap-3 px-3 py-2 mb-2">
      <div className="bg-blue-100 p-2 rounded-full text-blue-600 flex-shrink-0">
        <UserIcon className="w-4 h-4" />
      </div>
      <div className="overflow-hidden">
        <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
        <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/" className="font-bold text-xl text-blue-600 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            SFOES
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <UserInfo />
          <Button variant="outline" className="w-full justify-start text-gray-600 bg-white" onClick={logout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="w-5 h-5 text-gray-600" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="h-16 flex items-center justify-center border-b border-gray-200 px-6">
                  <SheetTitle className="font-bold text-xl text-blue-600 flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    SFOES
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                  <NavLinks />
                </nav>
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <UserInfo />
                  <Button variant="outline" className="w-full justify-start text-gray-600 bg-white" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="font-bold text-lg text-blue-600">SFOES</div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
