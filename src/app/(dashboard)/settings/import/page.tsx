"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import { DataSourceForm, ImportWizard, ImportJobList } from "@/components/import";
import type { ImportSourceType } from "@/components/import/DataSourceForm";
import {
  Plus,
  Database,
  Upload,
  History,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSource {
  id: string;
  name: string;
  sourceType: ImportSourceType;
  connectionConfig: Record<string, unknown>;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  createdAt: string;
}

export default function ImportSettingsPage() {
  const [activeTab, setActiveTab] = useState("sources");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);

  const fetchDataSources = useCallback(async () => {
    try {
      const res = await fetch("/api/import/data-sources");
      const data = await res.json();
      if (data.success) {
        setDataSources(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch data sources:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  const handleOpenForm = (source?: DataSource) => {
    setEditingSource(source || null);
    setIsFormOpen(true);
  };

  const handleSaveDataSource = async (data: {
    id?: string;
    name: string;
    sourceType: string;
    connectionConfig: Record<string, unknown>;
    isActive: boolean;
  }) => {
    const url = data.id
      ? `/api/import/data-sources/${data.id}`
      : "/api/import/data-sources";
    const method = data.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || "Failed to save");
    }

    await fetchDataSources();
    setIsFormOpen(false);
  };

  const handleTestConnection = async (data: {
    id?: string;
    name: string;
    sourceType: string;
    connectionConfig: Record<string, unknown>;
    isActive: boolean;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!data.id) {
      // For new sources, we need to save first or use a test endpoint
      return { success: false, message: "Save the data source first to test" };
    }

    const res = await fetch(`/api/import/data-sources/${data.id}/test`, {
      method: "POST",
    });
    const result = await res.json();
    return {
      success: result.success,
      message: result.data?.message || result.error?.message,
    };
  };

  const handleDeleteDataSource = async (source: DataSource) => {
    if (!window.confirm(`Delete data source "${source.name}"?`)) return;

    try {
      const res = await fetch(`/api/import/data-sources/${source.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDataSources();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Data Import"
          subtitle="Manage data sources and import data"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
              <Button onClick={() => setIsWizardOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                New Import
              </Button>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="sources" className="gap-2">
                <Database className="h-4 w-4" />
                Data Sources
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Import History
              </TabsTrigger>
            </TabsList>

            {/* Data Sources Tab */}
            <TabsContent value="sources">
              {loading ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                  Loading...
                </div>
              ) : dataSources.length > 0 ? (
                <div className="bg-white rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Tested</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataSources.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">{source.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {source.sourceType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {source.isActive ? (
                              <Badge className="bg-green-100 text-green-700">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {source.lastTestedAt ? (
                              <div className="flex items-center gap-2">
                                {source.lastTestResult === "success" ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(source.lastTestedAt)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(source.createdAt)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingSource(source);
                                    setIsWizardOpen(true);
                                  }}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Run Import
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenForm(source)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteDataSource(source)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="bg-white rounded-lg border">
                  <EmptyState
                    icon={<Database className="h-12 w-12" />}
                    title="No data sources configured"
                    description="Add a data source to start importing data from databases, files, or APIs."
                    action={{ label: "Add Data Source", onClick: () => handleOpenForm() }}
                  />
                </div>
              )}
            </TabsContent>

            {/* Import History Tab */}
            <TabsContent value="history">
              <ImportJobList />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Data Source Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? "Edit Data Source" : "Add Data Source"}
            </DialogTitle>
          </DialogHeader>
          <DataSourceForm
            dataSource={editingSource}
            onSave={handleSaveDataSource}
            onCancel={() => setIsFormOpen(false)}
            onTestConnection={editingSource ? handleTestConnection : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Import Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
          </DialogHeader>
          <ImportWizard
            dataSources={dataSources.filter((s) => s.isActive)}
            onComplete={() => {
              setIsWizardOpen(false);
              setActiveTab("history");
            }}
            onCancel={() => setIsWizardOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
