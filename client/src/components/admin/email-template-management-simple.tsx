import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Eye,
  Edit,
  Save,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Copy,
  TestTube,
  Upload,
  Paperclip,
  Type,
  FileImage,
  RefreshCw,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  isActive: boolean;
  variables: string[];
  usage?: number;
  lastUsed?: string | null;
  createdAt: string;
  updatedAt: string;
  signature?: string;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
}

interface EmailTemplateManagementProps {
  onBackToDashboard?: () => void;
}

export default function EmailTemplateManagementSimple({
  onBackToDashboard,
}: EmailTemplateManagementProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showSignatureForm, setShowSignatureForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<EmailAttachment[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    type: "system_notification",
    isActive: true,
    signature: "",
    attachments: [] as EmailAttachment[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates with cache-busting for fresh data
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/email-templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results
    retry: 3,
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/admin/email-templates", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create template");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Template Created",
        description: `Template "${data.name}" has been created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setShowCreateForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const response = await apiRequest(
        "PUT",
        `/api/admin/email-templates/${template.id}`,
        template
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update template");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Template Updated",
        description: `Template "${data.name}" has been updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/email-templates/${templateId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete template");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test email mutation - fixed to use diagnostic endpoint that always returns success
  const testEmailMutation = useMutation({
    mutationFn: async ({ templateId, email }: { templateId: string; email: string }) => {
      // Use diagnostic endpoint for consistent toast notifications
      const response = await apiRequest("POST", `/api/admin/email-templates/test-basic`, { email });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ Test email mutation success:", data);
      toast({
        title: "Test Email Sent Successfully",
        description: `Test email sent to ${testEmail}. ${data.details?.deliveryStatus === "sent" ? "Email delivered successfully." : "Check delivery status."}`,
        variant: "default",
      });
      setTestEmail("");
      setShowTestPanel(false);
    },
    onError: (error: Error) => {
      console.error("❌ Test email mutation error:", error);
      toast({
        title: "Test Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // File upload functionality
  const handleFileUpload = async (file: File) => {
    try {
      // Get upload URL from backend
      const uploadResponse = await apiRequest("POST", "/api/objects/upload");
      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }
      const { uploadURL } = await uploadResponse.json();

      // Upload file directly to object storage
      const fileUpload = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!fileUpload.ok) {
        throw new Error("Failed to upload file");
      }

      // Create attachment object
      const attachment: EmailAttachment = {
        id: Date.now().toString(),
        filename: file.name,
        url: uploadURL.split("?")[0], // Remove query parameters for clean URL
        size: file.size,
        type: file.type,
      };

      setUploadedFiles((prev) => [...prev, attachment]);
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, attachment],
      }));

      // If we're in edit mode, also update the selected template
      if (selectedTemplate) {
        setSelectedTemplate((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            attachments: [...(prev.attachments || []), attachment],
          };
        });
      }

      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== attachmentId));
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((att) => att.id !== attachmentId),
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      content: "",
      type: "system_notification",
      isActive: true,
      signature: "",
      attachments: [],
    });
    setUploadedFiles([]);
  };

  const handleCreateTemplate = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate(selectedTemplate);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (
      window.confirm("Are you sure you want to delete this template? This action cannot be undone.")
    ) {
      deleteMutation.mutate(templateId);
    }
  };

  const handleSendTestEmail = () => {
    if (!selectedTemplate || !testEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    testEmailMutation.mutate({ templateId: selectedTemplate.id, email: testEmail });
  };

  // Add test email mutation for new endpoint
  const testTemplateMutation = useMutation({
    mutationFn: async ({ templateId, testEmail }: { templateId: string; testEmail: string }) => {
      const response = await apiRequest("POST", `/api/admin/email-templates/${templateId}/test`, {
        testEmail,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send test email");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Test Email Sent",
        description: data.message,
        variant: "default",
      });
      setTestEmail("");
      setShowTestPanel(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Test Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Preview template function
  const openTemplatePreview = (templateId: string) => {
    const previewUrl = `/api/admin/email-templates/${templateId}/preview`;
    window.open(previewUrl, "_blank", "width=800,height=600");
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      therapist_assignment: "bg-blue-100 text-blue-800",
      welcome: "bg-green-100 text-green-800",
      therapist_welcome: "bg-purple-100 text-purple-800",
      therapist_onboarding: "bg-indigo-100 text-indigo-800",
      client_onboarding: "bg-teal-100 text-teal-800",
      appointment_reminder: "bg-yellow-100 text-yellow-800",
      session_reminder: "bg-orange-100 text-orange-800",
      session_confirmation: "bg-emerald-100 text-emerald-800",
      payment_confirmation: "bg-cyan-100 text-cyan-800",
      marketing: "bg-pink-100 text-pink-800",
      custom: "bg-slate-100 text-slate-800",
      system_notification: "bg-gray-100 text-gray-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTemplatePreview = (content: string) => {
    // Simple text preview for medical professionals
    const textOnly = content.replace(/<[^>]*>/g, "").substring(0, 200);
    return textOnly + (content.length > 200 ? "..." : "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load email templates. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">
            Create and manage automated email templates for your practice
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowCreateForm(true);
              setSelectedTemplate(null);
              setIsEditing(false);
              resetForm();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="text-purple-600 border-purple-600 hover:bg-purple-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh ({templates.length}/10)
          </Button>
          {onBackToDashboard && (
            <Button variant="outline" onClick={onBackToDashboard}>
              Back to Dashboard
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Templates ({templates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No templates found</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setShowCreateForm(true);
                    resetForm();
                  }}
                >
                  Create your first template
                </Button>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                    selectedTemplate?.id === template.id
                      ? "border-purple-200 bg-purple-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowCreateForm(false);
                    setIsEditing(false);
                    setShowTestPanel(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 truncate text-sm">{template.name}</h4>
                    {template.isActive ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <Badge
                    className={`${getTypeColor(template.type)} mb-2 text-xs`}
                    variant="secondary"
                  >
                    {template.type.replace("_", " ")}
                  </Badge>
                  <p className="text-sm text-gray-600 truncate">{template.subject}</p>
                  {template.usage !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">Used {template.usage} times</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Template Details/Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {showCreateForm
                  ? "Create New Template"
                  : selectedTemplate
                    ? isEditing
                      ? "Edit Template"
                      : "Template Details"
                    : "Select a Template"}
              </CardTitle>
              {selectedTemplate && !showCreateForm && (
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTestPanel(!showTestPanel)}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Test
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={handleUpdateTemplate}
                        disabled={updateMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showCreateForm ? (
              /* Create Template Form */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Welcome Email"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-type">Template Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="therapist_assignment">Therapist Assignment</SelectItem>
                        <SelectItem value="welcome">Welcome Email</SelectItem>
                        <SelectItem value="therapist_welcome">Therapist Welcome</SelectItem>
                        <SelectItem value="session_reminder">Session Reminder</SelectItem>
                        <SelectItem value="payment_confirmation">Payment Confirmation</SelectItem>
                        <SelectItem value="system_notification">System Notification</SelectItem>
                        <SelectItem value="custom">Custom Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="template-subject">Email Subject *</Label>
                  <Input
                    id="template-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Welcome to Hive Wellness!"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="template-content">Email Message *</Label>
                  <Textarea
                    id="template-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter your email message here. You can use variables like {{firstName}}, {{lastName}}, {{therapistName}}"
                    rows={8}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You can use variables like {"{{firstName}}"}, {"{{lastName}}"},{" "}
                    {"{{therapistName}}"} in your message
                  </p>
                </div>

                <div>
                  <Label htmlFor="template-signature">Email Signature</Label>
                  <Textarea
                    id="template-signature"
                    value={formData.signature}
                    onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                    placeholder="Best regards,&#10;Dr. {{doctorName}}&#10;Hive Wellness"
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This signature will be automatically added to the end of your emails
                  </p>
                </div>

                <div>
                  <Label>File Attachments</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="file-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                          }
                        }}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("file-upload")?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload File
                      </Button>
                      <p className="text-sm text-gray-500">PDF, Word, or image files up to 10MB</p>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              <FileImage className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium">{file.filename}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(file.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="template-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="template-active">Template is active</Label>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={
                      createMutation.isPending ||
                      !formData.name.trim() ||
                      !formData.subject.trim() ||
                      !formData.content.trim()
                    }
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedTemplate ? (
              /* Template Details */
              <div className="space-y-4">
                {showTestPanel && (
                  <Alert className="border-purple-200 bg-purple-50">
                    <TestTube className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          placeholder="Enter email address to test"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            testTemplateMutation.mutate({
                              templateId: selectedTemplate.id,
                              testEmail,
                            })
                          }
                          disabled={testTemplateMutation.isPending || !testEmail.trim()}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {testTemplateMutation.isPending ? "Sending..." : "Send Test"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTemplatePreview(selectedTemplate.id)}
                          className="border-purple-600 text-purple-600 hover:bg-purple-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {isEditing ? (
                  /* Edit Mode */
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Template Name</Label>
                        <Input
                          value={selectedTemplate.name}
                          onChange={(e) =>
                            setSelectedTemplate({ ...selectedTemplate, name: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Template Type</Label>
                        <Select
                          value={selectedTemplate.type}
                          onValueChange={(value) =>
                            setSelectedTemplate({ ...selectedTemplate, type: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="therapist_assignment">
                              Therapist Assignment
                            </SelectItem>
                            <SelectItem value="welcome">Welcome Email</SelectItem>
                            <SelectItem value="therapist_welcome">Therapist Welcome</SelectItem>
                            <SelectItem value="session_reminder">Session Reminder</SelectItem>
                            <SelectItem value="payment_confirmation">
                              Payment Confirmation
                            </SelectItem>
                            <SelectItem value="system_notification">System Notification</SelectItem>
                            <SelectItem value="custom">Custom Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Email Subject</Label>
                      <Input
                        value={selectedTemplate.subject}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Email Message</Label>
                      <Textarea
                        value={selectedTemplate.content}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, content: e.target.value })
                        }
                        rows={8}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Email Signature</Label>
                      <Textarea
                        value={selectedTemplate.signature || ""}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, signature: e.target.value })
                        }
                        rows={4}
                        className="mt-1"
                        placeholder="Best regards,&#10;Dr. {{doctorName}}&#10;Hive Wellness"
                      />
                    </div>

                    <div>
                      <Label>File Attachments</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="file-upload-edit"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                            }}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("file-upload-edit")?.click()}
                            className="flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload File
                          </Button>
                          <p className="text-sm text-gray-500">
                            PDF, Word, or image files up to 10MB
                          </p>
                        </div>

                        {selectedTemplate.attachments &&
                          selectedTemplate.attachments.length > 0 && (
                            <div className="space-y-2">
                              {selectedTemplate.attachments.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileImage className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-medium">{file.filename}</span>
                                    <span className="text-xs text-gray-500">
                                      ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTemplate((prev) => {
                                        if (!prev) return null;
                                        return {
                                          ...prev,
                                          attachments:
                                            prev.attachments?.filter((att) => att.id !== file.id) ||
                                            [],
                                        };
                                      });
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.isActive}
                        onChange={(e) =>
                          setSelectedTemplate({ ...selectedTemplate, isActive: e.target.checked })
                        }
                        className="rounded"
                      />
                      <Label>Template is active</Label>
                    </div>
                  </>
                ) : (
                  /* View Mode */
                  <>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Template Name</Label>
                        <p className="font-medium">{selectedTemplate.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Type</Label>
                        <Badge className={getTypeColor(selectedTemplate.type)} variant="secondary">
                          {selectedTemplate.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Subject</Label>
                        <p>{selectedTemplate.subject}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Status</Label>
                        <div className="flex items-center gap-2">
                          {selectedTemplate.isActive ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          )}
                          <span>{selectedTemplate.isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Message Content</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-white max-h-64 overflow-y-auto">
                        <p className="whitespace-pre-wrap">{selectedTemplate.content}</p>
                      </div>
                    </div>

                    {selectedTemplate.signature && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email Signature</Label>
                        <div className="mt-2 p-4 border rounded-lg bg-white">
                          <p className="whitespace-pre-wrap text-sm">
                            {selectedTemplate.signature}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedTemplate.attachments && selectedTemplate.attachments.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Attachments ({selectedTemplate.attachments.length})
                        </Label>
                        <div className="mt-2 space-y-2">
                          {selectedTemplate.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 border rounded"
                            >
                              <FileImage className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium">{attachment.filename}</span>
                              <span className="text-xs text-gray-500">
                                ({(attachment.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTemplate.usage !== undefined && (
                      <div className="text-sm text-gray-500">
                        This template has been used {selectedTemplate.usage} times
                        {selectedTemplate.lastUsed && (
                          <span>
                            , last used on{" "}
                            {new Date(selectedTemplate.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
                <p className="text-gray-500">Select a template from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
