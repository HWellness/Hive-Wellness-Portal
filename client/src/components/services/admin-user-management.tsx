import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Ban,
  RotateCcw,
  Edit,
  Eye,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import type { User } from "@shared/schema";

interface AdminUserManagementProps {
  user: User;
}

interface PlatformUser {
  id: string;
  username: string;
  email: string;
  role: "client" | "therapist" | "admin" | "institution";
  status: "active" | "suspended" | "pending" | "archived";
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  assignedTherapist?: string;
  institution?: string;
  department?: string;
  sessionsCount?: number;
  totalSpent?: number;
}

export default function AdminUserManagement({ user }: AdminUserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  // Form states
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "client",
    phone: "",
    institution: "",
    department: "",
  });

  const [suspendData, setSuspendData] = useState({
    reason: "",
    duration: "30",
  });

  // Demo user data - In production this would come from API
  const demoUsers: PlatformUser[] = [
    {
      id: "user-1",
      username: "emma.johnson",
      email: "emma.johnson@example.com",
      role: "client",
      status: "active",
      firstName: "Emma",
      lastName: "Johnson",
      phone: "+44 7700 900123",
      createdAt: "2024-11-15T10:30:00Z",
      lastLoginAt: "2025-02-01T14:20:00Z",
      assignedTherapist: "Dr. Sarah Chen",
      sessionsCount: 8,
      totalSpent: 680,
    },
    {
      id: "user-2",
      username: "dr.sarah.chen",
      email: "sarah.chen@hivewellness.co.uk",
      role: "therapist",
      status: "active",
      firstName: "Dr. Sarah",
      lastName: "Chen",
      phone: "+44 7700 900456",
      createdAt: "2024-10-01T09:00:00Z",
      lastLoginAt: "2025-02-02T09:15:00Z",
      sessionsCount: 124,
      totalSpent: 0,
    },
    {
      id: "user-3",
      username: "university.admin",
      email: "admin@university.edu",
      role: "institution",
      status: "active",
      firstName: "University",
      lastName: "Administrator",
      institution: "Cambridge University",
      department: "Student Services",
      createdAt: "2024-09-01T08:00:00Z",
      lastLoginAt: "2025-02-01T16:45:00Z",
    },
    {
      id: "user-4",
      username: "james.wilson",
      email: "james.wilson@example.com",
      role: "client",
      status: "suspended",
      firstName: "James",
      lastName: "Wilson",
      createdAt: "2024-12-01T11:30:00Z",
      lastLoginAt: "2025-01-15T13:20:00Z",
      sessionsCount: 3,
      totalSpent: 255,
    },
  ];

  // Filter users based on search and filters
  const filteredUsers = demoUsers.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return await apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User created successfully",
        description: "New user has been added to the platform",
      });
      setShowAddUser(false);
      setNewUserData({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        role: "client",
        phone: "",
        institution: "",
        department: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
      duration,
    }: {
      userId: string;
      reason: string;
      duration: string;
    }) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { reason, duration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User suspended successfully",
        description: "User has been suspended and access revoked",
      });
      setShowSuspendDialog(false);
      setSelectedUser(null);
      setSuspendData({ reason: "", duration: "30" });
    },
    onError: (error: any) => {
      toast({
        title: "Error suspending user",
        description: error.message || "Failed to suspend user",
        variant: "destructive",
      });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User reactivated successfully",
        description: "User account has been reactivated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error reactivating user",
        description: error.message || "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  const handleSuspendUser = (user: PlatformUser) => {
    setSelectedUser(user);
    setShowSuspendDialog(true);
  };

  const handleConfirmSuspend = () => {
    if (!selectedUser || !suspendData.reason.trim()) {
      toast({
        title: "Information required",
        description: "Please provide a reason for suspension",
        variant: "destructive",
      });
      return;
    }

    suspendUserMutation.mutate({
      userId: selectedUser.id,
      reason: suspendData.reason,
      duration: suspendData.duration,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      archived: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status}
      </Badge>
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "client":
        return <Users className="h-4 w-4" />;
      case "therapist":
        return <UserCheck className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "institution":
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hive-black">User Management</h1>
          <p className="text-gray-600 mt-1">Manage platform users, roles, and permissions</p>
        </div>

        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogTrigger asChild>
            <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUserData.firstName}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="Emma"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="Johnson"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUserData.username}
                  onChange={(e) =>
                    setNewUserData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="emma.johnson"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="emma@example.com"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value) => setNewUserData((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddUser(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createUserMutation.mutate(newUserData)}
                  disabled={createUserMutation.isPending}
                  className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search & Filter Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="client">Clients</SelectItem>
                  <SelectItem value="therapist">Therapists</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="institution">Institutions</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-hive-light-blue rounded-full">
                    {getRoleIcon(user.role)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-hive-black">
                        {user.firstName} {user.lastName}
                      </h3>
                      {getStatusBadge(user.status)}
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>@{user.username}</span>
                      {user.lastLoginAt && (
                        <span>
                          Last login: {new Date(user.lastLoginAt).toLocaleDateString("en-GB")}
                        </span>
                      )}
                      {user.sessionsCount !== undefined && (
                        <span>{user.sessionsCount} sessions</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>

                  {user.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuspendUser(user)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  ) : user.status === "suspended" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reactivateUserMutation.mutate(user.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suspend User Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Warning</span>
              </div>
              <p className="text-yellow-700 mt-1">
                This will immediately revoke access for{" "}
                <strong>
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </strong>{" "}
                and terminate any active sessions.
              </p>
            </div>

            <div>
              <Label htmlFor="suspendReason">Reason for suspension *</Label>
              <Textarea
                id="suspendReason"
                value={suspendData.reason}
                onChange={(e) => setSuspendData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why this user is being suspended..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="suspendDuration">Suspension duration (days)</Label>
              <Select
                value={suspendData.duration}
                onValueChange={(value) => setSuspendData((prev) => ({ ...prev, duration: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSuspend}
                disabled={suspendUserMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {suspendUserMutation.isPending ? "Suspending..." : "Suspend User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
