import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  AlertCircle,
  Shield,
  Users,
  User,
} from "lucide-react";

interface PDFDocumentManagerProps {
  userRole: "admin" | "therapist" | "client";
}

export function PDFDocumentManager({ userRole }: PDFDocumentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Document type configurations
  const documentTypes = {
    therapist_info_pack: {
      label: "Therapist Information Pack",
      description: "Comprehensive guide for therapists joining Hive Wellness",
      accessLevel: "therapist_only",
      icon: User,
      allowedRoles: ["admin"],
    },
    therapist_safeguarding_pack: {
      label: "Therapist Safeguarding Pack",
      description: "Essential safeguarding policies and procedures",
      accessLevel: "therapist_only",
      icon: Shield,
      allowedRoles: ["admin"],
    },
    client_info_pack: {
      label: "Client Information Pack",
      description: "Information pack for new Hive Wellness clients",
      accessLevel: "client_only",
      icon: Users,
      allowedRoles: ["admin"],
    },
  };

  // Get available documents based on user role
  const getAvailableDocumentTypes = () => {
    if (userRole === "admin") {
      return Object.entries(documentTypes);
    } else if (userRole === "therapist") {
      return Object.entries(documentTypes).filter(
        ([key]) => key === "therapist_info_pack" || key === "therapist_safeguarding_pack"
      );
    } else if (userRole === "client") {
      return Object.entries(documentTypes).filter(([key]) => key === "client_info_pack");
    }
    return [];
  };

  // Fetch existing documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/documents/pdf", userRole],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/pdf?role=${userRole}`);
      return response.json();
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      setIsUploading(true);
      setUploadProgress(0);

      // Get upload URL
      const uploadResponse = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await uploadResponse.json();

      // Upload file to object storage
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status === 200) {
            try {
              // Register document metadata
              const metadataResponse = await apiRequest("POST", "/api/documents/pdf/register", {
                documentType: type,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                uploadUrl: uploadURL,
              });

              const result = await metadataResponse.json();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", uploadURL);
        xhr.send(file);
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded Successfully! 🎉",
        description: "The PDF document has been uploaded and is now available for download.",
      });
      setSelectedFile(null);
      setDocumentType("");
      setUploadProgress(0);
      setIsUploading(false);

      // Invalidate and refetch documents
      queryClient.invalidateQueries({ queryKey: ["/api/documents/pdf"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/pdf/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "The document has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/pdf"] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete document.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file only.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing Information",
        description: "Please select a file and document type.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ file: selectedFile, type: documentType });
  };

  const downloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await apiRequest("GET", `/api/documents/pdf/${documentId}/download`);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const previewDocument = (documentId: string) => {
    const previewUrl = `/api/documents/pdf/${documentId}/view`;
    window.open(previewUrl, "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            PDF Document Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Launch Requirement:</strong> This system manages the three essential
              PDF documents required for the Hive Wellness platform: Therapist Information Pack,
              Therapist Safeguarding Pack, and Client Information Pack.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Upload Section (Admin Only) */}
      {userRole === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              Upload New Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDocumentTypes().map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fileInput">Select PDF File</Label>
                <Input
                  id="fileInput"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
              </div>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>Selected:</strong> {selectedFile.name} (
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                {documentType && (
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Type:</strong>{" "}
                    {documentTypes[documentType as keyof typeof documentTypes]?.label}
                  </p>
                )}
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !documentType || isUploading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Available Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc: any) => {
                const config = documentTypes[doc.documentType as keyof typeof documentTypes];
                const IconComponent = config?.icon || FileText;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-8 h-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">{config?.label}</h3>
                        <p className="text-sm text-gray-600">{config?.description}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded: {new Date(doc.createdAt).toLocaleDateString()} | Size:{" "}
                          {(doc.fileSize / 1024 / 1024).toFixed(2)} MB | Downloads:{" "}
                          {doc.downloadCount}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => previewDocument(doc.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc.id, doc.fileName)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {userRole === "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Documents Available</h3>
              <p className="text-gray-500">
                {userRole === "admin"
                  ? "Upload your first document using the form above."
                  : "Documents will appear here when they're uploaded by the admin team."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Document Access Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getAvailableDocumentTypes().map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <div key={key} className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <IconComponent className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">{config.label}</h4>
                  </div>
                  <p className="text-sm text-purple-800 mb-2">{config.description}</p>
                  <div className="text-xs text-purple-700">
                    <strong>Access Level:</strong> {config.accessLevel.replace("_", " ")}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PDFDocumentManager;
