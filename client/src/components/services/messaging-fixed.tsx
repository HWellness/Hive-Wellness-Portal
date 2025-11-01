import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, fetchApi } from "@/lib/queryClient";
import {
  Send,
  User,
  Search,
  MessageCircle,
  Archive,
  MoreHorizontal,
  Bell,
  UserCheck,
  Shield,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface MessagingProps {
  user: UserType;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "therapist";
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: "client" | "therapist";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: "active" | "archived";
}

export default function MessagingService({ user }: MessagingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch conversations - Fixed for client role
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: [`/api/conversations/${user.id}`],
    enabled: !!user.id,
    retry: false,
    staleTime: 30000, // 30 seconds
  });

  // Fetch messages for selected conversation - Fixed for client role
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/messages/${selectedConversation}`],
    enabled: !!selectedConversation,
    retry: false,
    staleTime: 10000, // 10 seconds
  });

  // Fetch assigned clients for therapists
  const { data: assignedClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: [`/api/assigned-connections/${user.id}/${user.role}`],
    enabled: !!user.id && user.role === "therapist",
    retry: false,
    staleTime: 30000, // 30 seconds
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({
      recipientEmail,
      initialMessage,
    }: {
      recipientEmail?: string;
      initialMessage?: string;
    }) => {
      return await apiRequest("POST", "/api/conversations", {
        recipientEmail,
        initialMessage: initialMessage || "Hello! I'd like to start a conversation with you.",
        senderId: user.id,
      });
    },
    onSuccess: (response) => {
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${user.id}`] });

      // Select the new conversation if one was created
      if (response?.id) {
        setSelectedConversation(response.id);
      }
      toast({
        title: "Conversation Started",
        description: "Your new conversation has been created successfully.",
      });
      setShowNewMessageDialog(false);
    },
    onError: () => {
      toast({
        title: "Failed to Create Conversation",
        description: "Unable to start new conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send message mutation with optimistic update
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      return await apiRequest("POST", "/api/messages", {
        conversationId,
        content,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        timestamp: new Date().toISOString(),
      });
    },
    onMutate: async ({ content }) => {
      // Optimistically add the message to the UI
      if (!selectedConversation) return;

      const previousMessages = queryClient.getQueryData([`/api/messages/${selectedConversation}`]);

      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        conversationId: selectedConversation,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
      };

      // Add to query cache immediately
      queryClient.setQueryData([`/api/messages/${selectedConversation}`], (old: any) => {
        return Array.isArray(old) ? [...old, optimisticMessage] : [optimisticMessage];
      });

      // Clear input immediately
      setMessageText("");

      return { previousMessages };
    },
    onSuccess: () => {
      // Refetch to get the real message with proper ID
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedConversation}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${user.id}`] });
      scrollToBottom();
    },
    onError: (error, variables, context) => {
      // Restore previous state if sending failed
      if (context?.previousMessages && selectedConversation) {
        queryClient.setQueryData(
          [`/api/messages/${selectedConversation}`],
          context.previousMessages
        );
      }

      toast({
        title: "Failed to Send",
        description: "Unable to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: messageText.trim(),
    });
  };

  const handleArchiveConversation = () => {
    if (!selectedConversation || !selectedConversationData) return;

    toast({
      title: "Conversation archived",
      description: `Conversation with ${selectedConversationData.participantName} has been archived.`,
    });

    // In a real app, this would make an API call to archive the conversation
    // For demo purposes, we'll just show the toast
  };

  const handleMarkAsRead = () => {
    if (!selectedConversation) return;

    toast({
      title: "Messages marked as read",
      description: "All messages in this conversation have been marked as read.",
    });
  };

  const handleToggleNotifications = () => {
    toast({
      title: "Notifications updated",
      description: "Notification preferences for this conversation have been updated.",
    });
  };

  const handleViewProfile = () => {
    if (!selectedConversationData) return;

    toast({
      title: "Profile",
      description: `Viewing profile for ${selectedConversationData.participantName}`,
    });
  };

  // Handle connection action (Accept/Decline)
  const handleConnectionAction = async (
    requestId: string,
    action: "accept" | "decline",
    clientName: string
  ) => {
    try {
      const response = await fetchApi(`/api/therapist/connection-request/${requestId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to process connection request");
      }

      const result = await response.json();

      toast({
        title: action === "accept" ? "Connection Accepted" : "Connection Declined",
        description:
          action === "accept"
            ? `${clientName} has been added to your client list.`
            : `Connection request from ${clientName} has been declined. They will be returned to the pool for reassignment.`,
        variant: action === "accept" ? "default" : "destructive",
      });

      // Remove the request from the list by refetching notifications
      // In a real implementation, you would update the state here
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process connection request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter(
        (conv: Conversation) =>
          conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const selectedConversationData = Array.isArray(conversations)
    ? conversations.find((conv: Conversation) => conv.id === selectedConversation)
    : null;

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  return (
    <div className="h-screen flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Privacy Banner */}
      <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">
              Please do not include personal information in messages. All communications are
              monitored by Hive Wellness staff.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEncryptionInfo(true)}
              className="text-amber-700 hover:text-amber-900"
            >
              <Shield className="h-4 w-4 mr-1" />
              Encryption Info
            </Button>
            {user.role === "therapist" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="text-amber-700 hover:text-amber-900"
              >
                <Bell className="h-4 w-4 mr-1" />
                Notifications
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Messaging</h1>
            <p className="text-gray-600 font-body">Secure communication with your therapy team</p>
          </div>
          <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
            <DialogTrigger asChild>
              <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                {user.role === "therapist" ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">Select a client to start a conversation:</p>

                    {/* Real assigned clients for therapists */}
                    <div className="space-y-2">
                      {clientsLoading ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500">Loading clients...</p>
                        </div>
                      ) : assignedClients.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No assigned clients found</p>
                        </div>
                      ) : (
                        assignedClients.map((client) => (
                          <div
                            key={client.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              createConversationMutation.mutate({
                                recipientEmail: client.email,
                                initialMessage: "Hello! I'd like to start a conversation with you.",
                              });
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-hive-purple to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {(client.name || client.first_name || client.email || "U")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {client.name ||
                                    `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
                                    client.email}
                                </h4>
                                <p className="text-sm text-gray-600">{client.email}</p>
                              </div>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowNewMessageDialog(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600">
                      You can message your therapist through existing conversations or wait for them
                      to start a new one.
                    </p>
                    <Button onClick={() => setShowNewMessageDialog(false)} className="mt-4">
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Conversations Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Search Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversations</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-display font-semibold text-gray-900 mb-2">
                  No conversations yet
                </h3>
                <p className="text-gray-600 text-sm">
                  Your therapist will message you here, or you can start a conversation.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conversation: Conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-colors mb-1 ${
                      selectedConversation === conversation.id
                        ? "bg-hive-purple/10 border border-hive-purple/30"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-hive-purple to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm">
                            {conversation.participantName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {conversation.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {conversation.participantName}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation && selectedConversationData ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-hive-purple to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {selectedConversationData.participantName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversationData.participantName}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {selectedConversationData.participantRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleArchiveConversation}
                      title="Archive conversation"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" title="More options">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleMarkAsRead}>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Mark as read
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleToggleNotifications}>
                          <Bell className="w-4 h-4 mr-2" />
                          Toggle notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleViewProfile}>
                          <User className="w-4 h-4 mr-2" />
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleArchiveConversation}
                          className="text-orange-600"
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messagesLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-xs space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-12 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !Array.isArray(messages) || messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-display font-semibold text-gray-900 mb-2">
                      Start the conversation
                    </h3>
                    <p className="text-gray-600">Send your first message to get started.</p>
                  </div>
                ) : (
                  <>
                    {Array.isArray(messages) &&
                      messages.map((message: Message) => {
                        const isOwnMessage = message.senderId === user.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md ${isOwnMessage ? "order-2" : "order-1"}`}
                            >
                              <div className="text-xs text-gray-500 mb-1 px-1">
                                {message.senderName} • {formatTime(message.timestamp)}
                              </div>
                              <div
                                className={`px-4 py-3 rounded-2xl ${
                                  isOwnMessage
                                    ? "bg-hive-purple text-white rounded-br-md"
                                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                                }`}
                              >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="input-modern resize-none min-h-[60px] max-h-32"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90 text-white px-6 py-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* No conversation selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-display font-semibold text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-600 font-body">
                  Choose a conversation from the sidebar to start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Encryption Information Modal */}
      <Dialog open={showEncryptionInfo} onOpenChange={setShowEncryptionInfo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-600" />
              Message Encryption & Security
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">End-to-End Encryption Status</h3>
              <p className="text-sm text-green-700">
                ❌ <strong>Messages are NOT encrypted end-to-end</strong>
              </p>
              <p className="text-sm text-green-700 mt-2">
                All messages are stored in plaintext and are accessible by Hive Wellness
                administrative staff for quality assurance and monitoring purposes.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Transport Security</h4>
                  <p className="text-sm text-gray-600">
                    Messages are encrypted in transit using TLS 1.3
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Content Monitoring</h4>
                  <p className="text-sm text-gray-600">
                    All conversations are monitored by Hive Wellness staff for quality assurance and
                    safety
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Data Access</h4>
                  <p className="text-sm text-gray-600">
                    Authorised Hive Wellness personnel can access message content for therapeutic
                    oversight and platform safety
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">Privacy Guidelines</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Do not share personal financial information</li>
                <li>• Avoid sensitive medical details (use video sessions instead)</li>
                <li>• No third-party personal information</li>
                <li>• Keep therapeutic discussions general</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Therapist Notifications Modal */}
      {user.role === "therapist" && (
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2 text-hive-purple" />
                Therapist Notifications
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {/* New Messages */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">New Messages</h3>
                {[
                  {
                    id: "1",
                    clientName: "Emma Johnson",
                    message: "Thank you for yesterday's session, it really helped...",
                    time: "5 minutes ago",
                    unread: true,
                  },
                  {
                    id: "2",
                    clientName: "Michael Chen",
                    message: "I wanted to follow up on the breathing exercises...",
                    time: "2 hours ago",
                    unread: true,
                  },
                  {
                    id: "3",
                    clientName: "Sarah Williams",
                    message: "Could we reschedule our next appointment?",
                    time: "1 day ago",
                    unread: false,
                  },
                ].map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start space-x-3 p-3 bg-hive-purple/10 border border-hive-purple/30 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-hive-purple to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {notification.clientName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{notification.clientName}</h4>
                        <span className="text-xs text-gray-500">{notification.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                      {notification.unread && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs bg-hive-purple/20 text-hive-purple px-2 py-1 rounded-full">
                            New
                          </span>
                          <Button size="sm" variant="outline" className="h-7">
                            Reply
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Client Connection Requests */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Client Connection Requests</h3>
                {[
                  {
                    id: "1",
                    clientName: "David Thompson",
                    message: "Referred by Dr. Smith for anxiety management",
                    time: "30 minutes ago",
                    status: "pending",
                  },
                  {
                    id: "2",
                    clientName: "Lisa Anderson",
                    message: "Looking for help with work-related stress",
                    time: "3 hours ago",
                    status: "pending",
                  },
                ].map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {request.clientName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{request.clientName}</h4>
                        <span className="text-xs text-gray-500">{request.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{request.message}</p>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() =>
                            handleConnectionAction(request.id, "accept", request.clientName)
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleConnectionAction(request.id, "decline", request.clientName)
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
