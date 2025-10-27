import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, UserIcon, MessageCircle, Users } from "lucide-react";

interface MessagingProps {
  user: any;
}

export default function MessagingService({ user }: MessagingProps) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const demoConversations = [
    {
      id: "1",
      name: "Dr. Sarah Johnson",
      role: "therapist",
      lastMessage: "How are you feeling about our last session?",
      timestamp: "2 hours ago",
      unread: 2,
    },
    {
      id: "2",
      name: "Wellness Team",
      role: "support",
      lastMessage: "Your appointment reminder for tomorrow",
      timestamp: "1 day ago",
      unread: 0,
    },
  ];

  const demoMessages = [
    {
      id: "1",
      sender: "Dr. Sarah Johnson",
      content:
        "Hi! How are you feeling about our last session? Any thoughts or reflections you'd like to share?",
      timestamp: "2:30 PM",
      isOwn: false,
    },
    {
      id: "2",
      sender: "You",
      content:
        "I've been thinking about what we discussed regarding mindfulness. I tried the breathing exercise you suggested.",
      timestamp: "2:45 PM",
      isOwn: true,
    },
    {
      id: "3",
      sender: "Dr. Sarah Johnson",
      content:
        "That's wonderful! How did it feel? Did you notice any difference in your stress levels?",
      timestamp: "3:00 PM",
      isOwn: false,
    },
  ];

  const sendMessage = () => {
    if (!messageText.trim()) return;

    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
    });
    setMessageText("");
  };

  const startNewConversation = () => {
    toast({
      title: "New Conversation",
      description: "This would open a dialog to start a new conversation with your therapist.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Messaging</h1>
          <p className="text-gray-600 font-body mt-2">
            Secure communication with your therapy team
          </p>
        </div>
        <Button className="button-primary" onClick={startNewConversation}>
          <MessageCircle className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Messaging Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Conversations List */}
        <Card className="card-modern lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedChat(conversation.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedChat === conversation.id
                    ? "bg-hive-purple/10 border border-hive-purple/30"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-hive-purple to-hive-light-purple rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {conversation.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 truncate">{conversation.name}</h4>
                      {conversation.unread > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{conversation.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <Card className="card-modern h-[600px] flex flex-col">
              {/* Chat Header */}
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-hive-purple to-hive-light-purple rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">D</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Dr. Sarah Johnson</h3>
                    <p className="text-sm text-gray-600">Licenced Therapist</p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {demoMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-sm ${message.isOwn ? "order-2" : "order-1"}`}>
                      <div className="text-xs text-gray-500 mb-1 px-1">
                        {message.sender} • {message.timestamp}
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.isOwn
                            ? "bg-hive-purple text-white rounded-br-md"
                            : "bg-gray-100 text-gray-900 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-100">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="input-modern resize-none min-h-[60px] max-h-32"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!messageText.trim()}
                    className="button-primary"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            /* No conversation selected - Enhanced empty state */
            <Card className="card-modern h-[600px] flex items-center justify-center">
              <div className="text-center max-w-md mx-auto px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-hive-purple to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-display font-semibold text-gray-900 mb-3">
                  Start a conversation
                </h3>
                <p className="text-gray-600 font-body mb-6 leading-relaxed">
                  Select a conversation from the left panel to view messages, or click "New Message"
                  to start communicating with your therapy team.
                </p>
                <div className="bg-hive-purple/5 border border-hive-purple/20 rounded-lg p-4">
                  <h4 className="font-medium text-hive-purple mb-2">Secure messaging features:</h4>
                  <ul className="text-sm text-hive-purple space-y-1 text-left">
                    <li>• End-to-end encrypted communications</li>
                    <li>• GDPR & UK Data Protection compliant</li>
                    <li>• Instant message delivery</li>
                    <li>• 24/7 support team availability</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-modern">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-hive-purple/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-hive-purple" />
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-2">Secure Messaging</h3>
            <p className="text-sm text-gray-600 mb-4">
              GDPR & UK Data Protection compliant messaging with your therapy team
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-2">24/7 Support</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get help when you need it from our wellness team
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-2">Instant Delivery</h3>
            <p className="text-sm text-gray-600 mb-4">
              Messages are delivered instantly and securely
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
