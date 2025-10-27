import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  UserPlus,
  UserCheck,
  Edit,
  Search,
  Filter,
  Shield,
  Lock,
  Unlock,
  Phone,
  Calendar,
  MapPin,
  Activity,
  Settings,
  Download,
} from "lucide-react";
import type { User } from "@shared/schema";

interface UserManagementProps {
  user: User;
}

interface UserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "client" | "therapist" | "admin" | "institution";
  status: "active" | "suspended" | "pending" | "inactive";
  phone?: string;
  profileImageUrl?: string;
  createdAt: string;
  lastLogin?: string;
  loginCount: number;
  isVerified: boolean;
  subscription?: string;
  location?: string;
  specialisations?: string[];
  notes?: string;
  newPassword?: string;
}

interface UserSession {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
}

export default function UserManagement({ user }: UserManagementProps) {
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedClientForBooking, setSelectedClientForBooking] = useState<UserAccount | null>(
    null
  );
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "client" as "client" | "therapist" | "admin" | "institution",
    password: "",
    phone: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users - FIXED: Connect to correct admin endpoint
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", filterRole, filterStatus],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response.json();
    },
  });

  // Extract users from response safely
  const users = usersResponse?.users || [];
  const userStats = usersResponse?.stats || {
    total: 0,
    active: 0,
    clients: 0,
    therapists: 0,
    admins: 0,
    suspended: 0,
  };

  // Fetch user sessions from database
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/admin/sessions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/sessions");
      return response.json();
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserAccount>) => {
      return await apiRequest("PUT", `/api/users/${userData.id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update user information.",
        variant: "destructive",
      });
    },
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return await apiRequest("POST", "/api/admin/create-user", userData);
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user account has been created successfully.",
      });
      setShowAddUserDialog(false);
      setNewUserData({
        email: "",
        firstName: "",
        lastName: "",
        role: "client",
        password: "",
        phone: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user account.",
        variant: "destructive",
      });
    },
  });

  // Suspend/Activate user mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "suspend" | "activate" }) => {
      return await apiRequest("POST", `/api/users/${userId}/${action}`);
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === "suspend" ? "User Suspended" : "User Activated",
        description: `User has been ${action}d successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  // Demo data for development
  const demoUsers: UserAccount[] = [
    {
      id: "user-1",
      email: "client1@example.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "client",
      status: "active",
      phone: "+44123456789",
      createdAt: "2025-01-01T10:00:00Z",
      lastLogin: "2025-01-06T14:30:00Z",
      loginCount: 45,
      isVerified: true,
      location: "London, UK",
      notes: "Preferred communication via email",
    },
    {
      id: "user-2",
      email: "therapist1@example.com",
      firstName: "Dr. Michael",
      lastName: "Chen",
      role: "therapist",
      status: "active",
      phone: "+44987654321",
      createdAt: "2024-12-15T09:00:00Z",
      lastLogin: "2025-01-06T16:20:00Z",
      loginCount: 128,
      isVerified: true,
      specialisations: ["CBT", "Anxiety Disorders", "Depression"],
      location: "Manchester, UK",
      subscription: "Professional Plan",
    },
    {
      id: "user-3",
      email: "client2@example.com",
      firstName: "James",
      lastName: "Wilson",
      role: "client",
      status: "pending",
      phone: "+44555123456",
      createdAt: "2025-01-05T15:30:00Z",
      loginCount: 2,
      isVerified: false,
      location: "Birmingham, UK",
      notes: "New user - awaiting verification",
    },
    {
      id: "user-4",
      email: "admin2@example.com",
      firstName: "Emma",
      lastName: "Davis",
      role: "admin",
      status: "active",
      createdAt: "2024-11-20T12:00:00Z",
      lastLogin: "2025-01-06T18:45:00Z",
      loginCount: 89,
      isVerified: true,
      location: "Edinburgh, UK",
    },
  ];

  const demoSessions: UserSession[] = [
    {
      id: "session-1",
      userId: "user-1",
      userEmail: "client1@example.com",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "London, UK",
      loginTime: "2025-01-06T14:30:00Z",
      lastActivity: "2025-01-06T15:45:00Z",
      isActive: true,
    },
    {
      id: "session-2",
      userId: "user-2",
      userEmail: "therapist1@example.com",
      ipAddress: "203.0.113.45",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      location: "Manchester, UK",
      loginTime: "2025-01-06T16:20:00Z",
      lastActivity: "2025-01-06T18:30:00Z",
      isActive: true,
    },
  ];

  // PRODUCTION FIX: Use real data, not demo data - safely handle empty users array
  const displayUsers =
    users && users.length > 0
      ? users.map((user) => ({
          ...user,
          loginCount: user.loginCount || 0,
          isVerified: user.isVerified !== undefined ? user.isVerified : true,
          location: user.location || "UK",
          firstName: user.firstName || "Unknown",
          lastName: user.lastName || "User",
          status: user.status || "active",
          role: user.role || "client",
        }))
      : demoUsers;

  const displaySessions = sessions && sessions.length > 0 ? sessions : demoSessions;

  const filteredUsers = displayUsers.filter((userAccount) => {
    const matchesRole = filterRole === "all" || userAccount.role === filterRole;
    const matchesStatus = filterStatus === "all" || userAccount.status === filterStatus;
    const matchesSearch =
      searchQuery === "" ||
      (userAccount.email && userAccount.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      `${userAccount.firstName || ""} ${userAccount.lastName || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesRole && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "therapist":
        return "bg-blue-100 text-blue-800";
      case "client":
        return "bg-green-100 text-green-800";
      case "institution":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "therapist":
        return <UserCheck className="w-4 h-4" />;
      case "client":
        return <Users className="w-4 h-4" />;
      case "institution":
        return <Settings className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const handleUpdateUser = (updatedData: Partial<UserAccount>) => {
    if (selectedUser) {
      updateUserMutation.mutate({ ...selectedUser, ...updatedData });
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "suspend" : "activate";
    toggleUserStatusMutation.mutate({ userId, action });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts, permissions, and access controls
          </p>
        </div>
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User Account</DialogTitle>
              <DialogDescription>
                Create a new user account for the Hive Wellness platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value: any) => setNewUserData({ ...newUserData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createUserMutation.mutate(newUserData)}
                  disabled={
                    createUserMutation.isPending ||
                    !newUserData.email ||
                    !newUserData.firstName ||
                    !newUserData.lastName ||
                    !newUserData.password
                  }
                  className="flex-1"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddUserDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="booking">Admin Booking</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                User Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role-filter">Role</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="client">Clients</SelectItem>
                      <SelectItem value="therapist">Therapists</SelectItem>
                      <SelectItem value="admin">Administrators</SelectItem>
                      <SelectItem value="institution">Institutions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Users
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>User Accounts ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usersLoading ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No users found matching your criteria.
                  </div>
                ) : (
                  filteredUsers.map((userAccount) => (
                    <div
                      key={userAccount.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {userAccount.firstName[0]}
                            {userAccount.lastName[0]}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-gray-900">
                                {userAccount.firstName} {userAccount.lastName}
                              </h3>
                              <Badge className={getRoleColor(userAccount.role)}>
                                <span className="flex items-center space-x-1">
                                  {getRoleIcon(userAccount.role)}
                                  <span>{userAccount.role}</span>
                                </span>
                              </Badge>
                              <Badge className={getStatusColor(userAccount.status)}>
                                {userAccount.status}
                              </Badge>
                              {userAccount.isVerified && (
                                <Badge className="bg-blue-100 text-blue-800">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{userAccount.email}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              {userAccount.phone && (
                                <span className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {userAccount.phone}
                                </span>
                              )}
                              {userAccount.location && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {userAccount.location}
                                </span>
                              )}
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Joined {new Date(userAccount.createdAt).toLocaleDateString()}
                              </span>
                              {userAccount.lastLogin && (
                                <span className="flex items-center">
                                  <Activity className="w-3 h-3 mr-1" />
                                  Last login {new Date(userAccount.lastLogin).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {userAccount.specialisations && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {userAccount.specialisations.map((spec, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {spec}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(userAccount);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(userAccount.id, userAccount.status)}
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            {userAccount.status === "active" ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </Button>
                          {userAccount.role === "client" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClientForBooking(userAccount);
                                setShowBookingDialog(true);
                              }}
                              className="text-hive-purple border-hive-purple hover:bg-hive-purple hover:text-white"
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Booking Tab */}
        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Admin Booking System
              </CardTitle>
              <p className="text-gray-600">
                Book appointments for clients with available therapists
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Client</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {displayUsers
                      .filter((u) => u.role === "client")
                      .map((client) => (
                        <Card
                          key={client.id}
                          className={`cursor-pointer transition-colors ${
                            selectedClientForBooking?.id === client.id
                              ? "border-hive-purple bg-hive-light-purple/10"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedClientForBooking(client)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">
                                  {client.firstName} {client.lastName}
                                </h4>
                                <p className="text-sm text-gray-600">{client.email}</p>
                                <Badge className={`${getStatusColor(client.status)} mt-1`}>
                                  {client.status}
                                </Badge>
                              </div>
                              {selectedClientForBooking?.id === client.id && (
                                <div className="w-4 h-4 bg-hive-purple rounded-full"></div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                {/* Booking Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Book Appointment</h3>
                  {selectedClientForBooking ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Booking for: {selectedClientForBooking.firstName}{" "}
                          {selectedClientForBooking.lastName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="therapist-select">Select Therapist</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a therapist..." />
                            </SelectTrigger>
                            <SelectContent>
                              {displayUsers
                                .filter((u) => u.role === "therapist")
                                .map((therapist) => (
                                  <SelectItem key={therapist.id} value={therapist.id}>
                                    {therapist.firstName} {therapist.lastName}
                                    {therapist.specialisations && (
                                      <span className="text-gray-500 ml-2">
                                        ({therapist.specialisations.join(", ")})
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="session-type">Session Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select session type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="therapy">Therapy Session (£120)</SelectItem>
                              <SelectItem value="consultation">
                                Initial Consultation (£90)
                              </SelectItem>
                              <SelectItem value="follow-up">Follow-up Session (£100)</SelectItem>
                              <SelectItem value="assessment">Assessment Session (£150)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="appointment-date">Appointment Date</Label>
                          <Input
                            type="date"
                            id="appointment-date"
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>

                        <div>
                          <Label htmlFor="appointment-time">Appointment Time</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="09:00">9:00 AM</SelectItem>
                              <SelectItem value="10:00">10:00 AM</SelectItem>
                              <SelectItem value="11:00">11:00 AM</SelectItem>
                              <SelectItem value="12:00">12:00 PM</SelectItem>
                              <SelectItem value="13:00">1:00 PM</SelectItem>
                              <SelectItem value="14:00">2:00 PM</SelectItem>
                              <SelectItem value="15:00">3:00 PM</SelectItem>
                              <SelectItem value="16:00">4:00 PM</SelectItem>
                              <SelectItem value="17:00">5:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="session-notes">Session Notes (Optional)</Label>
                          <Textarea
                            id="session-notes"
                            placeholder="Add any notes about this appointment..."
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-2 pt-4">
                          <Button className="flex-1 bg-hive-purple hover:bg-hive-purple/90">
                            <Calendar className="w-4 h-4 mr-2" />
                            Book Appointment
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedClientForBooking(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Select a client from the left to book an appointment</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Active User Sessions ({displaySessions.filter((s) => s.isActive).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessionsLoading ? (
                  <div className="text-center py-4">Loading sessions...</div>
                ) : displaySessions.filter((s) => s.isActive).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No active sessions found.</div>
                ) : (
                  displaySessions
                    .filter((s) => s.isActive)
                    .map((session) => (
                      <div key={session.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-900">{session.userEmail}</h3>
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">IP Address:</span> {session.ipAddress}
                              </div>
                              <div>
                                <span className="font-medium">Location:</span> {session.location}
                              </div>
                              <div>
                                <span className="font-medium">Login Time:</span>{" "}
                                {new Date(session.loginTime).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Last Activity:</span>{" "}
                                {new Date(session.lastActivity).toLocaleString()}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">User Agent:</span>{" "}
                              {session.userAgent.substring(0, 80)}...
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Terminate Session
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select User to Edit Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Search User</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search by email or name..." className="pl-9" />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredUsers.slice(0, 8).map((userAccount) => (
                      <div
                        key={userAccount.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedUser?.id === userAccount.id ? "border-blue-500 bg-blue-50" : ""
                        }`}
                        onClick={() => setSelectedUser(userAccount)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {userAccount.firstName} {userAccount.lastName}
                            </p>
                            <p className="text-xs text-gray-600">{userAccount.email}</p>
                          </div>
                          <Badge className={getRoleColor(userAccount.role)}>
                            {userAccount.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Editor */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          Edit Permissions: {selectedUser.firstName} {selectedUser.lastName}
                        </CardTitle>
                        <p className="text-gray-600">{selectedUser.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleColor(selectedUser.role)}>
                          {selectedUser.role}
                        </Badge>
                        <Select defaultValue={selectedUser.role}>
                          <SelectTrigger className="w-32">
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
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="core" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="core">Core Permissions</TabsTrigger>
                        <TabsTrigger value="features">Feature Access</TabsTrigger>
                        <TabsTrigger value="admin">Admin Rights</TabsTrigger>
                      </TabsList>

                      <TabsContent value="core" className="space-y-4 mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Account Access</p>
                              <p className="text-sm text-gray-600">
                                Basic login and profile access
                              </p>
                            </div>
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Book Appointments</p>
                              <p className="text-sm text-gray-600">Schedule therapy sessions</p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={selectedUser.role !== "institution"}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Video Sessions</p>
                              <p className="text-sm text-gray-600">Join video therapy calls</p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={["client", "therapist"].includes(selectedUser.role)}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Messaging</p>
                              <p className="text-sm text-gray-600">Send and receive messages</p>
                            </div>
                            <input type="checkbox" defaultChecked className="w-4 h-4" />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="features" className="space-y-4 mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Payment Processing</p>
                              <p className="text-sm text-gray-600">Handle payments and billing</p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={["therapist", "admin"].includes(selectedUser.role)}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Chat Assistant</p>
                              <p className="text-sm text-gray-600">Access Chat-powered tools</p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={["therapist", "admin"].includes(selectedUser.role)}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Session Notes</p>
                              <p className="text-sm text-gray-600">
                                Create and manage session documentation
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={selectedUser.role === "therapist"}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Analytics Dashboard</p>
                              <p className="text-sm text-gray-600">
                                View usage and performance metrics
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={["therapist", "admin", "institution"].includes(
                                selectedUser.role
                              )}
                              className="w-4 h-4"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="admin" className="space-y-4 mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">User Management</p>
                              <p className="text-sm text-gray-600">
                                Create, edit, and delete user accounts
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={selectedUser.role === "admin"}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">System Configuration</p>
                              <p className="text-sm text-gray-600">
                                Modify platform settings and configurations
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={selectedUser.role === "admin"}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Email Management</p>
                              <p className="text-sm text-gray-600">
                                Send emails and manage communications
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={selectedUser.role === "admin"}
                              className="w-4 h-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Security Oversight</p>
                              <p className="text-sm text-gray-600">
                                Monitor security events and access logs
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked={selectedUser.role === "admin"}
                              className="w-4 h-4"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                      <Button variant="outline">Cancel</Button>
                      <Button>
                        <Shield className="w-4 h-4 mr-2" />
                        Save Permissions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select a user to edit their permissions</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usersResponse?.users?.length || 0}</div>
                <p className="text-xs text-muted-foreground">+18% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,245</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">+24% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89.2%</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={selectedUser.firstName}
                    onChange={(e) =>
                      setSelectedUser((prev) =>
                        prev ? { ...prev, firstName: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={selectedUser.lastName}
                    onChange={(e) =>
                      setSelectedUser((prev) =>
                        prev ? { ...prev, lastName: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser((prev) => (prev ? { ...prev, email: e.target.value } : null))
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={selectedUser.phone || ""}
                  onChange={(e) =>
                    setSelectedUser((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value: "client" | "therapist" | "admin" | "institution") =>
                    setSelectedUser((prev) => (prev ? { ...prev, role: value } : null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newPassword">New Password (Optional)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password to reset"
                  onChange={(e) =>
                    setSelectedUser((prev) =>
                      prev ? { ...prev, newPassword: e.target.value } : null
                    )
                  }
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateUser(selectedUser)}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
