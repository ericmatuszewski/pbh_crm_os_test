"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileUploader } from "./FileUploader";
import { ColumnMapper } from "./ColumnMapper";
import { ImportProgress } from "./ImportProgress";
import { ImportResult } from "@/types";
import { ArrowLeft, ArrowRight, Upload, Loader2 } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type Step = "upload" | "map" | "options" | "importing" | "complete";

interface ImportSession {
  importId: string;
  fileName: string;
  columns: string[];
  rowCount: number;
  suggestedMapping: Record<string, string>;
  preview: Record<string, string>[];
}

export function ImportDialog({ open, onClose, onImportComplete }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [session, setSession] = useState<ImportSession | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to process file");
        return;
      }

      setSession({
        importId: data.data.importId,
        fileName: data.data.fileName,
        columns: data.data.columns,
        rowCount: data.data.rowCount,
        suggestedMapping: data.data.suggestedMapping,
        preview: data.data.preview,
      });
      setColumnMapping(data.data.suggestedMapping || {});
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleExecuteImport = useCallback(async () => {
    if (!session) return;

    setIsImporting(true);
    setStep("importing");
    setError(null);

    try {
      const response = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: session.importId,
          columnMapping,
          skipDuplicates,
          updateDuplicates,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Import failed");
        setStep("options");
        return;
      }

      setImportResult({
        imported: data.data.imported,
        skipped: data.data.skipped,
        updated: data.data.updated,
        errors: data.data.errors || [],
      });
      setStep("complete");
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("options");
    } finally {
      setIsImporting(false);
    }
  }, [session, columnMapping, skipDuplicates, updateDuplicates, onImportComplete]);

  const handleClose = () => {
    setStep("upload");
    setSession(null);
    setColumnMapping({});
    setImportResult(null);
    setError(null);
    setSkipDuplicates(true);
    setUpdateDuplicates(false);
    onClose();
  };

  const isRequiredFieldsMapped = () => {
    const mappedFields = Object.values(columnMapping);
    return mappedFields.includes("firstName") && mappedFields.includes("lastName");
  };

  const renderStepContent = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload a CSV or Excel file to import contacts. The file should have headers in the first row.
            </p>
            <FileUploader onFileSelect={handleFileSelect} isUploading={isUploading} />
            {isUploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing file...
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        );

      case "map":
        return session ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Found <span className="font-medium">{session.rowCount}</span> rows in{" "}
              <span className="font-medium">{session.fileName}</span>. Map your file columns to contact
              fields below.
            </p>
            <ColumnMapper
              columns={session.columns}
              mapping={columnMapping}
              onMappingChange={setColumnMapping}
              preview={session.preview}
            />
          </div>
        ) : null;

      case "options":
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
              <p className="text-sm text-gray-500">
                Ready to import <span className="font-medium">{session?.rowCount}</span> contacts from{" "}
                <span className="font-medium">{session?.fileName}</span>
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Duplicate Handling</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => {
                      setSkipDuplicates(checked as boolean);
                      if (checked) setUpdateDuplicates(false);
                    }}
                  />
                  <Label htmlFor="skipDuplicates" className="text-sm">
                    Skip duplicate contacts (matched by email, phone, or name+company)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateDuplicates"
                    checked={updateDuplicates}
                    onCheckedChange={(checked) => {
                      setUpdateDuplicates(checked as boolean);
                      if (checked) setSkipDuplicates(false);
                    }}
                  />
                  <Label htmlFor="updateDuplicates" className="text-sm">
                    Update existing contacts with new data
                  </Label>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        );

      case "importing":
        return <ImportProgress isLoading={true} result={null} />;

      case "complete":
        return <ImportProgress isLoading={false} result={importResult} />;
    }
  };

  const renderFooter = () => {
    switch (step) {
      case "upload":
        return (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        );

      case "map":
        return (
          <>
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep("options")} disabled={!isRequiredFieldsMapped()}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        );

      case "options":
        return (
          <>
            <Button variant="outline" onClick={() => setStep("map")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleExecuteImport} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              Import Contacts
            </Button>
          </>
        );

      case "importing":
        return null;

      case "complete":
        return (
          <Button onClick={handleClose}>
            Done
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Contacts"}
            {step === "map" && "Map Columns"}
            {step === "options" && "Import Options"}
            {step === "importing" && "Importing..."}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">{renderStepContent()}</div>

        <div className="flex justify-end gap-3 pt-4 border-t">{renderFooter()}</div>
      </DialogContent>
    </Dialog>
  );
}
