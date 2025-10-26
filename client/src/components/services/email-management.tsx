import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Send, Plus, Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { User } from '@shared/schema';

interface EmailStats {
  total: number;
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  byPriority: {
    high: number;
    normal: number;
    low: number;
  };
}

interface EmailQueueItem {
  id: string;
  type: string;
  to: string;
  subject: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  error?: string;
  scheduledFor: string;
  createdAt: string;
  sentAt?: string;
}

interface EmailManagementProps {
  user?: User;
}

const EmailManagement: React.FC<EmailManagementProps> = ({ user }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [testEmail, setTestEmail] = useState('');
  const [testEmailType, setTestEmailType] = useState('welcome');

  // Admin-only access control
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Email management and SendGrid configuration are restricted to admin users only.
            </p>
            <p className="text-sm text-gray-500">
              Therapist accounts cannot access messaging automation controls for security and compliance reasons.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Email compose form state
  const [emailForm, setEmailForm] = useState({
    recipientType: 'individual',
    to: '',
    cc: '',
    subject: '',
    body: '',
    priority: 'normal',
    template: ''
  });
  
  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // Get email statistics
  const { data: stats, isLoading: statsLoading } = useQuery<EmailStats>({
    queryKey: ['/api/emails/stats'],
    refetchInterval: 180000, // Refresh every 3 minutes
    staleTime: 120000 // Keep data fresh for 2 minutes
  });

  // Get email queue
  const { data: emailQueue = [], isLoading: queueLoading } = useQuery<EmailQueueItem[]>({
    queryKey: ['/api/emails/queue', selectedStatus],
    refetchInterval: 180000, // Refresh every 3 minutes
    staleTime: 120000 // Keep data fresh for 2 minutes
  });

  // Process email queue mutation
  const processQueueMutation = useMutation({
    mutationFn: async (batchSize: number) => {
      const response = await apiRequest('POST', '/api/emails/process-queue', { batchSize });
      return response as unknown as { processed: number };
    },
    onSuccess: (data) => {
      toast({
        title: "Email Queue Processed",
        description: `Successfully processed ${data.processed} emails`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/queue'] });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: (data: { type: string; to: string; testData?: any }) => 
      apiRequest('POST', '/api/emails/send-test', data),
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Test email has been queued successfully",
      });
      setTestEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/emails/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/queue'] });
    },
    onError: (error) => {
      toast({
        title: "Test Email Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Schedule reminders mutation
  const scheduleRemindersMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/emails/schedule-reminders'),
    onSuccess: () => {
      toast({
        title: "Reminders Scheduled",
        description: "Automated reminders have been scheduled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/queue'] });
    },
    onError: (error) => {
      toast({
        title: "Scheduling Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Send direct email mutation
  const sendEmailMutation = useMutation({
    mutationFn: (emailData: typeof emailForm) => {
      if (emailForm.recipientType === 'individual') {
        return apiRequest('POST', '/api/emails/send-direct', emailData);
      } else {
        return apiRequest('POST', '/api/emails/send-to-users', emailData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully",
        description: "Your email has been sent successfully",
      });
      // Reset form
      setEmailForm({
        recipientType: 'individual',
        to: '',
        cc: '',
        subject: '',
        body: '',
        priority: 'normal',
        template: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/queue'] });
    },
    onError: (error: any) => {
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    }
  });

  // Button handlers
  const handleSendEmail = () => {
    if (!emailForm.to && emailForm.recipientType === 'individual') {
      toast({
        title: "Validation Error",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!emailForm.subject || !emailForm.body) {
      toast({
        title: "Validation Error", 
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate(emailForm);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your email has been saved as a draft",
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const updateEmailForm = (field: string, value: string) => {
    setEmailForm(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get role-specific recipient options
  const getRecipientOptions = () => {
    const userRole = user?.role || 'admin';
    
    if (userRole === 'admin') {
      return [
        { value: 'individual', label: 'Individual' },
        { value: 'all-clients', label: 'All Clients' },
        { value: 'all-therapists', label: 'All Therapists' },
        { value: 'all-institutions', label: 'All Institutions' },
        { value: 'custom-group', label: 'Custom Group' },
        { value: 'external', label: 'External' }
      ];
    } else if (userRole === 'therapist') {
      return [
        { value: 'individual', label: 'Individual Client' },
        { value: 'my-clients', label: 'All My Clients' },
        { value: 'colleagues', label: 'Fellow Therapists' },
        { value: 'admin', label: 'Platform Admin' },
        { value: 'external', label: 'External' }
      ];
    } else if (userRole === 'institution') {
      return [
        { value: 'individual', label: 'Individual' },
        { value: 'organisation-staff', label: 'Organisation Staff' },
        { value: 'organisation-therapists', label: 'Our Therapists' },
        { value: 'organisation-students', label: 'Students/Users' },
        { value: 'platform-admin', label: 'Platform Admin' },
        { value: 'external', label: 'External' }
      ];
    }
    
    return [{ value: 'individual', label: 'Individual' }];
  };

  // Get role-specific page title
  const getPageTitle = () => {
    const userRole = user?.role || 'admin';
    
    if (userRole === 'therapist') {
      return 'Client Communications';
    } else if (userRole === 'institution') {
      return 'Institutional Communications';
    }
    
    return 'Email Management System';
  };

  // Get role-specific description
  const getPageDescription = () => {
    const userRole = user?.role || 'admin';
    
    if (userRole === 'therapist') {
      return 'Send emails to your clients and colleagues';
    } else if (userRole === 'institution') {
      return 'Manage communications for your organisation';
    }
    
    return 'Comprehensive email system for platform-wide communications';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="w-4 h-4" />;
      case 'processing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'sent': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="text-gray-600">{getPageDescription()}</p>
        </div>
        <Button 
          onClick={() => scheduleRemindersMutation.mutate()}
          disabled={scheduleRemindersMutation.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {scheduleRemindersMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4 mr-2" />
          )}
          Schedule Reminders
        </Button>
      </div>

      {/* Email Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Emails</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Queued</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.queued || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.sent || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.failed || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="queue">Email Queue</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* Email Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Queue Management</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => processQueueMutation.mutate(10)}
                    disabled={processQueueMutation.isPending}
                    size="sm"
                  >
                    {processQueueMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Process Queue
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {emailQueue && emailQueue.length > 0 ? (
                    emailQueue.map((email) => (
                      <div 
                        key={email.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(email.status)}
                            <Badge className={getStatusColor(email.status)}>
                              {email.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{email.subject}</p>
                            <p className="text-sm text-gray-600">
                              To: {email.to} • Type: {email.type}
                            </p>
                            {email.error && (
                              <p className="text-sm text-red-600 mt-1">
                                Error: {email.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getPriorityColor(email.priority)}>
                            {email.priority}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {email.sentAt ? `Sent: ${formatDate(email.sentAt)}` : 
                               `Scheduled: ${formatDate(email.scheduledFor)}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Attempts: {email.attempts}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No emails in queue</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compose Email Tab */}
        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose & Send Email</CardTitle>
              <p className="text-gray-600">Send emails to users or external recipients</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recipients */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipient-type">Recipient Type</Label>
                    <Select value={emailForm.recipientType} onValueChange={(value) => updateEmailForm('recipientType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getRecipientOptions().filter(option => option && option.value && option.value.length > 0).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="email-to">To</Label>
                    <Input 
                      id="email-to" 
                      placeholder="Enter email addresses (comma-separated)"
                      className="h-20"
                      value={emailForm.to}
                      onChange={(e) => updateEmailForm('to', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email-cc">CC (Optional)</Label>
                    <Input 
                      id="email-cc" 
                      placeholder="CC recipients"
                      value={emailForm.cc}
                      onChange={(e) => updateEmailForm('cc', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email-priority">Priority</Label>
                    <Select value={emailForm.priority} onValueChange={(value) => updateEmailForm('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Email Content */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <Label htmlFor="email-subject">Subject</Label>
                    <Input 
                      id="email-subject" 
                      placeholder="Email subject"
                      value={emailForm.subject}
                      onChange={(e) => updateEmailForm('subject', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email-template">Use Template</Label>
                    <Select value={emailForm.template} onValueChange={(value) => updateEmailForm('template', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Template (Custom)</SelectItem>
                        <SelectItem value="general">General Message</SelectItem>
                        <SelectItem value="welcome">Welcome Email</SelectItem>
                        <SelectItem value="appointmentReminder">Appointment Reminder</SelectItem>
                        <SelectItem value="sessionComplete">Session Complete</SelectItem>
                        <SelectItem value="therapistWelcome">Therapist Welcome</SelectItem>
                        <SelectItem value="connectingComplete">Connecting Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="email-body">Message</Label>
                    <textarea 
                      id="email-body"
                      className="w-full h-64 p-3 border rounded-md resize-none"
                      placeholder="Compose your email message..."
                      value={emailForm.body}
                      onChange={(e) => updateEmailForm('body', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleSendEmail}
                      disabled={sendEmailMutation.isPending}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleSaveDraft}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handlePreview}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SendGrid Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2 text-blue-500" />
                  SendGrid Integration
                </CardTitle>
                <p className="text-gray-600">Automated system emails</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="font-medium">Connected</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm"><strong>API Status:</strong> ✅ Operational</p>
                  <p className="text-sm"><strong>Monthly Quota:</strong> 15,000 / 25,000 emails</p>
                  <p className="text-sm"><strong>Delivery Rate:</strong> 98.7%</p>
                  <p className="text-sm"><strong>Last Sync:</strong> 2 minutes ago</p>
                </div>
                
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure SendGrid
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Templates
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Google Workspace Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-red-500" />
                  Google Workspace
                </CardTitle>
                <p className="text-gray-600">Business communications</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <span className="font-medium">Setup Required</span>
                  </div>
                  <Badge variant="outline">Configure</Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Connect your Google Workspace account to:</p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Send business emails through Gmail</li>
                    <li>• Access shared calendars</li>
                    <li>• Sync contact directories</li>
                    <li>• Enable SSO for staff</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Connect Google Workspace
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Setup Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Email Integration Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">1,247</p>
                  <p className="text-sm text-gray-600">SendGrid Emails (30d)</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">0</p>
                  <p className="text-sm text-gray-600">Workspace Emails (30d)</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">98.7%</p>
                  <p className="text-sm text-gray-600">Delivery Success</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">12</p>
                  <p className="text-sm text-gray-600">Active Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Email Sending */}
            <Card>
              <CardHeader>
                <CardTitle>Email System Testing</CardTitle>
                <p className="text-gray-600">Send test emails to verify system functionality</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-email-type">Email Template</Label>
                    <Select value={testEmailType} onValueChange={setTestEmailType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select email template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome Email</SelectItem>
                        <SelectItem value="appointmentReminder">Appointment Reminder</SelectItem>
                        <SelectItem value="sessionComplete">Session Complete</SelectItem>
                        <SelectItem value="therapistWelcome">Therapist Welcome</SelectItem>
                        <SelectItem value="connectingComplete">Connecting Complete</SelectItem>
                        <SelectItem value="systemAlert">System Alert</SelectItem>
                        <SelectItem value="billing">Billing Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="Enter email address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="test-environment">Environment</Label>
                    <Select defaultValue="development">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => sendTestEmailMutation.mutate({ 
                        type: testEmailType, 
                        to: testEmail 
                      })}
                      disabled={sendTestEmailMutation.isPending || !testEmail}
                      variant="outline"
                    >
                      {sendTestEmailMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Send Test
                    </Button>
                    
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results & Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Test History */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    <div className="p-3 border rounded-lg bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-sm">Welcome Email</span>
                        </div>
                        <span className="text-xs text-gray-500">2 min ago</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Sent to test@example.com</p>
                      <p className="text-xs text-green-600">✓ Delivered successfully</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium text-sm">Appointment Reminder</span>
                        </div>
                        <span className="text-xs text-gray-500">5 min ago</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Sent to admin@demo.hive</p>
                      <p className="text-xs text-yellow-600">⏳ Processing...</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg bg-red-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-sm">System Alert</span>
                        </div>
                        <span className="text-xs text-gray-500">8 min ago</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Sent to invalid@email</p>
                      <p className="text-xs text-red-600">✗ Invalid email format</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-lg font-bold text-green-600">24</p>
                      <p className="text-xs text-gray-600">Success</p>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                      <p className="text-lg font-bold text-yellow-600">2</p>
                      <p className="text-xs text-gray-600">Pending</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <p className="text-lg font-bold text-red-600">1</p>
                      <p className="text-xs text-gray-600">Failed</p>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Advanced Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Email Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-medium">Bulk Test</h3>
                  <p className="text-sm text-gray-600 mb-3">Send to multiple recipients</p>
                  <Button size="sm" variant="outline">
                    Configure Bulk Test
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg text-center">
                  <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <h3 className="font-medium">Scheduled Test</h3>
                  <p className="text-sm text-gray-600 mb-3">Test scheduling functionality</p>
                  <Button size="sm" variant="outline">
                    Schedule Test
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg text-center">
                  <Settings className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <h3 className="font-medium">Load Test</h3>
                  <p className="text-sm text-gray-600 mb-3">Test system performance</p>
                  <Button size="sm" variant="outline">
                    Run Load Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Welcome Emails</h3>
                  <p className="text-sm text-gray-600">Sent to new users</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <h3 className="font-medium">Appointment Reminders</h3>
                  <p className="text-sm text-gray-600">24hr before sessions</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-medium">Session Follow-ups</h3>
                  <p className="text-sm text-gray-600">Post-session feedback</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Active</Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Priority Distribution</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold text-red-600">{stats?.byPriority.high || 0}</p>
                    <p className="text-sm text-gray-600">High Priority</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold text-blue-600">{stats?.byPriority.normal || 0}</p>
                    <p className="text-sm text-gray-600">Normal Priority</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold text-gray-600">{stats?.byPriority.low || 0}</p>
                    <p className="text-sm text-gray-600">Low Priority</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2 mb-4">
                <p><strong>To:</strong> {emailForm.to || 'No recipient specified'}</p>
                {emailForm.cc && <p><strong>CC:</strong> {emailForm.cc}</p>}
                <p><strong>Subject:</strong> {emailForm.subject || 'No subject'}</p>
                <p><strong>Priority:</strong> {emailForm.priority}</p>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Message:</h4>
                <div className="whitespace-pre-wrap p-3 bg-white border rounded">
                  {emailForm.body || 'No message content'}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
              <Button onClick={() => {
                setShowPreview(false);
                handleSendEmail();
              }}>
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailManagement;