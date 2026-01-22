"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  MoreVertical,
  Trash2,
  Star,
  StarOff,
  GripVertical,
  ExternalLink,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  mediaType: "IMAGE" | "VIDEO" | "DOCUMENT";
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  size: number;
  isPrimary: boolean;
  position: number;
}

interface ProductMediaGalleryProps {
  productId: string;
  className?: string;
  onPrimaryChange?: (mediaId: string | null) => void;
}

const MEDIA_TYPE_ICONS = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
};

const ACCEPTED_TYPES = {
  IMAGE: "image/*",
  VIDEO: "video/*",
  DOCUMENT: ".pdf,.doc,.docx,.xls,.xlsx,.txt",
};

export function ProductMediaGallery({
  productId,
  className,
  onPrimaryChange,
}: ProductMediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"IMAGE" | "VIDEO" | "DOCUMENT">("IMAGE");
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [draggedItem, setDraggedItem] = useState<MediaItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/media`);
      const data = await res.json();
      if (data.success) {
        setMedia(data.data.sort((a: MediaItem, b: MediaItem) => a.position - b.position));
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mediaType", uploadType);

        const res = await fetch(`/api/products/${productId}/media`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || "Upload failed");
        }
      }

      await fetchMedia();
      setIsAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;

    setUploading(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim(),
          mediaType: uploadType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Upload failed");
      }

      await fetchMedia();
      setUrlInput("");
      setIsAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!window.confirm(`Delete "${item.filename}"?`)) return;

    try {
      const res = await fetch(`/api/products/${productId}/media/${item.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== item.id));
        if (item.isPrimary) {
          onPrimaryChange?.(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast.error("Failed to delete media", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  const handleSetPrimary = async (item: MediaItem) => {
    try {
      const res = await fetch(`/api/products/${productId}/media/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (res.ok) {
        setMedia((prev) =>
          prev.map((m) => ({
            ...m,
            isPrimary: m.id === item.id,
          }))
        );
        onPrimaryChange?.(item.id);
      }
    } catch (error) {
      console.error("Failed to set primary:", error);
      toast.error("Failed to set primary image", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (item: MediaItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const draggedIndex = media.findIndex((m) => m.id === draggedItem.id);
    if (draggedIndex === targetIndex) return;

    // Reorder locally
    const newMedia = [...media];
    newMedia.splice(draggedIndex, 1);
    newMedia.splice(targetIndex, 0, draggedItem);

    // Update positions
    const reordered = newMedia.map((m, i) => ({ ...m, position: i }));
    setMedia(reordered);

    // Save new order to server
    try {
      await fetch(`/api/products/${productId}/media/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: reordered.map((m) => m.id),
        }),
      });
    } catch (error) {
      console.error("Failed to reorder:", error);
      toast.error("Failed to reorder media", {
        description: error instanceof Error ? error.message : "Please try again"
      });
      fetchMedia(); // Revert on error
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    const Icon = MEDIA_TYPE_ICONS[item.mediaType];
    const isDragging = draggedItem?.id === item.id;
    const isDragOver = dragOverIndex === index;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => handleDragStart(item)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        className={cn(
          "group relative bg-white border rounded-lg overflow-hidden transition-all",
          isDragging && "opacity-50",
          isDragOver && "border-blue-500 border-2"
        )}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 cursor-grab">
          <div className="bg-white/90 rounded p-1">
            <GripVertical className="h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Primary badge */}
        {item.isPrimary && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-yellow-500 text-white">
              <Star className="h-3 w-3 mr-1" />
              Primary
            </Badge>
          </div>
        )}

        {/* Thumbnail/Preview */}
        <div className="aspect-square bg-slate-100 flex items-center justify-center">
          {item.mediaType === "IMAGE" ? (
            <Image
              src={item.thumbnailUrl || item.url}
              alt={item.filename}
              width={300}
              height={300}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <Icon className="h-12 w-12 text-slate-400" />
          )}
        </div>

        {/* Info & Actions */}
        <div className="p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" title={item.filename}>
                {item.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.size)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </a>
                </DropdownMenuItem>
                {item.mediaType === "IMAGE" && !item.isPrimary && (
                  <DropdownMenuItem onClick={() => handleSetPrimary(item)}>
                    <Star className="mr-2 h-4 w-4" />
                    Set as Primary
                  </DropdownMenuItem>
                )}
                {item.isPrimary && (
                  <DropdownMenuItem disabled>
                    <StarOff className="mr-2 h-4 w-4" />
                    Primary Image
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("p-4 text-center text-sm text-slate-500", className)}>
        Loading media...
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {media.map((item, index) => renderMediaItem(item, index))}

        {/* Add Button */}
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
        >
          <Upload className="h-8 w-8" />
          <span className="text-sm">Add Media</span>
        </button>
      </div>

      {/* Empty State */}
      {media.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No media uploaded yet. Add images, videos, or documents to showcase this product.
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Media</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Media Type Selection */}
            <div className="space-y-2">
              <Label>Media Type</Label>
              <div className="flex gap-2">
                {(["IMAGE", "VIDEO", "DOCUMENT"] as const).map((type) => {
                  const Icon = MEDIA_TYPE_ICONS[type];
                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={uploadType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUploadType(type)}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Upload Method Selection */}
            <div className="space-y-2">
              <Label>Upload Method</Label>
              <Select
                value={uploadMethod}
                onValueChange={(val) => setUploadMethod(val as "file" | "url")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">Upload File</SelectItem>
                  <SelectItem value="url">From URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Input */}
            {uploadMethod === "file" ? (
              <div className="space-y-2">
                <Label>Select File(s)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES[uploadType]}
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Media URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={uploading}
                  />
                  <Button onClick={handleUrlUpload} disabled={uploading || !urlInput.trim()}>
                    {uploading ? "..." : "Add"}
                  </Button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Loading State */}
            {uploading && (
              <div className="text-center text-sm text-muted-foreground">
                Uploading...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductMediaGallery;
