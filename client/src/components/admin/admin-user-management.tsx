import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Users,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

function CreateAdminDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });

  const createAdminMutation = useMutation({
    mutationFn: async (adminData: typeof formData) => {
      const response = await apiRequest("POST", "/api/admin/users/admins", adminData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admins"] });
      toast({
        title: "Admin Created",
        description: "New admin user has been created successfully.",
      });
      setOpen(false);
      setFormData({ email: "", firstName: "", lastName: "", password: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Validation Error",
        description: "Email, first name, and last name are required",
        variant: "destructive",
      });
      return;
    }
    createAdminMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-hive-purple hover:bg-hive-purple/90"
          data-testid="button-create-admin"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Admin User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-hive-purple" />
            Create New Admin User
          </DialogTitle>
          <DialogDescription>
            Create a new administrator account for Hive staff members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@hive-wellness.co.uk"
              required
              data-testid="input-admin-email"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                required
                data-testid="input-admin-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Smith"
                required
                data-testid="input-admin-lastname"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank for system-generated password"
              data-testid="input-admin-password"
            />
            <p className="text-xs text-gray-500">
              If left blank, a temporary password will be generated and sent via email.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAdminMutation.isPending}
              className="bg-hive-purple hover:bg-hive-purple/90"
              data-testid="button-submit-admin"
            >
              {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAdminDialog({ admin }: { admin: AdminUser }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    isActive: admin.isActive,
  });

  const updateAdminMutation = useMutation({
    mutationFn: async (updates: typeof formData) => {
      const response = await apiRequest("PUT", `/api/admin/users/admins/${admin.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admins"] });
      toast({
        title: "Admin Updated",
        description: "Admin user has been updated successfully.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin user",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateAdminMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-edit-admin-${admin.id}`}>
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-hive-blue" />
            Edit Admin User
          </DialogTitle>
          <DialogDescription>Update the administrator account details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              data-testid="input-edit-admin-email"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                data-testid="input-edit-admin-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                data-testid="input-edit-admin-lastname"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              data-testid="switch-edit-admin-active"
            />
            <Label htmlFor="edit-isActive">Account Active</Label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateAdminMutation.isPending}
              className="bg-hive-blue hover:bg-hive-blue/90"
              data-testid="button-submit-edit-admin"
            >
              {updateAdminMutation.isPending ? "Updating..." : "Update Admin"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAdminDialog({ admin }: { admin: AdminUser }) {
  const { toast } = useToast();

  const deleteAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/admin/users/admins/${admin.id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admins"] });
      toast({
        title: "Admin Deleted",
        description: "Admin user has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin user",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          data-testid={`button-delete-admin-${admin.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the admin account for{" "}
            <strong>
              {admin.firstName} {admin.lastName}
            </strong>{" "}
            ({admin.email})? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteAdminMutation.mutate()}
            disabled={deleteAdminMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-confirm-delete-admin"
          >
            {deleteAdminMutation.isPending ? "Deleting..." : "Delete Admin"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminUserManagement() {
  const { toast } = useToast();

  const {
    data: adminUsersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/admin/users/admins"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const adminUsers = adminUsersData?.admins || [];

  if (isLoading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="font-primary text-hive-purple flex items-center gap-2">
            <Users className="w-5 h-5" />
            Admin User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hive-purple"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="font-primary text-hive-purple flex items-center gap-2">
            <Users className="w-5 h-5" />
            Admin User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Error loading admin users. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="font-primary text-hive-purple flex items-center gap-2">
              <Users className="w-5 h-5" />
              Admin User Management
            </CardTitle>
            <p className="text-sm text-hive-black/70 mt-1">
              Manage administrator accounts for Hive staff members
            </p>
          </div>
          <CreateAdminDialog />
        </div>
      </CardHeader>
      <CardContent>
        {adminUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No admin users found.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-4 text-sm text-hive-black/70">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>
                  {adminUsers.length} Admin{adminUsers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{adminUsers.filter((admin) => admin.isActive).length} Active</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>{adminUsers.filter((admin) => !admin.isActive).length} Inactive</span>
              </div>
            </div>

            <div className="rounded-md border">
              <Table data-testid="table-admin-users">
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin Details</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((admin: AdminUser) => (
                    <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-hive-black">
                            {admin.firstName} {admin.lastName}
                          </div>
                          <div className="text-sm text-hive-black/60">ID: {admin.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-hive-black/60" />
                          <span className="text-sm">{admin.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={admin.isActive ? "default" : "destructive"}
                          className={admin.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-hive-black/60">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(admin.createdAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-hive-black/60">
                          {admin.lastLoginAt
                            ? new Date(admin.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditAdminDialog admin={admin} />
                          <DeleteAdminDialog admin={admin} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
