import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { User as UserType } from '@shared/schema';

interface SessionApprovalRequest {
  id: string;
  therapistId: string;
  therapistName: string;
  date: string;
  time: string;
  duration: number;
  sessionType: 'individual' | 'consultation';
  sessionRate: number;
  notes?: string;
  status: 'pending_payment_approval' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  requiresPaymentApproval: boolean;
}

interface ClientSessionApprovalsProps {
  user: UserType;
}

export default function ClientSessionApprovals({ user }: ClientSessionApprovalsProps) {
  const { toast } = useToast();
  const [selectedApproval, setSelectedApproval] = useState<SessionApprovalRequest | null>(null);

  // Fetch pending session approvals
  const { data: pendingApprovals = [], isLoading } = useQuery<SessionApprovalRequest[]>({
    queryKey: ['/api/client/session-approvals', user.id],
    retry: false,
  });

  // Approve session and proceed to payment
  const approveSessionMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const response = await apiRequest('POST', `/api/client/approve-session/${approvalId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Session Approved",
        description: "Redirecting to payment...",
      });
      // In a real app, would redirect to Stripe payment flow
      queryClient.invalidateQueries({ queryKey: ['/api/client/session-approvals'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reject session
  const rejectSessionMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const response = await apiRequest('POST', `/api/client/reject-session/${approvalId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Rejected",
        description: "The session request has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client/session-approvals'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment_approval':
        return 'bg-hive-light-blue text-hive-purple';
      case 'approved':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment_approval':
        return <AlertCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const hoursUntilExpiry = (expiryTime - currentTime) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt).getTime() < new Date().getTime();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-hive-purple" />
          <h2 className="text-xl font-semibold text-hive-black">Session Approvals</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-hive-purple" />
        <h2 className="text-xl font-semibold text-hive-black">Session Approvals</h2>
        {pendingApprovals.length > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800">
            {pendingApprovals.length} pending
          </Badge>
        )}
      </div>

      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
            <p className="text-gray-600">
              You don't have any session requests waiting for approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <Card key={approval.id} className="border-l-4 border-l-hive-purple">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-hive-purple" />
                    <div>
                      <CardTitle className="text-lg text-hive-black">
                        Session with {approval.therapistName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(approval.status)}>
                          {getStatusIcon(approval.status)}
                          <span className="ml-1 capitalize">
                            {approval.status.replace('_', ' ')}
                          </span>
                        </Badge>
                        <Badge variant="outline" className="text-hive-purple">
                          {approval.sessionType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-hive-purple">
                      £{approval.sessionRate}
                    </div>
                    <div className="text-sm text-gray-600">
                      {approval.duration} minutes
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Session Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {formatDate(approval.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {formatTime(approval.time)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {approval.notes && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Session Notes:</p>
                      <p className="text-sm text-gray-600">{approval.notes}</p>
                    </div>
                  </div>
                )}

                {/* Expiry Warning */}
                {isExpiringSoon(approval.expiresAt) && !isExpired(approval.expiresAt) && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      This session request expires in less than 24 hours. Please approve or decline soon.
                    </AlertDescription>
                  </Alert>
                )}

                {isExpired(approval.expiresAt) && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      This session request has expired. Please contact your therapist to reschedule.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Payment Information */}
                {approval.status === 'pending_payment_approval' && !isExpired(approval.expiresAt) && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Payment Required</h4>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">
                      Your therapist has requested to schedule this session. You will need to pay £{approval.sessionRate} to confirm your booking.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveSessionMutation.mutate(approval.id)}
                        disabled={approveSessionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve & Pay
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => rejectSessionMutation.mutate(approval.id)}
                        disabled={rejectSessionMutation.isPending}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}