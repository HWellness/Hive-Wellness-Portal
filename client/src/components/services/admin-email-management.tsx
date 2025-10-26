import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Send, Clock, CheckCircle, AlertTriangle, Users, Eye, Edit, Trash2, Plus, Calendar, Filter, Search, FileText, Settings } from "lucide-react";
import type { User } from "@shared/schema";

interface AdminEmailManagementProps {
  user: User;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'welcome' | 'appointment' | 'reminder' | 'billing' | 'general';
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledDate?: string;
  sentDate?: string;
  createdAt: string;
}

interface EmailQueue {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: 'pending' | 'sent' | 'failed' | 'processing';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: string;
  sentAt?: string;
  errorMessage?: string;
  retryCount: number;
}

export default function AdminEmailManagement({ user }: AdminEmailManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [templateData, setTemplateData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'general' as const
  });
  
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    content: '',
    recipientType: 'all',
    scheduledDate: ''
  });

  // Demo email templates
  const demoTemplates: EmailTemplate[] = [
    {
      id: 'template-1',
      name: 'Welcome New Client',
      subject: 'Welcome to Hive Wellness - Your Journey Begins',
      content: 'Dear {{client_name}},\n\nWelcome to Hive Wellness! We\'re delighted to have you join our community...',
      type: 'welcome',
      isActive: true,
      createdAt: '2024-12-01T10:00:00Z',
      lastUsed: '2025-02-01T14:30:00Z',
      usageCount: 156
    },
    {
      id: 'template-2',
      name: 'Appointment Confirmation',
      subject: 'Your Therapy Session is Confirmed',
      content: 'Hello {{client_name}},\n\nYour therapy session with {{therapist_name}} is confirmed for {{date}} at {{time}}...',
      type: 'appointment',
      isActive: true,
      createdAt: '2024-11-15T09:00:00Z',
      lastUsed: '2025-02-02T11:15:00Z',
      usageCount: 892
    },
    {
      id: 'template-3',
      name: 'Payment Reminder',
      subject: 'Payment Due - Hive Wellness',
      content: 'Dear {{client_name}},\n\nThis is a friendly reminder that your payment of {{amount}} is due...',
      type: 'billing',
      isActive: true,
      createdAt: '2024-11-20T15:00:00Z',
      lastUsed: '2025-01-30T16:00:00Z',
      usageCount: 243
    },
    {
      id: 'template-4',
      name: 'Session Reminder',
      subject: 'Reminder: Your Session Tomorrow',
      content: 'Hi {{client_name}},\n\nJust a friendly reminder that you have a session scheduled tomorrow...',
      type: 'reminder',
      isActive: false,
      createdAt: '2024-10-10T12:00:00Z',
      usageCount: 67
    }
  ];

  // Demo email campaigns
  const demoCampaigns: EmailCampaign[] = [
    {
      id: 'campaign-1',
      name: 'January Wellness Newsletter',
      subject: 'New Year, New You - Wellness Tips for 2025',
      status: 'sent',
      recipientCount: 1247,
      sentCount: 1247,
      openRate: 68.5,
      clickRate: 12.3,
      sentDate: '2025-01-15T10:00:00Z',
      createdAt: '2025-01-10T14:00:00Z'
    },
    {
      id: 'campaign-2',
      name: 'Therapist Appreciation Week',
      subject: 'Celebrating Our Amazing Therapists',
      status: 'scheduled',
      recipientCount: 1456,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      scheduledDate: '2025-02-14T09:00:00Z',
      createdAt: '2025-02-01T11:00:00Z'
    },
    {
      id: 'campaign-3',
      name: 'Platform Updates',
      subject: 'Exciting New Features Coming Soon',
      status: 'draft',
      recipientCount: 0,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: '2025-01-28T16:00:00Z'
    }
  ];

  // Demo email queue
  const demoEmailQueue: EmailQueue[] = [
    {
      id: 'queue-1',
      to: 'emma.johnson@example.com',
      subject: 'Your session with Dr. Sarah Chen is confirmed',
      template: 'Appointment Confirmation',
      status: 'pending',
      priority: 'high',
      scheduledFor: '2025-02-03T09:00:00Z',
      retryCount: 0
    },
    {
      id: 'queue-2',
      to: 'michael.chen@example.com',
      subject: 'Payment reminder for January sessions',
      template: 'Payment Reminder',
      status: 'failed',
      priority: 'normal',
      errorMessage: 'Invalid email address',
      retryCount: 3
    },
    {
      id: 'queue-3',
      to: 'sarah.williams@example.com',
      subject: 'Welcome to Hive Wellness',
      template: 'Welcome New Client',
      status: 'sent',
      priority: 'normal',
      sentAt: '2025-02-02T14:30:00Z',
      retryCount: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.draft}>
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[priority as keyof typeof variants] || variants.normal}>
        {priority}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return <Users className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'reminder': return <Clock className="h-4 w-4" />;
      case 'billing': return <FileText className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateData) => {
      return await apiRequest('POST', '/api/admin/email/templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/templates'] });
      toast({
        title: "Template created successfully",
        description: "New email template has been saved",
      });
      setShowCreateTemplate(false);
      setTemplateData({ name: '', subject: '', content: '', type: 'general' });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating template",
        description: error.message || "Failed to create email template",
        variant: "destructive",
      });
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof campaignData) => {
      return await apiRequest('POST', '/api/admin/email/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email/campaigns'] });
      toast({
        title: "Campaign created successfully",
        description: "New email campaign has been created",
      });
      setShowCreateCampaign(false);
      setCampaignData({ name: '', subject: '', content: '', recipientType: 'all', scheduledDate: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating campaign",
        description: error.message || "Failed to create email campaign",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hive-black">Email Management</h1>
          <p className="text-gray-600 mt-1">Manage email templates, campaigns, and delivery</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateData.name}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Welcome Email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateType">Type</Label>
                    <Select value={templateData.type} onValueChange={(value: any) => setTemplateData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="templateSubject">Subject Line</Label>
                  <Input
                    id="templateSubject"
                    value={templateData.subject}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Welcome to Hive Wellness"
                  />
                </div>
                
                <div>
                  <Label htmlFor="templateContent">Email Content</Label>
                  <Textarea
                    id="templateContent"
                    value={templateData.content}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Dear {{client_name}},&#10;&#10;Welcome to Hive Wellness..."
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use variables like: client_name, therapist_name, appointment_date, appointment_time, session_amount
                  </p>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createTemplateMutation.mutate(templateData)}
                    disabled={createTemplateMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                  >
                    {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
            <DialogTrigger asChild>
              <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
                <Send className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Email Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    value={campaignData.name}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="February Newsletter"
                  />
                </div>
                
                <div>
                  <Label htmlFor="campaignSubject">Subject Line</Label>
                  <Input
                    id="campaignSubject"
                    value={campaignData.subject}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Important Updates from Hive Wellness"
                  />
                </div>
                
                <div>
                  <Label htmlFor="recipients">Recipients</Label>
                  <Select value={campaignData.recipientType} onValueChange={(value) => setCampaignData(prev => ({ ...prev, recipientType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="clients">Clients Only</SelectItem>
                      <SelectItem value="therapists">Therapists Only</SelectItem>
                      <SelectItem value="institutions">Institutions Only</SelectItem>
                      <SelectItem value="active">Active Users Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="campaignContent">Email Content</Label>
                  <Textarea
                    id="campaignContent"
                    value={campaignData.content}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Dear Hive Wellness community,&#10;&#10;We hope this message finds you well..."
                    rows={8}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduledDate">Schedule for later (optional)</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={campaignData.scheduledDate}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline">
                    Save as Draft
                  </Button>
                  <Button 
                    onClick={() => createCampaignMutation.mutate(campaignData)}
                    disabled={createCampaignMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                  >
                    {campaignData.scheduledDate ? 'Schedule' : 'Send Now'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">1,247</p>
                <p className="text-sm text-gray-600">Emails Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">23</p>
                <p className="text-sm text-gray-600">Emails in Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">{demoTemplates.length}</p>
                <p className="text-sm text-gray-600">Active Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-hive-light-blue rounded-lg">
                <Send className="h-6 w-6 text-hive-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-hive-black">68.5%</p>
                <p className="text-sm text-gray-600">Avg. Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="data-[state=active]:bg-hive-purple data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-hive-purple data-[state=active]:text-white">
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-hive-purple data-[state=active]:text-white">
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="queue" className="data-[state=active]:bg-hive-purple data-[state=active]:text-white">
            Email Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-hive-light-blue rounded-full">
                        {getTypeIcon(template.type)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-hive-black">{template.name}</h3>
                          {template.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{template.subject}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>Used {template.usageCount} times</span>
                          {template.lastUsed && (
                            <span>Last used: {new Date(template.lastUsed).toLocaleDateString('en-GB')}</span>
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
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-hive-black">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{campaign.subject}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{campaign.recipientCount} recipients</span>
                        {campaign.status === 'sent' && (
                          <>
                            <span>{campaign.openRate}% open rate</span>
                            <span>{campaign.clickRate}% click rate</span>
                          </>
                        )}
                        {campaign.scheduledDate && campaign.status === 'scheduled' && (
                          <span>Scheduled for: {new Date(campaign.scheduledDate).toLocaleDateString('en-GB')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {campaign.status === 'draft' && (
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoEmailQueue.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-hive-black">{email.subject}</h3>
                        {getStatusBadge(email.status)}
                        {getPriorityBadge(email.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">To: {email.to}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Template: {email.template}</span>
                        {email.scheduledFor && (
                          <span>Scheduled: {new Date(email.scheduledFor).toLocaleDateString('en-GB')}</span>
                        )}
                        {email.sentAt && (
                          <span>Sent: {new Date(email.sentAt).toLocaleDateString('en-GB')}</span>
                        )}
                        {email.retryCount > 0 && (
                          <span>Retries: {email.retryCount}</span>
                        )}
                      </div>
                      {email.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">{email.errorMessage}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {email.status === 'failed' && (
                        <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                          Retry
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}