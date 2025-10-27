import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Mail, Plus, Edit, Trash2, Send, Eye, Copy, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateVariable {
  key: string;
  value: string;
}

export function GmailTemplateManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [testEmail, setTestEmail] = useState("");
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([
    { key: "clientName", value: "John Smith" },
    { key: "appointmentDate", value: "2025-08-20" },
    { key: "appointmentTime", value: "10:00 AM" },
    { key: "meetingUrl", value: "https://meet.google.com/abc-defg-hij" },
  ]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    tags: [] as string[],
    isActive: true,
  });

  // Get templates
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/gmail-templates"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) => {
      const response = await fetch("/api/admin/gmail-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gmail-templates"] });
      toast({
        title: "Template created successfully",
        description: "Your email template has been saved to Gmail drafts",
      });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const response = await fetch(`/api/admin/gmail-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gmail-templates"] });
      toast({ title: "Template updated successfully" });
      setIsEditing(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/gmail-templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gmail-templates"] });
      toast({ title: "Template deleted successfully" });
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async ({
      templateId,
      to,
      variables,
    }: {
      templateId: string;
      to: string;
      variables: Record<string, string>;
    }) => {
      const response = await fetch("/api/admin/gmail-templates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, to, variables }),
      });

      if (!response.ok) throw new Error("Failed to send test email");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Test email sent successfully", description: `Email sent to ${testEmail}` });
      setTestEmail("");
    },
    onError: () => {
      toast({ title: "Failed to send test email", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      htmlContent: "",
      textContent: "",
      tags: [],
      isActive: true,
    });
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleSaveTemplate = () => {
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast({
        title: "Missing required fields",
        description: "Please fill in name, subject, and HTML content",
      });
      return;
    }

    if (isEditing && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, ...formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || "",
      tags: template.tags,
      isActive: template.isActive,
    });
    setIsEditing(true);
  };

  const handleSendTestEmail = () => {
    if (!selectedTemplate || !testEmail) {
      toast({
        title: "Missing information",
        description: "Please select a template and enter test email address",
      });
      return;
    }

    const variables = templateVariables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {});
    sendTestEmailMutation.mutate({
      templateId: selectedTemplate.id,
      to: testEmail,
      variables,
    });
  };

  const previewContent = () => {
    if (!selectedTemplate) return "";

    let content =
      previewMode === "html" ? selectedTemplate.htmlContent : selectedTemplate.textContent || "";

    // Replace variables for preview
    templateVariables.forEach((v) => {
      const regex = new RegExp(`{{${v.key}}}`, "g");
      content = content.replace(regex, v.value);
    });

    return content;
  };

  const commonTemplates = [
    {
      name: "Appointment Confirmation",
      subject: "Your appointment is confirmed - {{appointmentDate}} at {{appointmentTime}}",
      htmlContent: `
        <h2>Appointment Confirmed</h2>
        <p>Dear {{clientName}},</p>
        <p>Your appointment has been confirmed for <strong>{{appointmentDate}} at {{appointmentTime}}</strong>.</p>
        <p><a href="{{meetingUrl}}" class="cta-button">Join Video Session</a></p>
        <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
        <p>We look forward to our session!</p>
      `,
    },
    {
      name: "Welcome New Client",
      subject: "Welcome to Hive Wellness, {{clientName}}!",
      htmlContent: `
        <h2>Welcome to Hive Wellness!</h2>
        <p>Dear {{clientName}},</p>
        <p>Thank you for choosing Hive Wellness for your mental health journey. We're honored to support you.</p>
        <p>Your therapist will be in touch soon to arrange your first session.</p>
        <p>In the meantime, feel free to explore our resources and tools in your client portal.</p>
        <p>If you have any questions, don't hesitate to reach out.</p>
      `,
    },
    {
      name: "Session Reminder",
      subject: "Reminder: Session tomorrow at {{appointmentTime}}",
      htmlContent: `
        <h2>Session Reminder</h2>
        <p>Dear {{clientName}},</p>
        <p>This is a friendly reminder that you have a session scheduled for tomorrow at {{appointmentTime}}.</p>
        <p><a href="{{meetingUrl}}" class="cta-button">Join Video Session</a></p>
        <p>Please ensure you're in a private, comfortable space with a stable internet connection.</p>
        <p>We look forward to seeing you!</p>
      `,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Template Manager
          </h3>
          <p className="text-sm text-muted-foreground">
            Create and manage email templates directly in Gmail with Hive Wellness branding
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Template" : "Create New Template"}</DialogTitle>
              <DialogDescription>
                Design your email template with Hive Wellness branding. Templates are saved as Gmail
                drafts.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="editor" className="w-full">
              <TabsList>
                <TabsTrigger value="editor">Template Editor</TabsTrigger>
                <TabsTrigger value="common">Common Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Appointment Confirmation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags.join(", ")}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="appointment, confirmation, client"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="Use {{variables}} for dynamic content"
                  />
                </div>

                <div>
                  <Label htmlFor="htmlContent">HTML Content *</Label>
                  <Textarea
                    id="htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, htmlContent: e.target.value }))
                    }
                    placeholder="Write your email content here. Use {{variables}} for dynamic content."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? "Update Template" : "Save Template"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="common" className="space-y-4">
                <div className="grid gap-4">
                  {commonTemplates.map((template, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>{template.subject}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="sm"
                          onClick={() => {
                            setFormData({
                              name: template.name,
                              subject: template.subject,
                              htmlContent: template.htmlContent,
                              textContent: "",
                              tags: ["appointment", "client"],
                              isActive: true,
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Use This Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>{templates.length} templates saved in Gmail</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">Loading templates...</div>
              ) : (
                <div className="divide-y">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 ${selectedTemplate?.id === template.id ? "bg-muted" : ""}`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {template.subject}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}

                  {templates.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No templates found. Create your first template!
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Preview & Actions */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.subject}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(selectedTemplate)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTemplateMutation.mutate(selectedTemplate.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={previewMode}
                    onValueChange={(v) => setPreviewMode(v as "html" | "text")}
                  >
                    <TabsList>
                      <TabsTrigger value="html">HTML Preview</TabsTrigger>
                      <TabsTrigger value="text">Text Version</TabsTrigger>
                    </TabsList>

                    <TabsContent value="html" className="mt-4">
                      <div className="border rounded-md p-4 bg-white max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: previewContent() }} />
                      </div>
                    </TabsContent>

                    <TabsContent value="text" className="mt-4">
                      <pre className="border rounded-md p-4 bg-muted text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {previewContent()}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Test Email */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Test Email</CardTitle>
                  <CardDescription>Test this template with sample variables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {templateVariables.map((templateVariable, index) => (
                      <div key={templateVariable.key}>
                        <Label
                          htmlFor={`var-${templateVariable.key}`}
                        >{`{{${templateVariable.key}}}`}</Label>
                        <Input
                          id={`var-${templateVariable.key}`}
                          value={templateVariable.value}
                          onChange={(e) => {
                            const newVariables = [...templateVariables];
                            newVariables[index].value = e.target.value;
                            setTemplateVariables(newVariables);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Test email address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={sendTestEmailMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a template to preview and manage</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
