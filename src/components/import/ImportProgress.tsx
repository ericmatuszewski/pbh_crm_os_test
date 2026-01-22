"use client";

import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { ImportResult } from "@/types";

interface ImportProgressProps {
  isLoading: boolean;
  result: ImportResult | null;
}

export function ImportProgress({ isLoading, result }: ImportProgressProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium text-gray-900">Importing contacts...</p>
          <p className="text-sm text-gray-500">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const total = result.imported + result.skipped + result.updated + result.errors.length;
  const successRate = total > 0 ? ((result.imported + result.updated) / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        {result.errors.length === 0 ? (
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        ) : result.imported > 0 || result.updated > 0 ? (
          <AlertCircle className="mx-auto h-16 w-16 text-yellow-500" />
        ) : (
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
        )}
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Import {result.errors.length === 0 ? "Complete" : "Finished with Issues"}
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{result.imported}</p>
          <p className="text-sm text-green-700">Imported</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
          <p className="text-sm text-blue-700">Updated</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
          <p className="text-sm text-gray-700">Skipped</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
          <p className="text-sm text-red-700">Errors</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-green-500 h-2.5 rounded-full transition-all"
          style={{ width: `${successRate}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-500">
        {successRate.toFixed(1)}% success rate ({result.imported + result.updated} of {total} rows)
      </p>

      {result.errors.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-2">Errors ({result.errors.length})</h4>
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Row</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.errors.map((error, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-gray-600">{error.rowNumber}</td>
                    <td className="px-4 py-2 text-red-600">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
