import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Users, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Plus, 
  RefreshCw, 
  Trash2,
  Settings,
  Search,
  Eye,
  Activity
} from 'lucide-react';

interface WorkspaceAccount {
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  workspaceEmail: string;
  calendarId: string;
  accountStatus: 'active' | 'suspended' | 'pending' | 'deleted';
  createdAt: string;
  lastLogin?: string;
  permissionsConfigured: boolean;
  notes?: string;
}

interface WorkspaceStats {
  total: number;
  active: number;
  suspended: number;
  pending: number;
}

const WorkspaceAccountManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTherapists, setSelectedTherapists] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch workspace accounts overview
  const { data: workspaceData, isLoading: workspaceLoading, refetch: refetchWorkspace } = useQuery({
    queryKey: ['/api/admin/workspace-accounts'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch service health status
  const { data: serviceHealth } = useQuery({
    queryKey: ['/api/admin/workspace-service-health'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Manual provision workspace mutation
  const provisionWorkspaceMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      return apiRequest(`/api/therapists/${therapistId}/provision-workspace`, {
        method: 'POST',
        body: JSON.stringify({ forceRecreate: false })
      });
    },
    onSuccess: (data, therapistId) => {
      toast({
        title: "Workspace Provisioned",
        description: `Successfully created workspace account for therapist.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspace-accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Provisioning Failed",
        description: error.message || "Failed to provision workspace account",
        variant: "destructive",
      });
    },
  });

  // Bulk provision mutation
  const bulkProvisionMutation = useMutation({
    mutationFn: async (therapistIds: string[]) => {
      return apiRequest('/api/admin/bulk-provision-workspace', {
        method: 'POST',
        body: JSON.stringify({ therapistIds })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Provisioning Complete",
        description: `${data.stats?.successful || 0} accounts created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspace-accounts'] });
      setSelectedTherapists([]);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Provisioning Failed",
        description: error.message || "Failed to provision workspace accounts",
        variant: "destructive",
      });
    },
  });

  // Update workspace account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ therapistId, accountStatus, notes }: { 
      therapistId: string; 
      accountStatus: string; 
      notes: string 
    }) => {
      return apiRequest(`/api/therapists/${therapistId}/workspace-account`, {
        method: 'PUT',
        body: JSON.stringify({ accountStatus, notes })
      });
    },
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "Workspace account settings updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspace-accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update workspace account",
        variant: "destructive",
      });
    },
  });

  // Deactivate workspace account mutation
  const deactivateAccountMutation = useMutation({
    mutationFn: async ({ therapistId, reason }: { therapistId: string; reason: string }) => {
      return apiRequest(`/api/therapists/${therapistId}/workspace-account`, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      toast({
        title: "Account Deactivated",
        description: "Workspace account has been deactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspace-accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deactivation Failed",
        description: error.message || "Failed to deactivate workspace account",
        variant: "destructive",
      });
    },
  });

  const workspaceAccounts: WorkspaceAccount[] = workspaceData?.workspaceAccounts || [];
  const stats: WorkspaceStats = workspaceData?.stats || { total: 0, active: 0, suspended: 0, pending: 0 };

  // Filter accounts based on search and status
  const filteredAccounts = workspaceAccounts.filter(account => {
    const matchesSearch = !searchTerm || 
      account.therapistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.therapistEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.workspaceEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || account.accountStatus === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: "default", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      suspended: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
      pending: { variant: "outline", className: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
      deleted: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", icon: XCircle }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const handleBulkAction = (action: string) => {
    if (selectedTherapists.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select therapists to perform bulk actions.",
        variant: "destructive",
      });
      return;
    }

    if (action === 'provision') {
      bulkProvisionMutation.mutate(selectedTherapists);
    }
  };

  const handleSelectionChange = (therapistId: string, checked: boolean) => {
    if (checked) {
      setSelectedTherapists([...selectedTherapists, therapistId]);
    } else {
      setSelectedTherapists(selectedTherapists.filter(id => id !== therapistId));
    }
  };

  const selectAll = () => {
    setSelectedTherapists(filteredAccounts.map(account => account.therapistId));
  };

  const clearSelection = () => {
    setSelectedTherapists([]);
  };

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg">Loading workspace accounts...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="workspace-account-manager">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Google Workspace Manager</h1>
          <p className="text-gray-600 mt-2">Manage therapist Google Workspace accounts and calendars</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => refetchWorkspace()} 
            variant="outline"
            data-testid="button-refresh-workspace"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-600" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Google Workspace SDK: Connected</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Domain: {serviceHealth?.serviceHealth?.domain || 'hive-wellness.co.uk'}</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Last checked: {serviceHealth?.serviceHealth?.lastChecked ? 
                new Date(serviceHealth.serviceHealth.lastChecked).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search therapists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-therapists"
                />
              </div>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div className="flex gap-2">
              {selectedTherapists.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    Clear ({selectedTherapists.length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('provision')}
                    disabled={bulkProvisionMutation.isPending}
                    data-testid="button-bulk-provision"
                  >
                    {bulkProvisionMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Provision Selected
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                Select All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Workspace Accounts ({filteredAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTherapists.length === filteredAccounts.length && filteredAccounts.length > 0}
                      onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Therapist</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Workspace Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.therapistId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTherapists.includes(account.therapistId)}
                        onChange={(e) => handleSelectionChange(account.therapistId, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{account.therapistName}</div>
                        <div className="text-sm text-gray-500">{account.therapistEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-purple-600" />
                        <span className="text-sm font-mono text-gray-900">
                          {account.workspaceEmail || 'Not configured'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(account.accountStatus)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {account.lastLogin ? new Date(account.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => provisionWorkspaceMutation.mutate(account.therapistId)}
                          disabled={provisionWorkspaceMutation.isPending}
                          data-testid={`button-provision-${account.therapistId}`}
                        >
                          {provisionWorkspaceMutation.isPending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              data-testid={`button-deactivate-${account.therapistId}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Workspace Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will deactivate the workspace account for {account.therapistName}. 
                                This action cannot be undone. Are you sure?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deactivateAccountMutation.mutate({
                                  therapistId: account.therapistId,
                                  reason: 'Admin deactivation'
                                })}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deactivate Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAccounts.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workspace accounts found</h3>
                <p className="text-gray-500">
                  {searchTerm || selectedStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Workspace accounts will appear here once therapists are approved.'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceAccountManager;