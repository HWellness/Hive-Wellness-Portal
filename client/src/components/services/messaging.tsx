import { useState, useEffect, useRef, MouseEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Send,
  User,
  Paperclip,
  Smile,
  MoreHorizontal,
  Search,
  Archive,
  MessageCircle,
} from "lucide-react";
import ServiceNavigation from "@/components/ui/service-navigation";
import type { User as UserType } from "@shared/schema";

interface MessagingProps {
  user: UserType;
  onBackToDashboard?: () => void;
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

export default function Messaging({ user, onBackToDashboard }: MessagingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [newConversationRecipient, setNewConversationRecipient] = useState("");
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: [`/api/conversations/${user.id}`],
    enabled: !!user.id,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/messages/${selectedConversation}`],
    enabled: !!selectedConversation,
  });

  // Send message mutation
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
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${selectedConversation}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${user.id}`] });
      scrollToBottom();
    },
    onError: () => {
      toast({
        title: "Failed to Send",
        description: "Unable to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("POST", `/api/conversations/${conversationId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${user.id}`] });
    },
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({
      recipientEmail,
      initialMessage,
    }: {
      recipientEmail?: string;
      initialMessage: string;
    }) => {
      // For clients, automatically start conversation with assigned therapist
      const payload =
        user.role === "client"
          ? { initialMessage, senderId: user.id }
          : { recipientEmail, initialMessage, senderId: user.id };

      const response = await apiRequest("POST", "/api/conversations", payload);
      return await response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${user.id}`] });
      setShowNewMessageDialog(false);
      setNewConversationRecipient("");
      setNewConversationMessage("");
      if (response.id) {
        setSelectedConversation(response.id);
      }
      toast({
        title: "Conversation Started",
        description: "Your new conversation has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Create Conversation",
        description: "Unable to start new conversation. Please try again.",
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

  useEffect(() => {
    if (selectedConversation) {
      markAsReadMutation.mutate(selectedConversation);
    }
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: messageText.trim(),
    });
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleAttachmentClick = () => {
    toast({
      title: "Attachments Coming Soon",
      description:
        "File attachment functionality will be available in a future update for secure document sharing.",
    });
  };

  const commonEmojis = ["😊", "👍", "❤️", "😂", "😔", "🤔", "👌", "🙏", "💪", "🌟", "✨", "💙"];

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as Element;
        if (!target.closest(".emoji-picker") && !target.closest(".emoji-button")) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

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
    console.log("Conversation clicked:", conversationId);
    setSelectedConversation(conversationId);
  };

  const handleStartNewConversation = () => {
    if (!newConversationMessage.trim()) {
      toast({
        title: "Missing Message",
        description: "Please enter a message to start the conversation.",
        variant: "destructive",
      });
      return;
    }

    // For clients, no recipient email needed (auto-assigned to therapist)
    if (user.role === "client") {
      createConversationMutation.mutate({
        initialMessage: newConversationMessage.trim(),
      });
    } else {
      // For admin/therapist, require recipient email
      if (!newConversationRecipient.trim()) {
        toast({
          title: "Missing Information",
          description: "Please enter recipient email and initial message.",
          variant: "destructive",
        });
        return;
      }

      createConversationMutation.mutate({
        recipientEmail: newConversationRecipient.trim(),
        initialMessage: newConversationMessage.trim(),
      });
    }
  };

  // Check if user can start new conversations (admin/therapist roles)
  const canStartConversations = user.role === "admin" || user.role === "therapist";

  return (
    <>
      {/* Navigation Bar */}
      {onBackToDashboard && (
        <ServiceNavigation
          serviceName="Messaging"
          onBackToDashboard={onBackToDashboard}
          user={user}
        />
      )}

      <div className="h-screen flex bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Main Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-primary font-bold text-gray-900">Messaging</h1>
              <p className="text-gray-600 font-secondary">
                Secure communication with your therapy team
              </p>
            </div>
            <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
              <DialogTrigger asChild>
                <Button className="bg-hive-purple hover:bg-purple-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>New Conversation</DialogTitle>
                </DialogHeader>
                {canStartConversations ? (
                  // Admin/Therapist: Actual new conversation form
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Email
                      </label>
                      <Input
                        type="email"
                        placeholder="Enter recipient email..."
                        value={newConversationRecipient}
                        onChange={(e) => setNewConversationRecipient(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Initial Message
                      </label>
                      <Textarea
                        placeholder="Start your conversation..."
                        value={newConversationMessage}
                        onChange={(e) => setNewConversationMessage(e.target.value)}
                        className="w-full"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setShowNewMessageDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleStartNewConversation}
                        disabled={createConversationMutation.isPending}
                        className="bg-hive-purple hover:bg-purple-700"
                      >
                        {createConversationMutation.isPending
                          ? "Starting..."
                          : "Start Conversation"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Client: Start conversation with assigned therapist
                  <div className="p-4 space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Start a conversation with your therapist
                      </h3>
                      <p className="text-sm text-gray-600">
                        Begin your secure messaging with your assigned therapy team.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Message
                      </label>
                      <Textarea
                        placeholder="How are you feeling today? Share any thoughts or concerns..."
                        value={newConversationMessage}
                        onChange={(e) => setNewConversationMessage(e.target.value)}
                        className="w-full"
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setShowNewMessageDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleStartNewConversation}
                        disabled={
                          createConversationMutation.isPending || !newConversationMessage.trim()
                        }
                        className="bg-hive-purple hover:bg-purple-700"
                      >
                        {createConversationMutation.isPending
                          ? "Starting..."
                          : "Start Conversation"}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content Area with top padding */}
        <div className="flex w-full mt-24">
          {/* Conversations Sidebar */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Search Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-primary font-semibold text-gray-900 mb-4">
                Conversations
              </h2>

              {/* Search */}
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
                  <h3 className="font-primary font-semibold text-gray-900 mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-gray-600 text-sm font-secondary">
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
                                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-primary font-semibold text-gray-900 truncate">
                              {conversation.participantName}
                            </h4>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(conversation.lastMessageTime)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm font-secondary text-gray-600 truncate">
                              {conversation.lastMessage}
                            </p>
                            <Badge variant="secondary" className="text-xs ml-2">
                              {conversation.participantRole}
                            </Badge>
                          </div>
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
                {/* Privacy Warning Banner */}
                <div className="bg-hive-background/30 border-b border-hive-blue/20 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-hive-purple"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-hive-black/70">
                        Privacy Notice: Please do not include personal information in messages. All
                        communications are monitored by Hive Wellness staff for quality assurance
                        and security purposes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-hive-purple to-hive-light-purple rounded-full flex items-center justify-center">
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
                      <Button variant="outline" size="sm">
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
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
                  <div className="mb-3 px-3 py-2 bg-hive-purple/10 border border-hive-purple/30 rounded-lg">
                    <p className="text-xs text-hive-purple">
                      <strong>Reminder:</strong> Please do not share personal information such as
                      full names, addresses, phone numbers, or identifying details in messages.
                    </p>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Textarea
                        placeholder="Type your message (no personal info)..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="input-modern resize-none min-h-[60px] max-h-32"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAttachmentClick}
                        title="Attach files (coming soon)"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          title="Add emoji"
                          className="emoji-button"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                        {showEmojiPicker && (
                          <div className="emoji-picker absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-[200px]">
                            <div className="grid grid-cols-6 gap-1">
                              {commonEmojis.map((emoji, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg transition-colors"
                                  title={`Add ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <button
                                onClick={() => setShowEmojiPicker(false)}
                                className="text-xs text-gray-500 hover:text-gray-700 w-full text-center py-1"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        className="button-primary"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No conversation selected - Show helpful examples for therapists */
              <div className="flex-1 flex items-center justify-center overflow-y-auto p-8">
                <div className="max-w-2xl w-full">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-hive-purple/20 to-hive-light-purple/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-10 h-10 text-hive-purple" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-gray-900 mb-2">
                      {user.role === "therapist" || user.role === "admin"
                        ? "Secure Messaging for Your Practice"
                        : "Select a conversation"}
                    </h3>
                    <p className="text-gray-600 font-body">
                      {user.role === "therapist" || user.role === "admin"
                        ? "Use messaging to communicate with clients between sessions"
                        : "Choose a conversation from the sidebar to start messaging"}
                    </p>
                  </div>

                  {(user.role === "therapist" || user.role === "admin") && (
                    <Card className="card-modern">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-hive-purple">💡</span> Example Messages You Can Send
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                            📅 Session Rescheduling
                          </h4>
                          <p className="text-sm text-gray-700 italic leading-relaxed">
                            "Hi John, I am sorry but I need to rearrange our session. Can you do 5pm
                            tomorrow instead? If so, please just book in for the new time through
                            the portal."
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                            ✨ Session Follow-up
                          </h4>
                          <p className="text-sm text-gray-700 italic leading-relaxed">
                            "Hi Sarah, thank you for our session today. Remember to practice the
                            breathing techniques we discussed. How are you feeling about
                            implementing them?"
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                            🔔 Appointment Reminder
                          </h4>
                          <p className="text-sm text-gray-700 italic leading-relaxed">
                            "Hi Emma, looking forward to seeing you tomorrow at 3pm. Please let me
                            know if you need to reschedule or have any questions before we meet."
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                            📝 Resource Sharing
                          </h4>
                          <p className="text-sm text-gray-700 italic leading-relaxed">
                            "Hi Michael, I wanted to share some resources about cognitive
                            behavioural techniques. I'll upload the materials to your portal - they
                            might be helpful before our next session."
                          </p>
                        </div>

                        <div className="mt-6 p-4 bg-hive-purple/5 border border-hive-purple/20 rounded-lg">
                          <p className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-hive-purple mt-0.5">ℹ️</span>
                            <span>
                              <strong>Privacy Note:</strong> Remember not to include sensitive
                              clinical details or personal information in messages. All
                              conversations are monitored for quality assurance and security.
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
