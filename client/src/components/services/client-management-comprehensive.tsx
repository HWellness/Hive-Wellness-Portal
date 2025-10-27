import { useState, useRef } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  Search,
  Plus,
  Edit,
  Calendar,
  Mail,
  Phone,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  Settings,
  Video,
  TrendingUp,
  UserPlus,
  Filter,
  Trash2,
  Eye,
  Download,
  Star,
  FileText,
  MessageSquare,
  MapPin,
  Shield,
  Heart,
  Brain,
  Zap,
  ChevronRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Save,
  Upload,
  X,
  MoreHorizontal,
  Bell,
  StickyNote,
  Paperclip,
  Tag,
  Flag,
  Archive,
  Copy,
  ExternalLink,
  Home,
  Building,
  GraduationCap,
  Briefcase,
  Car,
  Smartphone,
  Globe,
  DollarSign,
  CreditCard,
} from "lucide-react";
import type { User } from "@shared/schema";

interface ClientManagementProps {
  user: User;
  onNavigateToService?: (serviceId: string) => void;
}

interface ClientRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  assignedTherapist: {
    id: string;
    name: string;
    specialisation: string;
  } | null;
  status: "active" | "inactive" | "pending" | "on-hold" | "discharged";
  riskLevel: "low" | "medium" | "high" | "critical";
  registrationDate: string;
  lastActivity: string;
  nextAppointment: string | null;
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  currentTherapyPlan: string;
  diagnoses: string[];
  medications: string[];
  allergies: string[];
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    copay: number;
  };
  paymentStatus: "current" | "overdue" | "pending";
  progressNotes: {
    id: string;
    date: string;
    therapist: string;
    content: string;
    type: "session" | "phone" | "email" | "assessment";
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    size: string;
  }[];
  flags: {
    id: string;
    type: "medical" | "administrative" | "billing" | "clinical";
    description: string;
    priority: "high" | "medium" | "low";
    createdDate: string;
    resolved: boolean;
  }[];
}

export default function ClientManagementComprehensive({
  user,
  onNavigateToService,
}: ClientManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Demo data for comprehensive client management
  const demoClients: ClientRecord[] = [
    {
      id: "client-001",
      firstName: "Emma",
      lastName: "Johnson",
      email: "emma.johnson@email.com",
      phone: "+44 7123 456789",
      dateOfBirth: "1995-03-15",
      address: "123 Queen Street, London, SW1A 1AA",
      emergencyContact: {
        name: "James Johnson",
        phone: "+44 7987 654321",
        relationship: "Spouse",
      },
      assignedTherapist: {
        id: "therapist-001",
        name: "Dr. Sarah Wilson",
        specialisation: "Anxiety & Depression",
      },
      status: "active",
      riskLevel: "low",
      registrationDate: "2024-01-15",
      lastActivity: "2024-12-20",
      nextAppointment: "2024-12-27",
      totalSessions: 12,
      completedSessions: 8,
      missedSessions: 1,
      currentTreatmentPlan: "Cognitive Behavioural Therapy for Anxiety",
      diagnoses: ["Generalized Anxiety Disorder", "Mild Depression"],
      medications: ["Sertraline 50mg"],
      allergies: ["Penicillin"],
      insuranceInfo: {
        provider: "Bupa Healthcare",
        policyNumber: "BH-2024-001",
        copay: 25,
      },
      paymentStatus: "current",
      progressNotes: [
        {
          id: "note-001",
          date: "2024-12-20",
          therapist: "Dr. Sarah Wilson",
          content:
            "Client showing significant improvement in anxiety management. Homework completed successfully.",
          type: "session",
        },
        {
          id: "note-002",
          date: "2024-12-18",
          therapist: "Dr. Sarah Wilson",
          content:
            "Phone check-in: Client reported improved sleep quality after implementing relaxation techniques.",
          type: "phone",
        },
      ],
      documents: [
        {
          id: "doc-001",
          name: "Initial Assessment Form",
          type: "PDF",
          uploadDate: "2024-01-15",
          size: "2.3 MB",
        },
        {
          id: "doc-002",
          name: "Therapy Plan",
          type: "PDF",
          uploadDate: "2024-01-20",
          size: "1.8 MB",
        },
      ],
      flags: [
        {
          id: "flag-001",
          type: "clinical",
          description: "Requires medication review next session",
          priority: "medium",
          createdDate: "2024-12-15",
          resolved: false,
        },
      ],
    },
    {
      id: "client-002",
      firstName: "Michael",
      lastName: "Chen",
      email: "michael.chen@email.com",
      phone: "+44 7456 789123",
      dateOfBirth: "1988-07-22",
      address: "456 High Street, Manchester, M1 2AB",
      emergencyContact: {
        name: "Lisa Chen",
        phone: "+44 7789 123456",
        relationship: "Sister",
      },
      assignedTherapist: {
        id: "therapist-002",
        name: "Dr. James Mitchell",
        specialisation: "PTSD & Trauma",
      },
      status: "active",
      riskLevel: "medium",
      registrationDate: "2024-02-01",
      lastActivity: "2024-12-19",
      nextAppointment: "2024-12-26",
      totalSessions: 15,
      completedSessions: 12,
      missedSessions: 0,
      currentTreatmentPlan: "EMDR Therapy for PTSD",
      diagnoses: ["Post-Traumatic Stress Disorder"],
      medications: ["Prazosin 1mg"],
      allergies: ["None reported"],
      insuranceInfo: {
        provider: "AXA Health",
        policyNumber: "AXA-2024-002",
        copay: 30,
      },
      paymentStatus: "current",
      progressNotes: [
        {
          id: "note-003",
          date: "2024-12-19",
          therapist: "Dr. James Mitchell",
          content: "EMDR session focused on processing traumatic memory. Client tolerated well.",
          type: "session",
        },
      ],
      documents: [
        {
          id: "doc-003",
          name: "PTSD Assessment",
          type: "PDF",
          uploadDate: "2024-02-01",
          size: "3.1 MB",
        },
      ],
      flags: [
        {
          id: "flag-002",
          type: "clinical",
          description: "Monitor for dissociation during EMDR",
          priority: "high",
          createdDate: "2024-12-01",
          resolved: false,
        },
      ],
    },
    {
      id: "client-003",
      firstName: "Sophie",
      lastName: "Williams",
      email: "sophie.williams@email.com",
      phone: "+44 7789 456123",
      dateOfBirth: "2001-11-08",
      address: "789 Park Lane, Birmingham, B1 3CD",
      emergencyContact: {
        name: "David Williams",
        phone: "+44 7123 789456",
        relationship: "Father",
      },
      assignedTherapist: null,
      status: "pending",
      riskLevel: "medium",
      registrationDate: "2024-12-15",
      lastActivity: "2024-12-15",
      nextAppointment: null,
      totalSessions: 0,
      completedSessions: 0,
      missedSessions: 0,
      currentTherapyPlan: "Awaiting therapist assignment",
      diagnoses: ["Eating Disorder (Provisional)"],
      medications: ["None"],
      allergies: ["Latex"],
      insuranceInfo: {
        provider: "Vitality Health",
        policyNumber: "VH-2024-003",
        copay: 20,
      },
      paymentStatus: "pending",
      progressNotes: [
        {
          id: "note-004",
          date: "2024-12-15",
          therapist: "Intake Coordinator",
          content:
            "Initial intake completed. Client requires specialised eating disorder treatment.",
          type: "assessment",
        },
      ],
      documents: [
        {
          id: "doc-004",
          name: "Intake Assessment",
          type: "PDF",
          uploadDate: "2024-12-15",
          size: "2.8 MB",
        },
      ],
      flags: [
        {
          id: "flag-003",
          type: "administrative",
          description: "Requires specialist therapist assignment",
          priority: "high",
          createdDate: "2024-12-15",
          resolved: false,
        },
      ],
    },
  ];

  // Fetch clients data
  const { data: clients = demoClients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
  });

  // Filter clients based on search and filters
  const filteredClients = clients.filter((client: ClientRecord) => {
    const matchesSearch =
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesRisk = riskFilter === "all" || client.riskLevel === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "on-hold":
        return "bg-orange-100 text-orange-800";
      case "discharged":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Risk level color mapping
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Document handling functions
  const handleViewDocument = (doc: any) => {
    // Create a preview window or modal for the document
    if (doc.type === "PDF") {
      // For PDFs, open in a new window/tab
      const previewContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Document Preview: ${doc.name}</title>
          <style>
            body { margin: 0; font-family: system-ui; }
            .header { background: #9306B1; color: white; padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
            .content { padding: 2rem; text-align: center; }
            .download-btn { background: white; color: #9306B1; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Document Preview</h1>
            <button class="download-btn" onclick="downloadDocument()">Download</button>
          </div>
          <div class="content">
            <h2>${doc.name}</h2>
            <p><strong>Type:</strong> ${doc.type}</p>
            <p><strong>Size:</strong> ${doc.size}</p>
            <p><strong>Upload Date:</strong> ${new Date(doc.uploadDate).toLocaleDateString("en-GB")}</p>
            <div style="margin-top: 2rem; padding: 2rem; background: #f8f9fa; border-radius: 0.5rem;">
              <h3>Document Preview</h3>
              <p>This is a preview of the ${doc.name} document. In a production environment, this would display the actual document content.</p>
              <p style="color: #6b7280; font-size: 0.875rem;">Note: This is demo content for the Hive Wellness platform.</p>
            </div>
          </div>
          <script>
            function downloadDocument() {
              alert('Document download would start here in production environment.');
            }
          </script>
        </body>
        </html>
      `;

      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(previewContent);
        newWindow.document.close();
      }
    } else {
      // For other document types, show in a modal or new window
      toast({
        title: "Document Preview",
        description: `Viewing ${doc.name} - ${doc.type} document`,
      });
    }
  };

  const handleDownloadDocument = (doc: any) => {
    // Instead of triggering an actual download (which browsers flag as suspicious),
    // we'll show the document content in a new window that users can save manually
    const documentContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.name} - Hive Wellness</title>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6; 
          }
          .header { 
            background: #9306B1; 
            color: white; 
            padding: 1.5rem; 
            margin: -2rem -2rem 2rem -2rem; 
            border-radius: 0.5rem 0.5rem 0 0;
          }
          .document-info { 
            background: #f8f9fa; 
            padding: 1rem; 
            border-radius: 0.5rem; 
            margin-bottom: 2rem; 
          }
          .content { 
            background: white; 
            border: 1px solid #e5e7eb; 
            border-radius: 0.5rem; 
            padding: 2rem; 
          }
          .save-instructions {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 2rem;
            color: #1e40af;
          }
          @media print {
            .header, .save-instructions { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📄 ${doc.name}</h1>
          <p>Hive Wellness Document - ${new Date().toLocaleDateString("en-GB")}</p>
        </div>
        
        <div class="document-info">
          <h3>Document Information</h3>
          <p><strong>Document Name:</strong> ${doc.name}</p>
          <p><strong>Document Type:</strong> ${doc.type}</p>
          <p><strong>File Size:</strong> ${doc.size}</p>
          <p><strong>Upload Date:</strong> ${new Date(doc.uploadDate).toLocaleDateString("en-GB")}</p>
          <p><strong>Client:</strong> Emma Johnson (emma.johnson@email.com)</p>
        </div>

        <div class="content">
          <h2>Document Content</h2>
          <p><strong>Initial Assessment Form</strong></p>
          <p>This document contains the initial psychological assessment for the client, including:</p>
          <ul>
            <li>Personal and medical history questionnaire</li>
            <li>Mental health screening assessment</li>
            <li>Risk assessment evaluation</li>
            <li>Therapy goals and preferences</li>
            <li>Consent forms and privacy agreements</li>
          </ul>
          
          <h3>Assessment Summary</h3>
          <p>The client has completed their initial intake assessment. Key areas identified for therapeutic intervention include anxiety management and coping strategies development.</p>
          
          <h3>Recommendations</h3>
          <p>Recommended treatment approach includes cognitive behavioural therapy with focus on anxiety reduction techniques and stress management skills.</p>
          
          <p><em>Note: This is demonstration content for the Hive Wellness platform. In a production environment, this would contain the actual document content.</em></p>
        </div>

        <div class="save-instructions">
          <h4>💾 How to Save This Document</h4>
          <p><strong>Option 1:</strong> Press Ctrl+S (or Cmd+S on Mac) to save this page as an HTML file</p>
          <p><strong>Option 2:</strong> Right-click anywhere and select "Save as..." or "Print" → "Save as PDF"</p>
          <p><strong>Option 3:</strong> Use your browser's File menu → Save Page As</p>
        </div>
      </body>
      </html>
    `;

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(documentContent);
      newWindow.document.close();
      newWindow.document.title = `${doc.name} - Hive Wellness`;
    }

    toast({
      title: "Document Opened",
      description: `${doc.name} opened in new window. Use Ctrl+S to save.`,
    });
  };

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (clientData: Partial<ClientRecord>) => {
      return apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Added",
        description: "New client record has been created successfully.",
      });
      setShowAddClientDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add client. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedClient) return;

    setUploadingFile(true);

    // Simulate file upload process
    setTimeout(() => {
      const newDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type.split("/")[1]?.toUpperCase() || "FILE",
        uploadDate: new Date().toISOString(),
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      };

      // In production, this would upload the file to the server
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully for ${selectedClient.firstName} ${selectedClient.lastName}`,
      });

      setUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, 2000);
  };

  // Trigger file input click
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-hive-purple" />
          <div>
            <h2 className="text-xl font-semibold text-hive-black">Client Management</h2>
            <p className="text-sm text-gray-600">Managing and maintaining client records</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-hive-purple" />
          <div>
            <h2 className="text-xl font-semibold text-hive-black">Client Management</h2>
            <p className="text-sm text-hive-black/70">Managing and maintaining client records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="flex items-center gap-2 border-hive-purple/20 hover:border-hive-purple hover:bg-hive-purple/5"
          >
            <Settings className="w-4 h-4 text-hive-purple" />
            <span className="text-hive-black">Bulk Actions</span>
          </Button>
          <Button
            onClick={() => setShowAddClientDialog(true)}
            className="bg-hive-purple hover:bg-hive-purple/90 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hive-black/70">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-hive-black">{clients.length}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hive-black/70">Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-hive-black">
              {clients.filter((c) => c.status === "active").length}
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Currently in treatment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hive-black/70">
              Pending Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {clients.filter((c) => c.status === "pending").length}
            </div>
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Awaiting therapist
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hive-black/70">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {clients.filter((c) => c.riskLevel === "high" || c.riskLevel === "critical").length}
            </div>
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hive-black/40 w-4 h-4" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Risk Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="critical">Critical Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Cards */}
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedClient?.id === client.id ? "ring-2 ring-hive-purple" : ""
              }`}
              onClick={() => setSelectedClient(client)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-hive-purple/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-hive-purple" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-hive-black">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-hive-black/70">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getStatusColor(client.status)}>{client.status}</Badge>
                    <Badge className={getRiskColor(client.riskLevel)}>
                      {client.riskLevel} risk
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-hive-purple" />
                    <span className="text-hive-black/70">{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-hive-purple" />
                    <span className="text-hive-black/70">{client.totalSessions} sessions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-hive-purple" />
                    <span className="text-hive-black/70">
                      Last: {new Date(client.lastActivity).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-hive-purple" />
                    <span className="text-hive-black/70">
                      {client.nextAppointment
                        ? new Date(client.nextAppointment).toLocaleDateString("en-GB")
                        : "No upcoming"}
                    </span>
                  </div>
                </div>

                {client.assignedTherapist && (
                  <div className="mt-3 p-2 bg-hive-light-blue/20 rounded-md">
                    <p className="text-sm text-hive-black">
                      <strong>Therapist:</strong> {client.assignedTherapist.name}
                    </p>
                    <p className="text-xs text-hive-black/70">
                      {client.assignedTherapist.specialisation}
                    </p>
                  </div>
                )}

                {client.flags.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {client.flags.slice(0, 2).map((flag) => (
                      <div key={flag.id} className="flex items-center gap-2 text-xs">
                        <AlertCircle className="w-3 h-3 text-hive-purple" />
                        <span className="text-hive-black/70">{flag.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Client Details Panel */}
        <div className="space-y-4">
          {selectedClient ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-hive-purple/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-hive-purple" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-hive-black">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </h3>
                      <p className="text-sm text-hive-black/70">{selectedClient.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Edit Client",
                          description: `Opening edit form for ${selectedClient.firstName} ${selectedClient.lastName}`,
                        });
                        // In production, this would open an edit modal or navigate to edit page
                      }}
                      title="Edit client details"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "Message button clicked - onNavigateToService:",
                          !!onNavigateToService
                        );
                        // Navigate to messaging service
                        if (onNavigateToService) {
                          console.log("Calling onNavigateToService with messaging");
                          onNavigateToService("messaging");
                        } else {
                          console.log("No onNavigateToService prop, showing toast");
                          toast({
                            title: "Message Interface",
                            description: `Opening messaging with ${selectedClient.firstName} ${selectedClient.lastName}`,
                          });
                        }
                      }}
                      title="Send message to client"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "Start Session button clicked - onNavigateToService:",
                          !!onNavigateToService
                        );
                        // Navigate to video sessions service
                        if (onNavigateToService) {
                          console.log("Calling onNavigateToService with video-sessions");
                          onNavigateToService("video-sessions");
                        } else {
                          console.log("No onNavigateToService prop, showing toast");
                          toast({
                            title: "Video Session",
                            description: `Starting video session with ${selectedClient.firstName} ${selectedClient.lastName}`,
                          });
                        }
                      }}
                      title="Start video session"
                    >
                      <Video className="w-4 h-4" />
                      Start Session
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Date of Birth</Label>
                        <p className="text-sm">
                          {new Date(selectedClient.dateOfBirth).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Registration Date</Label>
                        <p className="text-sm">
                          {new Date(selectedClient.registrationDate).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm">{selectedClient.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Payment Status</Label>
                        <Badge
                          className={
                            selectedClient.paymentStatus === "current"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {selectedClient.paymentStatus}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <p className="text-sm">{selectedClient.address}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Emergency Contact</Label>
                      <p className="text-sm">
                        {selectedClient.emergencyContact.name} (
                        {selectedClient.emergencyContact.relationship})
                      </p>
                      <p className="text-sm text-hive-black/70">
                        {selectedClient.emergencyContact.phone}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Insurance Information</Label>
                      <p className="text-sm">{selectedClient.insuranceInfo.provider}</p>
                      <p className="text-sm text-hive-black/70">
                        Policy: {selectedClient.insuranceInfo.policyNumber} | Copay: £
                        {selectedClient.insuranceInfo.copay}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="clinical" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Current Therapy Plan</Label>
                      <p className="text-sm">{selectedClient.currentTherapyPlan}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Diagnoses</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedClient.diagnoses.map((diagnosis, index) => (
                          <Badge key={index} variant="outline">
                            {diagnosis}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Current Medications</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedClient.medications.map((medication, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50">
                            {medication}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Allergies</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedClient.allergies.map((allergy, index) => (
                          <Badge key={index} variant="outline" className="bg-red-50">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Total Sessions</Label>
                        <p className="text-2xl font-bold text-hive-purple">
                          {selectedClient.totalSessions}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Completed</Label>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedClient.completedSessions}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Missed</Label>
                        <p className="text-2xl font-bold text-red-600">
                          {selectedClient.missedSessions}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Client Documents</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerFileUpload}
                        disabled={uploadingFile}
                        title="Upload new document"
                        className="border-hive-purple/20 hover:border-hive-purple hover:bg-hive-purple/5"
                      >
                        <Upload className="w-4 h-4 mr-2 text-hive-purple" />
                        <span className="text-hive-black">
                          {uploadingFile ? "Uploading..." : "Upload"}
                        </span>
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                      />
                    </div>

                    <div className="space-y-2">
                      {selectedClient.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-hive-purple" />
                            <div>
                              <p className="text-sm font-medium text-hive-black">{doc.name}</p>
                              <p className="text-xs text-hive-black/70">
                                {doc.type} • {doc.size} •{" "}
                                {new Date(doc.uploadDate).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocument(doc);
                              }}
                              title="View document"
                              className="hover:bg-hive-purple/10"
                            >
                              <Eye className="w-4 h-4 text-hive-purple" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDocument(doc);
                              }}
                              title="Download document"
                              className="hover:bg-hive-purple/10"
                            >
                              <Download className="w-4 h-4 text-hive-purple" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Progress Notes</Label>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {selectedClient.progressNotes.map((note) => (
                        <div key={note.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {note.type}
                              </Badge>
                              <span className="text-sm font-medium">{note.therapist}</span>
                            </div>
                            <span className="text-xs text-gray-600">
                              {new Date(note.date).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="w-12 h-12 text-hive-purple/50 mx-auto mb-4" />
                  <p className="text-hive-black/70">Select a client to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Bulk Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Selected: {selectedClients.length} clients
                </span>
                <Button variant="outline" size="sm" onClick={() => setSelectedClients([])}>
                  Clear Selection
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    toast({
                      title: "Send Email",
                      description: "Email composer would open for selected clients",
                    });
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    toast({
                      title: "Send Message",
                      description: "Message composer would open for selected clients",
                    });
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    toast({
                      title: "Archive Clients",
                      description: "Selected clients would be archived",
                    });
                  }}
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    toast({
                      title: "Bulk Edit",
                      description: "Bulk edit interface would open for selected clients",
                    });
                  }}
                >
                  <Edit className="w-4 h-4" />
                  Bulk Edit
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                Select clients from the list below to perform bulk actions.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Client
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter first name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter last name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="client@email.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+44 7xxx xxx xxx" />
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" placeholder="Full address" />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyName">Contact Name</Label>
                  <Input id="emergencyName" placeholder="Emergency contact name" />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Contact Phone</Label>
                  <Input id="emergencyPhone" placeholder="+44 7xxx xxx xxx" />
                </div>
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Initial Assessment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Initial Assessment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="concerns">Primary Concerns</Label>
                <Textarea id="concerns" placeholder="Describe primary mental health concerns..." />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // In production, this would submit the form data
                  toast({
                    title: "Client Added",
                    description: "New client record has been created successfully.",
                  });
                  setShowAddClientDialog(false);
                }}
                className="bg-hive-purple hover:bg-hive-purple/90 text-white"
              >
                Add Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
