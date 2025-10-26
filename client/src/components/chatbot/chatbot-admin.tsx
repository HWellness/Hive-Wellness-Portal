import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, MessageCircle, Settings, BarChart3, Plus, Edit } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  priority: number;
}

interface ChatbotAdminProps {
  userRole: string;
}

export function ChatbotAdmin({ userRole }: ChatbotAdminProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState<FAQEntry | null>(null);
  const [newFAQ, setNewFAQ] = useState<Partial<FAQEntry>>({
    question: '',
    answer: '',
    keywords: [],
    category: 'general',
    priority: 1
  });

  // Only allow admin access
  if (userRole !== 'admin') {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertDescription>
          Chatbot administration is restricted to admin users only. This ensures proper oversight of AI responses and FAQ management for therapy platform compliance.
        </AlertDescription>
      </Alert>
    );
  }

  const { data: faqData, isLoading } = useQuery({
    queryKey: ['/api/chatbot/faq'],
    retry: 1,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['/api/chatbot/faq/search', searchQuery],
    enabled: !!searchQuery,
    retry: 1,
  });

  const saveFAQMutation = useMutation({
    mutationFn: async (faqEntry: FAQEntry) => {
      // This would typically save to database
      return await apiRequest('POST', '/api/chatbot/faq', faqEntry);
    },
    onSuccess: () => {
      toast({
        title: "FAQ Updated",
        description: "FAQ entry has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/faq'] });
      setEditingFAQ(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save FAQ entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const categories = faqData ? [...new Set(faqData.map((faq: FAQEntry) => faq.category))] : [];

  const handleSaveFAQ = (faqEntry: FAQEntry) => {
    saveFAQMutation.mutate(faqEntry);
  };

  const handleExportLogs = () => {
    // This would typically export chat logs
    toast({
      title: "Export Started",
      description: "Chat logs are being prepared for download.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chatbot Administration</h1>
          <p className="text-gray-600 mt-1">Manage FAQ entries, monitor chat performance, and configure settings</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="chatbot-enabled">Chatbot Enabled</Label>
            <Switch
              id="chatbot-enabled"
              checked={chatbotEnabled}
              onCheckedChange={setChatbotEnabled}
            />
          </div>
          <Button onClick={handleExportLogs} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">FAQ Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                FAQ Database
              </CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search FAQ entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Button onClick={() => setEditingFAQ({
                  id: '',
                  question: '',
                  answer: '',
                  keywords: [],
                  category: 'general',
                  priority: 1
                })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map(category => (
                  <div key={category} className="space-y-2">
                    <Badge variant="outline" className="mb-2">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Badge>
                    <div className="space-y-2">
                      {(searchResults || faqData || [])
                        .filter((faq: FAQEntry) => faq.category === category)
                        .map((faq: FAQEntry) => (
                          <Card key={faq.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{faq.question}</h4>
                                <p className="text-gray-600 text-sm mt-1">{faq.answer}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {faq.keywords.map(keyword => (
                                    <Badge key={keyword} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingFAQ(faq)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {editingFAQ && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {editingFAQ.id ? 'Edit FAQ Entry' : 'Add New FAQ Entry'}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingFAQ(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={editingFAQ.question}
                    onChange={(e) => setEditingFAQ({...editingFAQ, question: e.target.value})}
                    placeholder="Enter the FAQ question..."
                  />
                </div>
                <div>
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea
                    id="answer"
                    value={editingFAQ.answer}
                    onChange={(e) => setEditingFAQ({...editingFAQ, answer: e.target.value})}
                    placeholder="Enter the FAQ answer..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={editingFAQ.keywords.join(', ')}
                    onChange={(e) => setEditingFAQ({
                      ...editingFAQ, 
                      keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={editingFAQ.category}
                      onChange={(e) => setEditingFAQ({...editingFAQ, category: e.target.value})}
                      placeholder="Category"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={editingFAQ.priority}
                      onChange={(e) => setEditingFAQ({...editingFAQ, priority: parseInt(e.target.value)})}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingFAQ(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveFAQ(editingFAQ)}>
                    <Save className="w-4 h-4 mr-2" />
                    Save FAQ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#9306B1]">1,247</div>
                <p className="text-sm text-gray-600 mt-1">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">FAQ Match Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">74%</div>
                <p className="text-sm text-gray-600 mt-1">Questions answered by FAQ</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Positive Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">89%</div>
                <p className="text-sm text-gray-600 mt-1">Thumbs up rating</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Common Query Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { category: 'Booking & Scheduling', count: 312, percentage: 28 },
                  { category: 'Therapy Information', count: 289, percentage: 25 },
                  { category: 'Payment & Pricing', count: 234, percentage: 21 },
                  { category: 'Technical Support', count: 156, percentage: 14 },
                  { category: 'Privacy & Security', count: 123, percentage: 12 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-32 text-sm">{item.category}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#9306B1] h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600">{item.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Chatbot Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Chatbot</Label>
                    <p className="text-sm text-gray-600">Turn the chatbot on or off globally</p>
                  </div>
                  <Switch checked={chatbotEnabled} onCheckedChange={setChatbotEnabled} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Fallback</Label>
                    <p className="text-sm text-gray-600">Use AI when no FAQ matches are found</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Privacy Filtering</Label>
                    <p className="text-sm text-gray-600">Automatically filter personal information</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Conversation Logging</Label>
                    <p className="text-sm text-gray-600">Log sanitized conversations for improvement</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}