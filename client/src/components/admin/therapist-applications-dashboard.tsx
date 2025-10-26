import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { Eye, Search, Download, Filter, Calendar, Mail, User, FileText, CheckCircle, XCircle, UserPlus, Users } from 'lucide-react';
import AdminAccountCreation from '@/components/services/admin-account-creation';

interface TherapistApplication {
  id: string;
  therapistId: string;
  applicationData: any;
  accountStatus: string;
  stripeAccountId?: string;
  created_at: string;
  updated_at: string;
}

export default function TherapistApplicationsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<TherapistApplication | null>(null);
  const [activeTab, setActiveTab] = useState('applications');

  const { data: applications = [], isLoading, refetch } = useQuery<TherapistApplication[]>({
    queryKey: ['/api/admin/therapist-applications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/therapist-applications');
      return response.json();
    }
  });

  const filteredApplications = applications.filter(application => {
    const matchesSearch = searchTerm === '' || 
      application.applicationData?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.applicationData?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.applicationData?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (application.id && application.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || application.accountStatus === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusTypes = Array.from(new Set(applications.map(a => a.accountStatus)));

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'under_review': 'bg-blue-100 text-blue-800',
      'completed': 'bg-purple-100 text-purple-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatApplicationData = (data: any): string => {
    if (!data) return 'No data';
    if (typeof data === 'string') return data;
    
    const formatValue = (key: string, value: any): string => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      if (Array.isArray(value)) {
        return `${formattedKey}: ${value.join(', ')}`;
      } else if (typeof value === 'object' && value !== null) {
        return `${formattedKey}: ${JSON.stringify(value, null, 2)}`;
      } else {
        return `${formattedKey}: ${value}`;
      }
    };

    return Object.entries(data)
      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => formatValue(key, value))
      .join('\n');
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.accountStatus === 'pending').length,
    approved: applications.filter(a => a.accountStatus === 'approved').length,
    rejected: applications.filter(a => a.accountStatus === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading therapist applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Therapist Management</h1>
          <p className="text-gray-600 mt-1">
            Manage therapist applications and create accounts
          </p>
        </div>
        <Button 
          onClick={() => refetch()}
          className="bg-hive-purple hover:bg-hive-purple/90"
        >
          <Download className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="account-creation" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Account Creation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-hive-purple" />
              <span className="text-sm text-gray-600">Total Applications</span>
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
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Approved</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
          </CardContent>
        </Card>
        
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-600">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
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

      {/* Applications Table */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Applications ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No applications match your current filters.' 
                  : 'No therapist applications have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Applicant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Submitted</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {application.applicationData?.first_name && application.applicationData?.last_name
                              ? `${application.applicationData.first_name} ${application.applicationData.last_name}`
                              : 'Name not provided'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {application.applicationData?.email || 'Email not provided'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(application.accountStatus)}>
                          {application.accountStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Therapist Application Review</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-2">Application ID</h3>
                                  <p className="text-sm text-gray-600">{application.id}</p>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                                  <Badge className={getStatusColor(application.accountStatus)}>
                                    {application.accountStatus.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Application Data</h3>
                                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                                  {formatApplicationData(application.applicationData)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="account-creation">
          <AdminAccountCreation user={{ role: 'admin' } as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}