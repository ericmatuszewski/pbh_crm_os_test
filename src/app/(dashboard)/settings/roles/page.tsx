"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  ChevronRight,
  Lock,
  Eye,
  Edit as EditIcon,
} from "lucide-react";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  level: number;
  type: "SYSTEM" | "CUSTOM";
  isActive: boolean;
  parentId: string | null;
  parent?: { id: string; name: string; displayName: string } | null;
  permissions?: RolePermission[];
  fieldPermissions?: FieldPermission[];
  _count?: { userRoles: number };
}

interface RolePermission {
  id: string;
  entity: string;
  action: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT" | "IMPORT" | "SHARE" | "ASSIGN";
  recordAccess: "NONE" | "OWN" | "TEAM" | "ALL";
  conditions: unknown[];
}

interface FieldPermission {
  id: string;
  entity: string;
  fieldName: string;
  canView: boolean;
  canEdit: boolean;
  maskValue: boolean;
  maskPattern: string | null;
}

const ENTITIES = [
  "contacts",
  "companies",
  "deals",
  "quotes",
  "tasks",
  "products",
  "users",
  "settings",
];

const ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "IMPORT", "SHARE", "ASSIGN"];
const RECORD_ACCESS_LEVELS = ["NONE", "OWN", "TEAM", "ALL"];

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    level: 10,
    parentId: "",
  });

  // Permissions state
  const [permissions, setPermissions] = useState<Record<string, Record<string, string>>>({});
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermission[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/roles");
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`);
      const data = await response.json();
      if (data.success) {
        // Convert permissions array to lookup object
        const permLookup: Record<string, Record<string, string>> = {};
        for (const p of data.data.permissions as RolePermission[]) {
          if (!permLookup[p.entity]) {
            permLookup[p.entity] = {};
          }
          permLookup[p.entity][p.action] = p.recordAccess;
        }
        setPermissions(permLookup);
        setFieldPermissions(data.data.fieldPermissions);
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      toast.error("Failed to load permissions");
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Role created successfully");
        setShowCreateDialog(false);
        resetForm();
        fetchRoles();
      } else {
        toast.error(data.error?.message || "Failed to create role");
      }
    } catch (error) {
      console.error("Failed to create role:", error);
      toast.error("Failed to create role");
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.displayName,
          description: formData.description,
          level: formData.level,
          parentId: formData.parentId || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Role updated successfully");
        setShowEditDialog(false);
        fetchRoles();
      } else {
        toast.error(data.error?.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Role deleted successfully");
        setShowDeleteDialog(false);
        setSelectedRole(null);
        fetchRoles();
      } else {
        toast.error(data.error?.message || "Failed to delete role");
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("Failed to delete role");
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      // Convert permissions lookup to array
      const permissionsArray: { entity: string; action: string; recordAccess: string }[] = [];
      for (const [entity, actions] of Object.entries(permissions)) {
        for (const [action, recordAccess] of Object.entries(actions)) {
          if (recordAccess !== "NONE") {
            permissionsArray.push({ entity, action, recordAccess });
          }
        }
      }

      const response = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: permissionsArray,
          fieldPermissions,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Permissions saved successfully");
        setShowPermissionsDialog(false);
        fetchRoles();
      } else {
        toast.error(data.error?.message || "Failed to save permissions");
      }
    } catch (error) {
      console.error("Failed to save permissions:", error);
      toast.error("Failed to save permissions");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      level: 10,
      parentId: "",
    });
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      level: role.level,
      parentId: role.parentId || "",
    });
    setShowEditDialog(true);
  };

  const openPermissionsDialog = async (role: Role) => {
    setSelectedRole(role);
    await fetchRolePermissions(role.id);
    setShowPermissionsDialog(true);
  };

  const getPermissionValue = (entity: string, action: string): string => {
    return permissions[entity]?.[action] || "NONE";
  };

  const setPermissionValue = (entity: string, action: string, value: string) => {
    setPermissions((prev) => ({
      ...prev,
      [entity]: {
        ...(prev[entity] || {}),
        [action]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">
            Configure roles and permissions for your organization
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            System Roles
          </CardTitle>
          <CardDescription>
            Built-in roles with predefined permissions. These cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles
                .filter((r) => r.type === "SYSTEM")
                .map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{role.displayName}</div>
                          <div className="text-xs text-muted-foreground">{role.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell>{role.level}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Users className="mr-1 h-3 w-3" />
                        {role._count?.userRoles || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? "default" : "secondary"}>
                        {role.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPermissionsDialog(role)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Custom Roles
          </CardTitle>
          <CardDescription>
            Create custom roles tailored to your organization&apos;s needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.filter((r) => r.type === "CUSTOM").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No custom roles yet</p>
              <p className="text-sm">Create your first custom role to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Parent Role</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles
                  .filter((r) => r.type === "CUSTOM")
                  .map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="font-medium">{role.displayName}</div>
                        <div className="text-xs text-muted-foreground">{role.name}</div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        {role.parent ? (
                          <div className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            {role.parent.displayName}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{role.level}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Users className="mr-1 h-3 w-3" />
                          {role._count?.userRoles || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isActive ? "default" : "secondary"}>
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPermissionsDialog(role)}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRole(role);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a custom role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name (System ID)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  })
                }
                placeholder="custom_role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Custom Role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this role is for..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Permission Level</Label>
                <Input
                  id="level"
                  type="number"
                  min={1}
                  max={99}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: parseInt(e.target.value) || 10 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentId">Inherit From</Label>
                <Select
                  value={formData.parentId || "__none__"}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No parent</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.displayName}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details. System role names cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Display Name</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                disabled={selectedRole?.type === "SYSTEM"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            {selectedRole?.type !== "SYSTEM" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-level">Permission Level</Label>
                  <Input
                    id="edit-level"
                    type="number"
                    min={1}
                    max={99}
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parentId">Inherit From</Label>
                  <Select
                    value={formData.parentId || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, parentId: value === "__none__" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No parent</SelectItem>
                      {roles
                        .filter((r) => r.id !== selectedRole?.id)
                        .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedRole?.displayName}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole?.type === "SYSTEM" ? "View" : "Edit"} Permissions -{" "}
              {selectedRole?.displayName}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.type === "SYSTEM"
                ? "System role permissions are read-only"
                : "Configure object and field-level permissions"}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="object" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="object">Object Permissions</TabsTrigger>
              <TabsTrigger value="field">Field Permissions</TabsTrigger>
            </TabsList>
            <TabsContent value="object" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Entity</TableHead>
                      {ACTIONS.map((action) => (
                        <TableHead key={action} className="text-center text-xs">
                          {action}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ENTITIES.map((entity) => (
                      <TableRow key={entity}>
                        <TableCell className="font-medium capitalize">{entity}</TableCell>
                        {ACTIONS.map((action) => (
                          <TableCell key={action} className="text-center">
                            {selectedRole?.type === "SYSTEM" ? (
                              <Badge
                                variant={
                                  getPermissionValue(entity, action) === "ALL"
                                    ? "default"
                                    : getPermissionValue(entity, action) === "NONE"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {getPermissionValue(entity, action)}
                              </Badge>
                            ) : (
                              <Select
                                value={getPermissionValue(entity, action)}
                                onValueChange={(value) =>
                                  setPermissionValue(entity, action, value)
                                }
                              >
                                <SelectTrigger className="h-8 w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {RECORD_ACCESS_LEVELS.map((level) => (
                                    <SelectItem key={level} value={level}>
                                      {level}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  <strong>NONE:</strong> No access |{" "}
                  <strong>OWN:</strong> Own records only |{" "}
                  <strong>TEAM:</strong> Team records |{" "}
                  <strong>ALL:</strong> All records
                </p>
              </div>
            </TabsContent>
            <TabsContent value="field" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <EditIcon className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>Field-level permissions</p>
                <p className="text-sm">
                  Configure which fields users can view or edit for each entity
                </p>
                {fieldPermissions.length > 0 && (
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead className="text-center">Can View</TableHead>
                        <TableHead className="text-center">Can Edit</TableHead>
                        <TableHead className="text-center">Masked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldPermissions.map((fp) => (
                        <TableRow key={fp.id}>
                          <TableCell className="capitalize">{fp.entity}</TableCell>
                          <TableCell>{fp.fieldName}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={fp.canView} disabled={selectedRole?.type === "SYSTEM"} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={fp.canEdit} disabled={selectedRole?.type === "SYSTEM"} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={fp.maskValue} disabled={selectedRole?.type === "SYSTEM"} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              {selectedRole?.type === "SYSTEM" ? "Close" : "Cancel"}
            </Button>
            {selectedRole?.type !== "SYSTEM" && (
              <Button onClick={handleSavePermissions}>Save Permissions</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
