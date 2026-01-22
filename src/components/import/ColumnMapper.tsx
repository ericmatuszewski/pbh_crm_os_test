"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ColumnMapperProps {
  columns: string[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  preview: Record<string, string>[];
}

const targetFields = [
  { value: "", label: "-- Skip column --" },
  { value: "firstName", label: "First Name", required: true },
  { value: "lastName", label: "Last Name", required: true },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "title", label: "Job Title" },
  { value: "companyName", label: "Company Name" },
  { value: "status", label: "Status" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags (comma-separated)" },
];

export function ColumnMapper({
  columns,
  mapping,
  onMappingChange,
  preview,
}: ColumnMapperProps) {
  const handleFieldChange = (sourceColumn: string, targetField: string) => {
    const newMapping = { ...mapping };

    // Remove this source column from previous mapping
    delete newMapping[sourceColumn];

    // If a target field was selected (not empty), add new mapping
    if (targetField) {
      // Remove any existing mapping to this target field
      for (const [key, value] of Object.entries(newMapping)) {
        if (value === targetField) {
          delete newMapping[key];
        }
      }
      newMapping[sourceColumn] = targetField;
    }

    onMappingChange(newMapping);
  };

  const getUsedTargetFields = (): Set<string> => {
    return new Set(Object.values(mapping));
  };

  const usedFields = getUsedTargetFields();

  // Get sample values for preview
  const getSampleValues = (column: string): string[] => {
    return preview
      .slice(0, 3)
      .map((row) => row[column])
      .filter(Boolean);
  };

  const isRequiredMapped = (fieldValue: string): boolean => {
    const field = targetFields.find((f) => f.value === fieldValue);
    return field?.required ? usedFields.has(fieldValue) : true;
  };

  const allRequiredMapped =
    isRequiredMapped("firstName") && isRequiredMapped("lastName");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Map Columns to Contact Fields</h3>
        {!allRequiredMapped && (
          <Badge variant="destructive">
            Required: First Name and Last Name must be mapped
          </Badge>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                File Column
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Sample Values
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Map To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {columns.map((column) => {
              const currentMapping = mapping[column] || "";
              const samples = getSampleValues(column);

              return (
                <tr key={column} className="bg-white">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{column}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-500 space-y-0.5">
                      {samples.length > 0 ? (
                        samples.map((sample, i) => (
                          <div key={i} className="truncate max-w-[200px]">
                            {sample}
                          </div>
                        ))
                      ) : (
                        <span className="italic">No values</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={currentMapping}
                      onValueChange={(value) => handleFieldChange(column, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field) => {
                          const isUsed =
                            !!(field.value &&
                            usedFields.has(field.value) &&
                            mapping[column] !== field.value);

                          return (
                            <SelectItem
                              key={field.value || "skip"}
                              value={field.value || "skip"}
                              disabled={isUsed}
                            >
                              <span className="flex items-center gap-2">
                                {field.label}
                                {field.required && (
                                  <span className="text-red-500">*</span>
                                )}
                                {isUsed && (
                                  <span className="text-xs text-gray-400">
                                    (mapped)
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
