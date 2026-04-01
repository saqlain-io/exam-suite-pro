import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetUsers, 
  getGetUsersQueryKey, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser, 
  User,
  useGetPrograms,
  useGetYears,
  GetUsersRole,
  CreateUserRequestRole
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  password: z.string().optional(),
  role: z.enum(["admin", "faculty", "student"]),
  programId: z.coerce.number().optional().nullable(),
  yearId: z.coerce.number().optional().nullable(),
  rollNumber: z.string().optional().nullable(),
});

export function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState<GetUsersRole | undefined>();
  const { data: users, isLoading } = useGetUsers({ role: roleFilter }, { query: { enabled: true } });
  const { data: programs } = useGetPrograms();
  const { data: years } = useGetYears();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", name: "", password: "", role: "student", programId: null, yearId: null, rollNumber: "" }
  });

  const watchRole = form.watch("role");

  const onSubmit = (data: z.infer<typeof schema>) => {
    const payload = {
      ...data,
      programId: data.programId || null,
      yearId: data.yearId || null,
      rollNumber: data.rollNumber || null
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "User updated" });
        }
      });
    } else {
      if (!payload.password) payload.password = "123456"; // default for new users if empty
      createMut.mutate({ data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "User created" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Could not create user", variant: "destructive" });
        }
      });
    }
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    form.reset({ 
      username: u.username, 
      name: u.name, 
      password: "", 
      role: u.role,
      programId: u.programId || null,
      yearId: u.yearId || null,
      rollNumber: u.rollNumber || ""
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ username: "", name: "", password: "", role: "student", programId: null, yearId: null, rollNumber: "" });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        toast({ title: "User deleted" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Users</h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? undefined : v as GetUsersRole)}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Create"} User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({field}) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="username" render={({field}) => (
                      <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="password" render={({field}) => (
                      <FormItem>
                        <FormLabel>Password {editingId && "(Leave blank to keep current)"}</FormLabel>
                        <FormControl><Input type="password" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="role" render={({field}) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingId}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="faculty">Faculty</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {watchRole === "student" && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="programId" render={({field}) => (
                          <FormItem>
                            <FormLabel>Program</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {programs?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="yearId" render={({field}) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {years?.map(y => <SelectItem key={y.id} value={y.id.toString()}>{y.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="rollNumber" render={({field}) => (
                        <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                      Save User
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500">Loading users...</TableCell></TableRow>
            ) : users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-gray-500">{u.username}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : u.role === "faculty" ? "secondary" : "outline"} className="capitalize">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {u.role === "student" ? (
                    <span>{u.rollNumber}</span>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user?</AlertDialogTitle>
                          <AlertDialogDescription>This action will permanently delete {u.name}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(u.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500">No users found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
