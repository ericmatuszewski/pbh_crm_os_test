"use client";

import { useState, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Database,
  FileSpreadsheet,
  Settings,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSource {
  id: string;
  name: string;
  sourceType: string;
}

interface Column {
  name: string;
  type: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

interface ImportWizardProps {
  dataSources: DataSource[];
  onComplete?: () => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: "source", title: "Select Source", icon: Database },
  { id: "data", title: "Configure Data", icon: FileSpreadsheet },
  { id: "mapping", title: "Map Fields", icon: Settings },
  { id: "run", title: "Run Import", icon: Play },
];

const TARGET_ENTITIES = [
  { value: "products", label: "Products" },
  { value: "contacts", label: "Contacts" },
  { value: "companies", label: "Companies" },
  { value: "deals", label: "Deals" },
];

const TARGET_FIELDS: Record<string, { field: string; label: string; required?: boolean }[]> = {
  products: [
    { field: "sku", label: "SKU", required: true },
    { field: "name", label: "Name", required: true },
    { field: "description", label: "Description" },
    { field: "basePrice", label: "Base Price", required: true },
    { field: "currency", label: "Currency" },
    { field: "type", label: "Type" },
    { field: "status", label: "Status" },
    { field: "category", label: "Category" },
  ],
  contacts: [
    { field: "firstName", label: "First Name", required: true },
    { field: "lastName", label: "Last Name", required: true },
    { field: "email", label: "Email" },
    { field: "phone", label: "Phone" },
    { field: "title", label: "Job Title" },
    { field: "company", label: "Company Name" },
  ],
  companies: [
    { field: "name", label: "Company Name", required: true },
    { field: "industry", label: "Industry" },
    { field: "website", label: "Website" },
    { field: "phone", label: "Phone" },
    { field: "address", label: "Address" },
    { field: "city", label: "City" },
    { field: "country", label: "Country" },
  ],
  deals: [
    { field: "title", label: "Deal Title", required: true },
    { field: "value", label: "Deal Value", required: true },
    { field: "currency", label: "Currency" },
    { field: "stage", label: "Stage" },
    { field: "probability", label: "Probability" },
    { field: "closeDate", label: "Expected Close Date" },
  ],
};

export function ImportWizard({ dataSources, onComplete, onCancel }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [targetEntity, setTargetEntity] = useState<string>("products");
  const [sourceColumns, setSourceColumns] = useState<Column[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [duplicateAction, setDuplicateAction] = useState("skip");
  const [duplicateKey, setDuplicateKey] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalRows: number;
    importedRows: number;
    updatedRows: number;
    skippedRows: number;
    errorRows: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSource = dataSources.find((s) => s.id === selectedSourceId);
  const isFileSource = ["CSV_FILE", "JSON_FILE", "XML_FILE"].includes(
    selectedSource?.sourceType || ""
  );

  const fetchSourceSchema = useCallback(async () => {
    if (!selectedSourceId) return;

    setLoading(true);
    setError(null);

    try {
      const url = uploadedFile
        ? `/api/import/upload/schema`
        : `/api/import/data-sources/${selectedSourceId}/schema`;

      let res;
      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        res = await fetch(url, { method: "POST", body: formData });
      } else {
        res = await fetch(url);
      }

      const data = await res.json();
      if (data.success) {
        setSourceColumns(data.data.columns || []);
        // Auto-map matching fields
        const targetFields = TARGET_FIELDS[targetEntity] || [];
        const autoMappings: FieldMapping[] = [];
        for (const col of data.data.columns || []) {
          const matchingTarget = targetFields.find(
            (f) =>
              f.field.toLowerCase() === col.name.toLowerCase() ||
              f.label.toLowerCase() === col.name.toLowerCase()
          );
          if (matchingTarget) {
            autoMappings.push({
              sourceField: col.name,
              targetField: matchingTarget.field,
            });
          }
        }
        setMappings(autoMappings);
      } else {
        setError(data.error?.message || "Failed to fetch schema");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schema");
    } finally {
      setLoading(false);
    }
  }, [selectedSourceId, uploadedFile, targetEntity]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleAddMapping = () => {
    setMappings([...mappings, { sourceField: "", targetField: "" }]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, field: "sourceField" | "targetField", value: string) => {
    setMappings(
      mappings.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handleRunImport = async () => {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);
    setError(null);

    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }
      formData.append("dataSourceId", selectedSourceId);
      formData.append("targetEntity", targetEntity);
      formData.append("fieldMappings", JSON.stringify(mappings));
      formData.append("duplicateAction", duplicateAction);
      formData.append("duplicateKey", JSON.stringify(duplicateKey));

      // Simulate progress for demo
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const res = await fetch("/api/import/jobs", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await res.json();
      if (data.success) {
        setImportProgress(100);
        setImportResult(data.data);
      } else {
        setError(data.error?.message || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedSourceId && (!isFileSource || uploadedFile);
      case 1:
        return sourceColumns.length > 0;
      case 2:
        return mappings.length > 0 && mappings.every((m) => m.sourceField && m.targetField);
      case 3:
        return importResult?.success;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && sourceColumns.length === 0) {
      await fetchSourceSchema();
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      // Step 1: Select Source
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {source.name}
                        <Badge variant="secondary" className="text-xs">
                          {source.sourceType.replace("_", " ")}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFileSource && (
              <div className="space-y-2">
                <Label>Upload File</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      <span className="font-medium">{uploadedFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setUploadedFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drop your file here or click to browse
                      </p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.json,.xml"
                        onChange={handleFileUpload}
                      />
                      <Button variant="outline" size="sm" type="button">
                        Choose File
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Import Into</Label>
              <Select value={targetEntity} onValueChange={setTargetEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ENTITIES.map((entity) => (
                    <SelectItem key={entity.value} value={entity.value}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      // Step 2: Configure Data
      case 1:
        return (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading source schema...</span>
              </div>
            ) : sourceColumns.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Source Columns</h4>
                    <p className="text-sm text-muted-foreground">
                      {sourceColumns.length} columns detected
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchSourceSchema}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column Name</TableHead>
                        <TableHead>Data Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sourceColumns.map((col) => (
                        <TableRow key={col.name}>
                          <TableCell className="font-mono text-sm">{col.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{col.type}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h4 className="font-medium mb-2">No Schema Loaded</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Click below to load the source schema
                </p>
                <Button onClick={fetchSourceSchema}>Load Schema</Button>
              </div>
            )}
          </div>
        );

      // Step 3: Map Fields
      case 2:
        const targetFields = TARGET_FIELDS[targetEntity] || [];
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Field Mappings</h4>
                <p className="text-sm text-muted-foreground">
                  Map source columns to {targetEntity} fields
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddMapping}>
                <Plus className="h-4 w-4 mr-1" />
                Add Mapping
              </Button>
            </div>

            <div className="space-y-3">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Select
                    value={mapping.sourceField}
                    onValueChange={(val) => handleMappingChange(index, "sourceField", val)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Source column" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceColumns.map((col) => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />

                  <Select
                    value={mapping.targetField}
                    onValueChange={(val) => handleMappingChange(index, "targetField", val)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Target field" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((field) => (
                        <SelectItem key={field.field} value={field.field}>
                          <div className="flex items-center gap-2">
                            {field.label}
                            {field.required && (
                              <Badge variant="destructive" className="text-[10px]">
                                Required
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMapping(index)}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Duplicate Handling</h4>
              <div className="space-y-2">
                <Label>When a duplicate is found</Label>
                <Select value={duplicateAction} onValueChange={setDuplicateAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip the record</SelectItem>
                    <SelectItem value="update">Update existing record</SelectItem>
                    <SelectItem value="error">Report as error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Identify duplicates by</Label>
                <Select
                  value={duplicateKey[0] || ""}
                  onValueChange={(val) => setDuplicateKey([val])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select key field" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetFields.map((field) => (
                      <SelectItem key={field.field} value={field.field}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // Step 4: Run Import
      case 3:
        return (
          <div className="space-y-6">
            {importing ? (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <h4 className="font-medium mb-2">Importing data...</h4>
                <Progress value={importProgress} className="max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  {importProgress}% complete
                </p>
              </div>
            ) : importResult ? (
              <div className="text-center py-8">
                {importResult.success ? (
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
                )}
                <h4 className="font-medium mb-4">
                  {importResult.success ? "Import Complete!" : "Import Completed with Errors"}
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold">{importResult.totalRows}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.importedRows}
                    </div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.updatedRows}
                    </div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.errorRows}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-left max-w-2xl mx-auto">
                    <h5 className="font-medium mb-2">Errors:</h5>
                    <div className="bg-red-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-sm text-red-700">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Play className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h4 className="font-medium mb-2">Ready to Import</h4>
                <p className="text-sm text-muted-foreground mb-6">
                  Review the settings below and click "Start Import" to begin.
                </p>

                <div className="text-left max-w-md mx-auto space-y-3 bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-medium">{selectedSource?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-medium capitalize">{targetEntity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mappings:</span>
                    <span className="font-medium">{mappings.length} fields</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duplicates:</span>
                    <span className="font-medium capitalize">{duplicateAction}</span>
                  </div>
                </div>

                <Button className="mt-6" onClick={handleRunImport}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Import
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Steps Progress */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                index < STEPS.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  isActive && "border-primary bg-primary text-white",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-slate-200"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    isCompleted ? "bg-green-500" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">{renderStepContent()}</CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={currentStep === 0 ? onCancel : handleBack}>
          {currentStep === 0 ? (
            "Cancel"
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </>
          )}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : importResult?.success ? (
          <Button onClick={onComplete}>Done</Button>
        ) : null}
      </div>
    </div>
  );
}

export default ImportWizard;
