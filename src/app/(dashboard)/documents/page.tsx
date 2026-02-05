"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Upload,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  Search,
  Filter,
  FolderPlus,
  Grid,
  List,
  Clock,
  FileSpreadsheet,
  Presentation,
  X,
  History,
  Edit2,
  ExternalLink,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { EmptyState, LoadingState } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  mimeType: string;
  size: number;
  fileType: string;
  storageKey: string;
  url: string | null;
  entityType: string;
  entityId: string;
  status: string;
  tags: string[];
  currentVersion: number;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  versions?: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

interface DocumentVersion {
  id: string;
  version: number;
  filename: string;
  size: number;
  changeNote: string | null;
  uploadedById: string;
  createdAt: string;
}

const fileTypeIcons: Record<string, React.ReactNode> = {
  PDF: <FileText className="h-8 w-8 text-red-500" />,
  IMAGE: <ImageIcon className="h-8 w-8 text-blue-500" />,
  DOCUMENT: <FileText className="h-8 w-8 text-blue-600" />,
  SPREADSHEET: <FileSpreadsheet className="h-8 w-8 text-green-500" />,
  PRESENTATION: <Presentation className="h-8 w-8 text-orange-500" />,
  VIDEO: <Video className="h-8 w-8 text-purple-500" />,
  AUDIO: <Music className="h-8 w-8 text-pink-500" />,
  OTHER: <File className="h-8 w-8 text-gray-500" />,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("__all__");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadEntityType, setUploadEntityType] = useState("general");
  const [uploadEntityId, setUploadEntityId] = useState("general");

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.data?.user?.id) {
          setCurrentUserId(data.data.user.id);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (fileTypeFilter && fileTypeFilter !== "__all__") params.set("fileType", fileTypeFilter);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, [search, fileTypeFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName);
      formData.append("description", uploadDescription);
      formData.append("entityType", uploadEntityType);
      formData.append("entityId", uploadEntityId);
      if (currentUserId) {
        formData.append("userId", currentUserId);
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDocuments([data.data, ...documents]);
        setUploadDialogOpen(false);
        resetUploadForm();
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadName("");
    setUploadDescription("");
    setUploadEntityType("general");
    setUploadEntityId("general");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      const res = await fetch(`/api/documents/${documentToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDocuments(documents.filter((d) => d.id !== documentToDelete.id));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleDownload = (doc: Document) => {
    if (doc.url) {
      window.open(doc.url, "_blank");
    }
  };

  const handlePreview = async (doc: Document) => {
    // Fetch full document with versions
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDocument(data.data);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
    }
  };

  const canPreviewInBrowser = (mimeType: string) => {
    return (
      mimeType === "application/pdf" ||
      mimeType.startsWith("image/") ||
      mimeType.startsWith("video/") ||
      mimeType.startsWith("audio/")
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage files and documents across your CRM
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="IMAGE">Images</SelectItem>
            <SelectItem value="DOCUMENT">Documents</SelectItem>
            <SelectItem value="SPREADSHEET">Spreadsheets</SelectItem>
            <SelectItem value="PRESENTATION">Presentations</SelectItem>
            <SelectItem value="VIDEO">Videos</SelectItem>
            <SelectItem value="AUDIO">Audio</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents */}
      {loading ? (
        <div className="bg-white rounded-lg border p-8">
          <LoadingState message="Loading documents..." />
        </div>
      ) : documents.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <File className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <h3 className="mt-4 text-lg font-medium">No documents</h3>
          <p className="text-muted-foreground mt-1">
            Upload your first document to get started
          </p>
          <Button className="mt-4" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex justify-center mb-3">
                {fileTypeIcons[doc.fileType] || fileTypeIcons.OTHER}
              </div>
              <h3 className="font-medium text-sm truncate text-center">
                {doc.name}
              </h3>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {formatFileSize(doc.size)}
              </p>
              <div className="flex justify-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {canPreviewInBrowser(doc.mimeType) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreview(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDeleteClick(doc)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex items-center gap-4 hover:bg-muted/50"
            >
              <div className="flex-shrink-0">
                {fileTypeIcons[doc.fileType] || fileTypeIcons.OTHER}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{doc.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatFileSize(doc.size)}</span>
                  <span>|</span>
                  <span>v{doc.currentVersion}</span>
                  <span>|</span>
                  <span>
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{doc.fileType}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canPreviewInBrowser(doc.mimeType) && (
                      <DropdownMenuItem onClick={() => handlePreview(doc)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePreview(doc)}>
                      <History className="h-4 w-4 mr-2" />
                      Version History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteClick(doc)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a file to your document library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors",
                uploadFile && "border-primary bg-primary/5"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              {uploadFile ? (
                <div>
                  <File className="h-12 w-12 mx-auto text-primary" />
                  <p className="mt-2 font-medium">{uploadFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadFile.size)}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    Click to select or drag and drop
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Document name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadName || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {selectedDocument && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDocument.name}</DialogTitle>
                <DialogDescription>
                  {selectedDocument.description || `Version ${selectedDocument.currentVersion}`}
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="preview" className="flex-1">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="versions">
                    Versions ({selectedDocument.versions?.length || 1})
                  </TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="min-h-[400px]">
                  {selectedDocument.mimeType === "application/pdf" && selectedDocument.url ? (
                    <iframe
                      src={selectedDocument.url}
                      className="w-full h-[500px] border rounded"
                    />
                  ) : selectedDocument.mimeType.startsWith("image/") && selectedDocument.url ? (
                    <div className="flex justify-center">
                      <Image
                        src={selectedDocument.url}
                        alt={selectedDocument.name}
                        width={800}
                        height={500}
                        className="max-w-full max-h-[500px] object-contain"
                        unoptimized
                      />
                    </div>
                  ) : selectedDocument.mimeType.startsWith("video/") && selectedDocument.url ? (
                    <video
                      src={selectedDocument.url}
                      controls
                      className="w-full max-h-[500px]"
                    />
                  ) : selectedDocument.mimeType.startsWith("audio/") && selectedDocument.url ? (
                    <audio
                      src={selectedDocument.url}
                      controls
                      className="w-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                      {fileTypeIcons[selectedDocument.fileType] || fileTypeIcons.OTHER}
                      <p className="mt-4 text-muted-foreground">
                        Preview not available for this file type
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => handleDownload(selectedDocument)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download to view
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="versions">
                  <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                    {selectedDocument.versions?.map((version) => (
                      <div
                        key={version.id}
                        className="p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">
                            Version {version.version}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {version.changeNote || "No change note"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                            {" | "}
                            {formatFileSize(version.size)}
                          </div>
                        </div>
                        <Badge
                          variant={
                            version.version === selectedDocument.currentVersion
                              ? "default"
                              : "outline"
                          }
                        >
                          {version.version === selectedDocument.currentVersion
                            ? "Current"
                            : `v${version.version}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="details">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Filename</Label>
                        <p className="font-medium">{selectedDocument.filename}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Size</Label>
                        <p className="font-medium">{formatFileSize(selectedDocument.size)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Type</Label>
                        <p className="font-medium">{selectedDocument.mimeType}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Uploaded by</Label>
                        <p className="font-medium">
                          {selectedDocument.uploadedBy?.name || selectedDocument.uploadedBy?.email}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Created</Label>
                        <p className="font-medium">
                          {new Date(selectedDocument.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Updated</Label>
                        <p className="font-medium">
                          {new Date(selectedDocument.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {selectedDocument.tags.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Tags</Label>
                        <div className="flex gap-1 mt-1">
                          {selectedDocument.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{documentToDelete?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
