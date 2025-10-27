import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  Shield,
  Lock,
  File,
  Image,
  FileArchive,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DocumentUploadGuidance from "./document-upload-guidance";

interface Document {
  id: string;
  userId: string;
  appointmentId?: string;
  type: string;
  title: string;
  content?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  version: number;
  isActive: boolean;
  confidentialityLevel: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TherapistNotesUploadProps {
  appointmentId?: string;
}

export function TherapistNotesUpload({ appointmentId }: TherapistNotesUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState("session_notes");
  const [documentContent, setDocumentContent] = useState("");
  const [confidentialityLevel, setConfidentialityLevel] = useState("high");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  if (user?.role !== "therapist" && user?.role !== "admin") {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This feature is only available to therapists. Please contact your administrator.
        </AlertDescription>
      </Alert>
    );
  }

  const documentTypes = [
    { value: "session_notes", label: "Session Notes", icon: FileText },
    { value: "therapy_plan", label: "Therapy Plan", icon: File },
    { value: "assessment", label: "Assessment", icon: FileText },
    { value: "homework", label: "Homework Assignment", icon: File },
    { value: "progress_report", label: "Progress Report", icon: FileText },
  ];

  const confidentialityLevels = [
    { value: "high", label: "High", description: "Restricted access - therapist and client only" },
    { value: "medium", label: "Medium", description: "Limited access - authorised staff" },
    {
      value: "restricted",
      label: "Restricted",
      description: "Highly confidential - encrypted storage",
    },
  ];

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents/user", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/user/${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: any }) => {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadResponse = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await uploadResponse.json();

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 90;
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status === 200) {
            try {
              setUploadProgress(95);
              const documentResponse = await apiRequest("POST", "/api/documents", {
                ...metadata,
                fileUrl: uploadURL.split("?")[0],
                mimeType: file.type,
                fileSize: file.size,
                userId: user?.id,
                appointmentId: appointmentId || null,
              });

              const result = await documentResponse.json();
              setUploadProgress(100);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));

        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been securely uploaded and encrypted.",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/user", user?.id] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "Document has been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/user", user?.id] });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 50MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      if (!documentTitle) {
        setDocumentTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentTitle) {
      toast({
        title: "Missing Information",
        description: "Please select a file and enter a title.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      file: selectedFile,
      metadata: {
        type: documentType,
        title: documentTitle,
        content: documentContent,
        confidentialityLevel,
        tags: [documentType, "therapist_notes"],
        isActive: true,
        version: 1,
      },
    });
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentTitle("");
    setDocumentType("session_notes");
    setDocumentContent("");
    setConfidentialityLevel("high");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return File;
    if (mimeType.includes("image")) return Image;
    if (mimeType.includes("pdf")) return FileText;
    if (mimeType.includes("zip") || mimeType.includes("compressed")) return FileArchive;
    return File;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = appointmentId
    ? documents?.filter((doc) => doc.appointmentId === appointmentId)
    : documents;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-hive-purple" />
                Secure Document Upload
              </CardTitle>
              <CardDescription>
                Upload confidential session notes and therapy documents
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Encrypted
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All documents are encrypted and stored securely. Only authorised therapists can access
              these files.
            </AlertDescription>
          </Alert>

          <DocumentUploadGuidance />

          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File *</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  disabled={isUploading}
                  className="flex-1"
                  data-testid="input-file-upload"
                />
                {selectedFile && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {formatFileSize(selectedFile.size)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-hive-black/60 mt-1">
                Supported: PDF, DOC, DOCX, TXT, JPG, PNG (max 50MB)
              </p>
            </div>

            <div>
              <Label htmlFor="document-title">Document Title *</Label>
              <Input
                id="document-title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Enter document title"
                disabled={isUploading}
                className="mt-2"
                data-testid="input-document-title"
              />
            </div>

            <div>
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={isUploading}>
                <SelectTrigger className="mt-2" data-testid="select-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="document-content">Notes (Optional)</Label>
              <Textarea
                id="document-content"
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                placeholder="Add any additional notes or context"
                disabled={isUploading}
                className="mt-2 min-h-[100px]"
                data-testid="textarea-document-content"
              />
            </div>

            <div>
              <Label htmlFor="confidentiality">Confidentiality Level *</Label>
              <Select
                value={confidentialityLevel}
                onValueChange={setConfidentialityLevel}
                disabled={isUploading}
              >
                <SelectTrigger className="mt-2" data-testid="select-confidentiality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {confidentialityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-hive-black/60">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-hive-light-purple rounded-full h-2">
                  <div
                    className="bg-hive-purple h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !documentTitle || isUploading}
                className="flex-1"
                data-testid="button-upload-document"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload Document"}
              </Button>
              {selectedFile && (
                <Button
                  onClick={resetForm}
                  variant="outline"
                  disabled={isUploading}
                  data-testid="button-reset-form"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>{filteredDocuments?.length || 0} documents uploaded</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-hive-black/60">Loading documents...</div>
          ) : filteredDocuments && filteredDocuments.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.mimeType);
                  return (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-hive-light-purple rounded-lg">
                            <FileIcon className="h-5 w-5 text-hive-purple" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-hive-black truncate">{doc.title}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {doc.type.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {doc.confidentialityLevel}
                              </Badge>
                              <span className="text-xs text-hive-black/60">
                                {formatFileSize(doc.fileSize)}
                              </span>
                            </div>
                            {doc.content && (
                              <p className="text-sm text-hive-black/70 mt-2 line-clamp-2">
                                {doc.content}
                              </p>
                            )}
                            <p className="text-xs text-hive-black/50 mt-1">
                              Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {doc.fileUrl && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  window.open(`/api/documents/${doc.id}/view`, "_blank")
                                }
                                data-testid={`button-view-${doc.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = `/api/documents/${doc.id}/view`;
                                  link.download = doc.title;
                                  link.click();
                                }}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this document? This action cannot be undone."
                                )
                              ) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-hive-black/30 mx-auto mb-3" />
              <p className="text-hive-black/60">No documents uploaded yet</p>
              <p className="text-sm text-hive-black/50 mt-1">
                Upload your first document using the form above
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
