import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Users, Calendar, Mail, Phone, MessageCircle, Plus, FileText, Edit, TrendingUp, Upload, Download, Trash2, RefreshCw } from 'lucide-react';
import { User as UserType } from '@shared/schema';
import { ObjectUploader } from '@/components/ObjectUploader';

interface AssignedClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assignedDate: string;
  sessionCount: number;
  lastSession?: string;
  nextSession?: string;
  status: 'active' | 'pending' | 'paused' | 'completed';
  hasPaymentMethod: boolean;
  totalSessions: number;
  completedSessions: number;
  currentGoals: string[];
  lastNotes?: string;
  riskLevel: 'low' | 'medium' | 'high';
  progressStatus: 'excellent' | 'good' | 'fair' | 'needs_attention';
}

interface ClientNote {
  id: string;
  clientId: string;
  date: string;
  sessionType: 'individual' | 'consultation';
  duration?: number;
  content: string;
  mood: number; // 1-10 scale
  goals: string[];
  homework?: string;
  nextSteps?: string;
  tags: string[];
  confidential: boolean;
}

interface ClientDocument {
  id: string;
  clientId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
  documentType: 'note' | 'assessment' | 'treatment_plan' | 'report' | 'other';
  description?: string;
}

interface TherapistClientManagementProps {
  user: UserType;
}

export default function TherapistClientManagement({ user }: TherapistClientManagementProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<AssignedClient | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'individual' | 'consultation'>('individual');
  const [documentType, setDocumentType] = useState<'note' | 'assessment' | 'treatment_plan' | 'report' | 'other'>('note');
  const [documentDescription, setDocumentDescription] = useState('');

  // Fetch assigned clients
  const { data: assignedClients = [], isLoading } = useQuery<AssignedClient[]>({
    queryKey: [`/api/therapist/assigned-clients/${user.id}`],
    retry: false,
  });

  // Fetch client notes when a client is selected
  const { data: clientNotes = [] } = useQuery<ClientNote[]>({
    queryKey: ['/api/therapist/client-notes', selectedClient?.id],
    enabled: !!selectedClient,
    retry: false,
  });

  // Fetch client documents when a client is selected
  const { data: clientDocuments = [] } = useQuery<ClientDocument[]>({
    queryKey: ['/api/therapist/client-documents', selectedClient?.id],
    enabled: !!selectedClient,
    retry: false,
  });

  // Fetch client questionnaire when a client is selected
  const { data: clientQuestionnaire, isLoading: isQuestionnaireLoading } = useQuery<any>({
    queryKey: ['/api/therapist/client-questionnaire', selectedClient?.id],
    enabled: !!selectedClient,
    retry: false,
  });

  // Add client note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: { clientId: string; content: string; sessionType: string }) => {
      const response = await apiRequest('POST', '/api/therapist/client-notes', noteData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Client note has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/client-notes'] });
      setNewNote('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add client document mutation - SECURE VERSION using server-generated objectPath
  const addDocumentMutation = useMutation({
    mutationFn: async (documentData: {
      clientId: string;
      fileName: string;
      objectPath: string;
      fileSize: number;
      documentType: string;
      description: string;
    }) => {
      const response = await apiRequest('POST', '/api/therapist/client-documents', documentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Client document has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/client-documents'] });
      setDocumentDescription('');
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete client document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest('DELETE', `/api/therapist/client-documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "Document has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/client-documents'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'needs_attention':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddNote = () => {
    if (!selectedClient || !newNote.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter note content.",
        variant: "destructive",
      });
      return;
    }

    addNoteMutation.mutate({
      clientId: selectedClient.id,
      content: newNote,
      sessionType: noteType
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-hive-purple" />
          <h2 className="text-xl font-semibold text-hive-black">Client Management</h2>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-hive-purple" />
          <h2 className="text-xl font-semibold text-hive-black">Client Management</h2>
          <Badge className="bg-hive-purple/10 text-hive-purple">
            {assignedClients.length} clients
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No clients assigned yet</p>
                  <p className="text-sm">Contact admin for client assignments</p>
                </div>
              ) : (
                assignedClients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedClient?.id === client.id ? 'border-hive-purple bg-hive-purple/5' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{client.name}</h4>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{client.email}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{client.sessionCount} sessions</span>
                      <Badge className={getRiskColor(client.riskLevel)} variant="outline">
                        {client.riskLevel} risk
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedClient.name}</CardTitle>
                        <p className="text-gray-600">{selectedClient.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                        <Button size="sm" className="bg-hive-purple hover:bg-hive-purple/90">
                          <Calendar className="w-4 h-4 mr-1" />
                          Book Session
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-hive-purple">{selectedClient.totalSessions}</div>
                        <div className="text-sm text-gray-600">Total Sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{selectedClient.completedSessions}</div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                      <div className="text-center">
                        <Badge className={getRiskColor(selectedClient.riskLevel)}>
                          {selectedClient.riskLevel} risk
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">Risk Level</div>
                      </div>
                      <div className="text-center">
                        <Badge className={getProgressColor(selectedClient.progressStatus)}>
                          {selectedClient.progressStatus.replace('_', ' ')}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">Progress</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Current Goals</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedClient.currentGoals?.map((goal, index) => (
                            <Badge key={index} variant="outline" className="text-hive-purple">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {selectedClient.lastNotes && (
                        <div>
                          <h4 className="font-medium mb-2">Latest Notes</h4>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                            {selectedClient.lastNotes}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Assigned:</span>
                          <span className="ml-2 text-gray-600">
                            {new Date(selectedClient.assignedDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Last Session:</span>
                          <span className="ml-2 text-gray-600">
                            {selectedClient.lastSession 
                              ? new Date(selectedClient.lastSession).toLocaleDateString()
                              : 'No sessions yet'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="questionnaire" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Client Intake Questionnaire</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Export Feature",
                            description: "PDF export will be available soon!",
                          });
                        }}
                        data-testid="button-export-questionnaire"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isQuestionnaireLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-30 animate-spin" />
                        <p>Loading questionnaire...</p>
                      </div>
                    ) : !clientQuestionnaire ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No questionnaire available</p>
                        <p className="text-sm">This client hasn't completed the intake questionnaire yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Personal Information */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h3 className="font-semibold text-lg mb-4 text-hive-purple">Personal Information</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Name:</span>
                              <span className="ml-2 text-gray-700">
                                {clientQuestionnaire.step2FirstName} {clientQuestionnaire.step2LastName}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Email:</span>
                              <span className="ml-2 text-gray-700">{clientQuestionnaire.step2Email}</span>
                            </div>
                            {clientQuestionnaire.step3AgeRange && (
                              <div>
                                <span className="font-medium">Age Range:</span>
                                <span className="ml-2 text-gray-700">{clientQuestionnaire.step3AgeRange}</span>
                              </div>
                            )}
                            {clientQuestionnaire.step4Gender && (
                              <div>
                                <span className="font-medium">Gender:</span>
                                <span className="ml-2 text-gray-700">{clientQuestionnaire.step4Gender}</span>
                              </div>
                            )}
                            {clientQuestionnaire.step5Pronouns && (
                              <div>
                                <span className="font-medium">Pronouns:</span>
                                <span className="ml-2 text-gray-700">{clientQuestionnaire.step5Pronouns}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Wellbeing & Mental Health */}
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <h3 className="font-semibold text-lg mb-4 text-hive-purple">Wellbeing & Mental Health</h3>
                          
                          {clientQuestionnaire.step6WellbeingRating && (
                            <div className="mb-4">
                              <span className="font-medium">Current Wellbeing Rating:</span>
                              <div className="mt-2">
                                <Badge className="bg-hive-purple text-white text-lg px-4 py-2">
                                  {clientQuestionnaire.step6WellbeingRating} / 10
                                </Badge>
                              </div>
                            </div>
                          )}
                          
                          {clientQuestionnaire.step7MentalHealthSymptoms && 
                           Array.isArray(clientQuestionnaire.step7MentalHealthSymptoms) &&
                           clientQuestionnaire.step7MentalHealthSymptoms.length > 0 && (
                            <div className="mb-4">
                              <span className="font-medium">Mental Health Symptoms:</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {clientQuestionnaire.step7MentalHealthSymptoms.map((symptom: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-gray-700">
                                    {symptom}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {clientQuestionnaire.step8SupportAreas && 
                           Array.isArray(clientQuestionnaire.step8SupportAreas) &&
                           clientQuestionnaire.step8SupportAreas.length > 0 && (
                            <div>
                              <span className="font-medium">Areas Seeking Support:</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {clientQuestionnaire.step8SupportAreas.map((area: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-hive-purple border-hive-purple">
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Therapy Preferences */}
                        <div className="border rounded-lg p-4 bg-green-50">
                          <h3 className="font-semibold text-lg mb-4 text-hive-purple">Therapy Preferences</h3>
                          
                          {clientQuestionnaire.step9TherapyTypes && 
                           Array.isArray(clientQuestionnaire.step9TherapyTypes) &&
                           clientQuestionnaire.step9TherapyTypes.length > 0 && (
                            <div className="mb-4">
                              <span className="font-medium">Preferred Therapy Types:</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {clientQuestionnaire.step9TherapyTypes.map((type: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-green-700 border-green-700">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {clientQuestionnaire.step10PreviousTherapy && (
                            <div className="mb-4">
                              <span className="font-medium">Previous Therapy Experience:</span>
                              <span className="ml-2 text-gray-700">{clientQuestionnaire.step10PreviousTherapy}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {clientQuestionnaire.step12TherapistGenderPreference && (
                              <div>
                                <span className="font-medium">Therapist Gender Preference:</span>
                                <span className="ml-2 text-gray-700 capitalize">
                                  {clientQuestionnaire.step12TherapistGenderPreference.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                            {clientQuestionnaire.step11ReligionPreference && (
                              <div>
                                <span className="font-medium">Religion:</span>
                                <span className="ml-2 text-gray-700">{clientQuestionnaire.step11ReligionPreference}</span>
                              </div>
                            )}
                            {clientQuestionnaire.step13ReligionMatching && (
                              <div>
                                <span className="font-medium">Religion Matching Preference:</span>
                                <span className="ml-2 text-gray-700 capitalize">
                                  {clientQuestionnaire.step13ReligionMatching.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Admin Notes */}
                        {clientQuestionnaire.adminNotes && (
                          <div className="border rounded-lg p-4 bg-yellow-50">
                            <h3 className="font-semibold text-lg mb-2 text-hive-purple">Admin Notes</h3>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {clientQuestionnaire.adminNotes}
                            </p>
                          </div>
                        )}

                        {/* Questionnaire Metadata */}
                        <div className="text-xs text-gray-500 border-t pt-4">
                          <div className="flex justify-between">
                            <span>Questionnaire ID: {clientQuestionnaire.id}</span>
                            {clientQuestionnaire.completedAt && (
                              <span>Completed: {new Date(clientQuestionnaire.completedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Session Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add New Note */}
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-3">Add New Note</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="noteType">Session Type</Label>
                          <select
                            value={noteType}
                            onChange={(e) => setNoteType(e.target.value as any)}
                            className="w-full p-2 border rounded"
                          >
                            <option value="individual">Individual Session</option>
                            <option value="consultation">Consultation</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="noteContent">Note Content</Label>
                          <Textarea
                            id="noteContent"
                            placeholder="Enter session notes, observations, goals, etc..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <Button 
                          onClick={handleAddNote}
                          disabled={addNoteMutation.isPending || !newNote.trim()}
                          className="bg-hive-purple hover:bg-hive-purple/90"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </div>

                    {/* Existing Notes */}
                    <div className="space-y-3">
                      {clientNotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p>No notes yet</p>
                          <p className="text-sm">Add your first session note above</p>
                        </div>
                      ) : (
                        clientNotes.map((note) => (
                          <div key={note.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{note.sessionType.replace('_', ' ')}</Badge>
                                <span className="text-sm text-gray-600">
                                  {new Date(note.date).toLocaleDateString()}
                                </span>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {note.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Upload New Document */}
                    <div className="border rounded-lg p-4 bg-green-50">
                      <h4 className="font-medium mb-3">Upload New Document</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="documentType">Document Type</Label>
                          <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value as any)}
                            className="w-full p-2 border rounded"
                            data-testid="select-document-type"
                          >
                            <option value="note">Session Note</option>
                            <option value="assessment">Assessment</option>
                            <option value="treatment_plan">Treatment Plan</option>
                            <option value="report">Report</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="documentDescription">Description (Optional)</Label>
                          <Input
                            id="documentDescription"
                            placeholder="Brief description of the document..."
                            value={documentDescription}
                            onChange={(e) => setDocumentDescription(e.target.value)}
                            data-testid="input-document-description"
                          />
                        </div>
                        <div className="flex justify-center">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760} // 10MB
                            onGetUploadParameters={async () => {
                              if (!selectedClient) {
                                throw new Error('No client selected');
                              }
                              // Get a unique filename for the upload
                              const timestamp = Date.now();
                              const tempFileName = `document-${timestamp}`;
                              
                              const response = await apiRequest('GET', 
                                `/api/therapist/client-documents/upload-params?clientId=${selectedClient.id}&fileName=${encodeURIComponent(tempFileName)}`
                              );
                              const params = await response.json();
                              console.log('Upload params received:', params);
                              return {
                                method: params.method,
                                url: params.url,
                                fields: {
                                  objectPath: params.objectPath,
                                  fileName: params.fileName
                                }
                              };
                            }}
                            onComplete={(result) => {
                              console.log('Upload completed:', result);
                              const file = result.successful[0];
                              if (file && selectedClient) {
                                // Extract objectPath from upload result
                                const objectPath = file.meta?.objectPath || file.response?.body?.objectPath;
                                if (!objectPath) {
                                  toast({
                                    title: "Upload Error",
                                    description: "Unable to retrieve file path from upload result",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // Use secure backend endpoint with server-generated objectPath
                                addDocumentMutation.mutate({
                                  clientId: selectedClient.id,
                                  objectPath: objectPath,
                                  fileName: file.name,
                                  fileSize: file.size || 0,
                                  documentType: documentType,
                                  description: documentDescription
                                });
                              }
                            }}
                            buttonClassName="bg-hive-purple hover:bg-hive-purple/90 text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                          </ObjectUploader>
                        </div>
                      </div>
                    </div>

                    {/* Existing Documents */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Uploaded Documents</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedClient) {
                              queryClient.invalidateQueries({ 
                                queryKey: ['/api/therapist/client-documents', selectedClient.id] 
                              });
                              toast({
                                title: "Refreshed",
                                description: "Document list updated",
                              });
                            }
                          }}
                          className="text-xs"
                          data-testid="button-refresh-documents"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Refresh
                        </Button>
                      </div>
                      {clientDocuments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p>No documents uploaded yet</p>
                          <p className="text-sm">Upload your first document above</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {clientDocuments.map((document) => (
                            <div
                              key={document.id}
                              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                              data-testid={`document-card-${document.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-hive-purple" />
                                    <h5 className="font-medium text-gray-900">{document.fileName}</h5>
                                    <Badge variant="outline" className="text-xs">
                                      {document.documentType.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  {document.description && (
                                    <p className="text-sm text-gray-600 mb-2">{document.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>Uploaded: {new Date(document.uploadDate).toLocaleDateString()}</span>
                                    <span>Size: {(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(document.fileUrl, '_blank')}
                                    data-testid={`button-download-${document.id}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this document?')) {
                                        deleteDocumentMutation.mutate(document.id);
                                      }
                                    }}
                                    disabled={deleteDocumentMutation.isPending}
                                    data-testid={`button-delete-${document.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Session History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Session history integration</p>
                      <p className="text-sm">Connect with video sessions and scheduling</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Progress analytics</p>
                      <p className="text-sm">Goals tracking and outcome measurements</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
                <p className="text-gray-600">
                  Choose a client from the list to view their details and manage their therapy journey.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}