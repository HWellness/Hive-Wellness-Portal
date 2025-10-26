import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Eye, Search, Download, Filter, Calendar, Mail, User, FileText, Brain, Heart, Send } from 'lucide-react';

interface ClientQuestionnaire {
  id: string;
  clientId: string;
  responses: any;
  aiRecommendations: any;
  assignedTherapistId?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ClientQuestionnairesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<ClientQuestionnaire | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendActivationEmailMutation = useMutation({
    mutationFn: async ({ clientEmail, clientFirstName, therapistId }: { clientEmail: string, clientFirstName: string, therapistId: string }) => {
      const response = await apiRequest('POST', '/api/admin/client-activation/send-email', {
        clientEmail,
        clientFirstName,
        matchedTherapistId: therapistId,
        expiryDays: 7
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send activation email');
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      if (data.token && data.token.clientEmail) {
        toast({
          title: "Account Setup Email Sent",
          description: `Activation email sent to ${data.token.clientEmail} with therapist ${data.therapistName}`,
        });
      } else {
        toast({
          title: "Email Sent",
          description: "Activation email has been sent successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: error.message || "Could not send activation email",
      });
    }
  });

  const { data: questionnaires = [], isLoading, refetch } = useQuery<ClientQuestionnaire[]>({
    queryKey: ['/api/admin/client-questionnaires'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/client-questionnaires');
      return response.json();
    }
  });

  const filteredQuestionnaires = questionnaires.filter(questionnaire => {
    const matchesSearch = searchTerm === '' || 
      questionnaire.step2Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      questionnaire.step2FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      questionnaire.step2LastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      questionnaire.responses?.personalInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      questionnaire.responses?.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      questionnaire.responses?.personalInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      questionnaire.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || questionnaire.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusTypes = [...new Set(questionnaires.map(q => q.status))];

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'reviewed': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-green-100 text-green-800',
      'completed': 'bg-purple-100 text-purple-800',
      'on_hold': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatQuestionnaire = (questionnaire: any): string => {
    // Handle the new step-based questionnaire schema
    const sections = [];
    
    // Personal Information
    if (questionnaire.step2FirstName || questionnaire.step2LastName || questionnaire.step2Email) {
      sections.push(`=== PERSONAL INFORMATION ===
Name: ${questionnaire.step2FirstName || ''} ${questionnaire.step2LastName || ''}
Email: ${questionnaire.step2Email || ''}
Age Range: ${questionnaire.step3AgeRange || 'Not specified'}
Gender: ${questionnaire.step4Gender || 'Not specified'}
Pronouns: ${questionnaire.step5Pronouns || 'Not specified'}`);
    }

    // Wellbeing Assessment
    if (questionnaire.step6WellbeingRating) {
      sections.push(`=== WELLBEING ASSESSMENT ===
Current Wellbeing Rating: ${questionnaire.step6WellbeingRating}/10`);
    }

    // Mental Health Information
    if (questionnaire.step7MentalHealthSymptoms) {
      let symptoms = [];
      try {
        symptoms = Array.isArray(questionnaire.step7MentalHealthSymptoms) 
          ? questionnaire.step7MentalHealthSymptoms 
          : (typeof questionnaire.step7MentalHealthSymptoms === 'string' 
             ? JSON.parse(questionnaire.step7MentalHealthSymptoms)
             : [questionnaire.step7MentalHealthSymptoms]);
      } catch (e) {
        symptoms = [questionnaire.step7MentalHealthSymptoms];
      }
      
      sections.push(`=== MENTAL HEALTH SYMPTOMS ===
Symptoms: ${symptoms.join(', ')}`);
    }

    // Support Areas
    if (questionnaire.step8SupportAreas) {
      let supportAreas = [];
      try {
        supportAreas = Array.isArray(questionnaire.step8SupportAreas) 
          ? questionnaire.step8SupportAreas 
          : (typeof questionnaire.step8SupportAreas === 'string' 
             ? JSON.parse(questionnaire.step8SupportAreas)
             : [questionnaire.step8SupportAreas]);
      } catch (e) {
        supportAreas = [questionnaire.step8SupportAreas];
      }
      
      sections.push(`=== SUPPORT AREAS ===
Areas needing support: ${supportAreas.join(', ')}`);
    }

    // Therapy Preferences
    if (questionnaire.step9TherapyTypes) {
      let therapyTypes = [];
      try {
        therapyTypes = Array.isArray(questionnaire.step9TherapyTypes) 
          ? questionnaire.step9TherapyTypes 
          : (typeof questionnaire.step9TherapyTypes === 'string' 
             ? JSON.parse(questionnaire.step9TherapyTypes)
             : [questionnaire.step9TherapyTypes]);
      } catch (e) {
        therapyTypes = [questionnaire.step9TherapyTypes];
      }
      
      sections.push(`=== THERAPY PREFERENCES ===
Preferred therapy types: ${therapyTypes.join(', ')}`);
    }

    // Previous Therapy Experience
    if (questionnaire.step10PreviousTherapy) {
      sections.push(`=== PREVIOUS THERAPY ===
Previous therapy experience: ${questionnaire.step10PreviousTherapy}`);
    }

    // Additional Information
    if (questionnaire.step11TherapyGoals) {
      sections.push(`=== THERAPY GOALS ===
Goals: ${questionnaire.step11TherapyGoals}`);
    }

    if (questionnaire.step12Availability) {
      sections.push(`=== AVAILABILITY ===
Preferred times: ${questionnaire.step12Availability}`);
    }

    if (questionnaire.step13TherapistPreferences) {
      sections.push(`=== THERAPIST PREFERENCES ===
Preferences: ${questionnaire.step13TherapistPreferences}`);
    }

    // If no sections found, try the old responses format or show minimal info
    if (sections.length === 0) {
      if (questionnaire.responses) {
        return `=== QUESTIONNAIRE RESPONSES ===\n${JSON.stringify(questionnaire.responses, null, 2)}`;
      } else {
        return `=== QUESTIONNAIRE DATA ===\nID: ${questionnaire.id}\nStatus: ${questionnaire.status}\nCreated: ${new Date(questionnaire.created_at).toLocaleDateString()}`;
      }
    }

    return sections.join('\n\n');
  };

  const stats = {
    total: questionnaires.length,
    pending: questionnaires.filter(q => q.status === 'pending').length,
    reviewed: questionnaires.filter(q => q.status === 'reviewed').length,
    assigned: questionnaires.filter(q => q.status === 'assigned').length,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client questionnaires...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Questionnaires</h1>
          <p className="text-gray-600 mt-1">
            Review therapy intake assessments and AI recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              try {
                await queryClient.invalidateQueries({ queryKey: ['/api/admin/client-questionnaires'] });
                refetch();
                toast({
                  title: "Data Refreshed",
                  description: "Client questionnaire data has been updated",
                });
              } catch (error) {
                console.error('Refresh error:', error);
                toast({
                  title: "Refresh Failed",
                  description: "Could not refresh data",
                  variant: "destructive"
                });
              }
            }}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Refresh Local
          </Button>
          <Button 
            onClick={async () => {
              try {
                const response = await apiRequest('POST', '/api/admin/import-hubspot-data');
                const result = await response.json();
                
                if (result.success) {
                  const imported = result.results?.clientQuestionnaires?.imported || 0;
                  const errors = result.results?.clientQuestionnaires?.errors || [];
                  
                  await queryClient.invalidateQueries({ queryKey: ['/api/admin/client-questionnaires'] });
                  refetch();
                  
                  if (imported > 0) {
                    toast({
                      title: "HubSpot Import Successful",
                      description: `Successfully imported ${imported} new client questionnaires`,
                    });
                  } else if (errors.length > 0) {
                    toast({
                      title: "HubSpot Import Issues",
                      description: `No new data imported. ${errors[0]?.substring(0, 60)}...`,
                      variant: "destructive"
                    });
                  } else {
                    toast({
                      title: "HubSpot Import Complete",
                      description: "No new submissions found in HubSpot",
                    });
                  }
                } else {
                  toast({
                    title: "Import Failed", 
                    description: result.error || "Could not import from HubSpot. Check API configuration.",
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error('HubSpot import error:', error);
                toast({
                  title: "Import Error",
                  description: "Failed to connect to HubSpot API. Please check credentials.",
                  variant: "destructive"
                });
              }
            }}
            className="bg-hive-purple hover:bg-hive-purple/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Import from HubSpot
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-hive-purple" />
              <span className="text-sm text-gray-600">Total Questionnaires</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-600">Pending Review</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          </CardContent>
        </Card>
        
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">AI Reviewed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.reviewed}</p>
          </CardContent>
        </Card>
        
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Therapist Assigned</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.assigned}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="all">All Statuses</option>
            {statusTypes.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questionnaires Table */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Questionnaires ({filteredQuestionnaires.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuestionnaires.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questionnaires Found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No questionnaires match your current filters.' 
                  : 'No client questionnaires have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">AI Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Submitted</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestionnaires.map((questionnaire) => (
                    <tr key={questionnaire.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {questionnaire.step2FirstName && questionnaire.step2LastName
                              ? `${questionnaire.step2FirstName} ${questionnaire.step2LastName}`
                              : questionnaire.responses?.personalInfo?.firstName && questionnaire.responses?.personalInfo?.lastName
                              ? `${questionnaire.responses.personalInfo.firstName} ${questionnaire.responses.personalInfo.lastName}`
                              : 'Name not provided'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {questionnaire.step2Email || questionnaire.responses?.personalInfo?.email || 'Email not provided'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(questionnaire.status)}>
                          {questionnaire.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">
                            {questionnaire.aiRecommendations?.matchScore || 'N/A'}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(questionnaire.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {questionnaire.assignedTherapistId && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                const clientEmail = questionnaire.step2Email || questionnaire.responses?.personalInfo?.email;
                                const clientFirstName = questionnaire.step2FirstName || questionnaire.responses?.personalInfo?.firstName;
                                
                                if (!clientEmail || !clientFirstName) {
                                  toast({
                                    variant: "destructive",
                                    title: "Missing Information",
                                    description: "Client email or name is missing from questionnaire",
                                  });
                                  return;
                                }
                                
                                sendActivationEmailMutation.mutate({
                                  clientEmail,
                                  clientFirstName,
                                  therapistId: questionnaire.assignedTherapistId!
                                });
                              }}
                              disabled={sendActivationEmailMutation.isPending}
                              className="bg-hive-purple hover:bg-hive-purple/90"
                              data-testid={`button-send-activation-${questionnaire.id}`}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {sendActivationEmailMutation.isPending ? 'Sending...' : 'Send Account Setup Email'}
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedQuestionnaire(questionnaire)}
                                data-testid={`button-review-${questionnaire.id}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                            </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Client Questionnaire Review</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-2">Questionnaire ID</h3>
                                  <p className="text-sm text-gray-600">{questionnaire.id}</p>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                                  <Badge className={getStatusColor(questionnaire.status)}>
                                    {questionnaire.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              
                              {questionnaire.aiRecommendations && (
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-2">AI Recommendations</h3>
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Brain className="w-5 h-5 text-blue-600" />
                                      <span className="font-medium text-blue-900">
                                        Match Score: {questionnaire.aiRecommendations.matchScore || 'N/A'}%
                                      </span>
                                    </div>
                                    <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                                      {JSON.stringify(questionnaire.aiRecommendations, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Client Responses</h3>
                                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                                  {formatQuestionnaire(questionnaire)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}