import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Mail,
  Send,
  Settings,
  Plus,
  Eye,
  Calendar,
  CalendarIcon,
  TrendingUp,
  AlertCircle,
  Edit,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Email content is required"),
  type: z.string().min(1, "Template type is required"),
  isActive: z.boolean().default(true),
});

const emailCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  templateId: z.string().min(1, "Template is required"),
  targetAudience: z.array(z.string()).min(1, "At least one audience is required"),
  scheduledDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurringType: z.string().optional(),
});

const automationRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  trigger: z.string().min(1, "Trigger is required"),
  templateId: z.string().min(1, "Template is required"),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  isActive: z.boolean().default(true),
});

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  isActive: boolean;
  usage: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  targetAudience: string[];
  status: string;
  scheduledDate?: string;
  sentDate?: string;
  recipients: number;
  opened: number;
  clicked: number;
  bounced: number;
  isRecurring: boolean;
  recurringType?: string;
  createdAt: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  templateId: string;
  templateName: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  isActive: boolean;
  triggerCount: number;
  lastTriggered?: string;
  createdAt: string;
}

export default function AutomatedEmailEngine() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("templates");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Admin-only access control
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Email automation controls are restricted to administrative users only for security
                and compliance reasons.
              </p>
              <p className="text-sm text-gray-500">
                This ensures proper oversight of all automated communications and maintains HIPAA
                compliance standards.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin-only access control
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Email automation and SendGrid workflows are restricted to admin users only.
            </p>
            <p className="text-sm text-gray-500">
              Therapist accounts cannot access messaging automation controls for security and
              compliance reasons.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Template Form
  const templateForm = useForm<z.infer<typeof emailTemplateSchema>>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      content: "",
      type: "",
      isActive: true,
    },
  });

  // Campaign Form
  const campaignForm = useForm<z.infer<typeof emailCampaignSchema>>({
    resolver: zodResolver(emailCampaignSchema),
    defaultValues: {
      name: "",
      templateId: "",
      targetAudience: [],
      isRecurring: false,
    },
  });

  // Automation Form
  const automationForm = useForm<z.infer<typeof automationRuleSchema>>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues: {
      name: "",
      trigger: "",
      templateId: "",
      conditions: [],
      isActive: true,
    },
  });

  // Fetch email templates
  const { data: templates, isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
    retry: false,
  });

  // Fetch email campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/admin/email-campaigns"],
    retry: false,
  });

  // Fetch automation rules
  const { data: automationRules, isLoading: automationLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/admin/email-automation"],
    retry: false,
  });

  // Fetch email analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/email-analytics/${user?.id || "current"}`],
    retry: false,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: z.infer<typeof emailTemplateSchema>) => {
      return await apiRequest("POST", "/api/admin/email-templates", templateData);
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Email template has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setShowNewTemplate(false);
      templateForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create email template.",
        variant: "destructive",
      });
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: z.infer<typeof emailCampaignSchema>) => {
      return await apiRequest("POST", "/api/email-campaigns", campaignData);
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: "Email campaign has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns"] });
      setShowNewCampaign(false);
      campaignForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create email campaign.",
        variant: "destructive",
      });
    },
  });

  // Create automation mutation
  const createAutomationMutation = useMutation({
    mutationFn: async (automationData: z.infer<typeof automationRuleSchema>) => {
      return await apiRequest("POST", "/api/email-automation", automationData);
    },
    onSuccess: () => {
      toast({
        title: "Automation Created",
        description: "Email automation rule has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-automation"] });
      setShowNewAutomation(false);
      automationForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create automation rule.",
        variant: "destructive",
      });
    },
  });

  const templateTypes = [
    "welcome",
    "appointment_reminder",
    "appointment_confirmation",
    "session_feedback",
    "newsletter",
    "promotional",
    "administrative",
    "password_reset",
    "account_activation",
    "payment_confirmation",
  ];

  const audienceOptions = [
    "all_users",
    "clients",
    "therapists",
    "institutions",
    "new_clients",
    "active_clients",
    "inactive_clients",
    "premium_users",
    "trial_users",
  ];

  const triggerOptions = [
    "user_registration",
    "appointment_booked",
    "session_completed",
    "payment_received",
    "subscription_expired",
    "inactive_user",
    "birthday",
    "session_reminder",
    "follow_up_due",
  ];

  const handleTemplateSubmit = (values: z.infer<typeof emailTemplateSchema>) => {
    createTemplateMutation.mutate(values);
  };

  const handleCampaignSubmit = (values: z.infer<typeof emailCampaignSchema>) => {
    createCampaignMutation.mutate(values);
  };

  const handleAutomationSubmit = (values: z.infer<typeof automationRuleSchema>) => {
    createAutomationMutation.mutate(values);
  };

  if (templatesLoading || campaignsLoading || automationLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automated Email Engine</h2>
          <p className="text-muted-foreground">
            Manage email templates, campaigns, and automation rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewTemplate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
          <Button
            onClick={() => setShowNewCampaign(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">0 triggered today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates && templates.length > 0 ? (
              templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          {template.name}
                        </CardTitle>
                        <CardDescription>
                          Type: {template.type} • Subject: {template.subject}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Used {template.usage} times</span>
                      <span>
                        Last used:{" "}
                        {template.lastUsed
                          ? new Date(template.lastUsed).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No email templates found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns && campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Send className="h-5 w-5" />
                          {campaign.name}
                        </CardTitle>
                        <CardDescription>
                          Template: {campaign.templateName} • Recipients: {campaign.recipients}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            campaign.status === "sent"
                              ? "default"
                              : campaign.status === "scheduled"
                                ? "secondary"
                                : campaign.status === "draft"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {campaign.status}
                        </Badge>
                        {campaign.isRecurring && <Badge variant="outline">Recurring</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Opened</p>
                        <p className="text-muted-foreground">
                          {campaign.opened} (
                          {((campaign.opened / campaign.recipients) * 100).toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Clicked</p>
                        <p className="text-muted-foreground">
                          {campaign.clicked} (
                          {((campaign.clicked / campaign.recipients) * 100).toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Bounced</p>
                        <p className="text-muted-foreground">
                          {campaign.bounced} (
                          {((campaign.bounced / campaign.recipients) * 100).toFixed(1)}%)
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Sent Date</p>
                        <p className="text-muted-foreground">
                          {campaign.sentDate
                            ? new Date(campaign.sentDate).toLocaleDateString()
                            : "Not sent"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No email campaigns found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowNewAutomation(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Automation Rule
            </Button>
          </div>
          <div className="grid gap-4">
            {automationRules && automationRules.length > 0 ? (
              automationRules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          {rule.name}
                        </CardTitle>
                        <CardDescription>
                          Trigger: {rule.trigger} • Template: {rule.templateName}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Switch checked={rule.isActive} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Triggered {rule.triggerCount} times</span>
                      <span>
                        Last triggered:{" "}
                        {rule.lastTriggered
                          ? new Date(rule.lastTriggered).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                    {rule.conditions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Conditions:</p>
                        <div className="flex flex-wrap gap-1">
                          {rule.conditions.map((condition, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {condition.field} {condition.operator} {condition.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No automation rules found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Performance</CardTitle>
                <CardDescription>Last 30 days performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Delivery Rate</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Open Rate</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Click-through Rate</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Unsubscribe Rate</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bounce Rate</span>
                    <span className="font-medium">0%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Templates</CardTitle>
                <CardDescription>Based on open and click rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Welcome Email</p>
                      <p className="text-sm text-muted-foreground">Open: 0% • Click: 0%</p>
                    </div>
                    <Badge variant="default">Top</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Appointment Reminder</p>
                      <p className="text-sm text-muted-foreground">Open: 0% • Click: 0%</p>
                    </div>
                    <Badge variant="secondary">2nd</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Session Feedback</p>
                      <p className="text-sm text-muted-foreground">Open: 0% • Click: 0%</p>
                    </div>
                    <Badge variant="outline">3rd</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a new email template for automated campaigns and triggers
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select template type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templateTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace("_", " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={templateForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email subject line" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter email content... You can use variables like {{name}}, {{appointment_date}}, etc."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Template</FormLabel>
                      <FormDescription>
                        Make this template available for campaigns and automation
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewTemplate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Create a new email campaign to reach your target audience
            </DialogDescription>
          </DialogHeader>
          <Form {...campaignForm}>
            <form onSubmit={campaignForm.handleSubmit(handleCampaignSubmit)} className="space-y-4">
              <FormField
                control={campaignForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter campaign name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={campaignForm.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Template</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={campaignForm.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange([...field.value, value])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target audience" />
                        </SelectTrigger>
                        <SelectContent>
                          {audienceOptions.map((audience) => (
                            <SelectItem key={audience} value={audience}>
                              {audience.replace("_", " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {field.value.map((audience) => (
                        <Badge
                          key={audience}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => field.onChange(field.value.filter((a) => a !== audience))}
                        >
                          {audience.replace("_", " ")} ×
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={campaignForm.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={campaignForm.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">Recurring Campaign</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewCampaign(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCampaignMutation.isPending}>
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Automation Dialog */}
      <Dialog open={showNewAutomation} onOpenChange={setShowNewAutomation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Create an automated email trigger based on user actions
            </DialogDescription>
          </DialogHeader>
          <Form {...automationForm}>
            <form
              onSubmit={automationForm.handleSubmit(handleAutomationSubmit)}
              className="space-y-4"
            >
              <FormField
                control={automationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter automation rule name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={automationForm.control}
                  name="trigger"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Event</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trigger" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {triggerOptions.map((trigger) => (
                            <SelectItem key={trigger} value={trigger}>
                              {trigger.replace("_", " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={automationForm.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates?.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={automationForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Rule</FormLabel>
                      <FormDescription>
                        Enable this automation rule to start triggering emails
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewAutomation(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAutomationMutation.isPending}>
                  {createAutomationMutation.isPending ? "Creating..." : "Create Automation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>Subject: {previewTemplate?.subject}</DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="bg-white p-6 rounded shadow-sm border">
              <div className="prose max-w-none">
                {previewTemplate?.content.split("\n").map((line, index) => (
                  <p key={index} className="mb-2">
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewTemplate(null)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
