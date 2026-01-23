"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Mail,
  Building2,
  Shield,
  Clock,
  RefreshCw,
  LogOut,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  status: string;
  authProvider: string | null;
  externalId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  businesses: {
    id: string;
    name: string;
    isDefault: boolean;
    role: string;
  }[];
  activeSessions: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/users/profile");
      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const syncFromAD = async () => {
    if (!profile) return;

    setSyncing(true);
    try {
      const response = await fetch("/api/users/sync-ad", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Profile synced from Active Directory");
        fetchProfile();
      } else {
        toast.error(data.error?.message || "Failed to sync from AD");
      }
    } catch (error) {
      console.error("Error syncing from AD:", error);
      toast.error("Failed to sync from Active Directory");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Profile"
          subtitle="Manage your account settings and preferences"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{profile?.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4" />
                        {profile?.email}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={profile?.status === "ACTIVE" ? "default" : "secondary"}>
                      {profile?.status}
                    </Badge>
                    {profile?.authProvider === "LDAP" && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="w-3 h-3" />
                        Active Directory
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-slate-500">Name</Label>
                    <Input value={profile?.name || ""} disabled className="mt-1 bg-slate-50" />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Email</Label>
                    <Input value={profile?.email || ""} disabled className="mt-1 bg-slate-50" />
                  </div>
                </div>

                {profile?.authProvider === "LDAP" && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Active Directory Account</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Your account is managed by Active Directory. Profile information
                          is synced from your organization's directory.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={syncFromAD}
                          disabled={syncing}
                          className="mt-3 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          {syncing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync from AD
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Access Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Access
                </CardTitle>
                <CardDescription>
                  Businesses you have access to in the CRM
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.businesses && profile.businesses.length > 0 ? (
                  <div className="space-y-3">
                    {profile.businesses.map((business) => (
                      <div
                        key={business.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{business.name}</p>
                            <p className="text-sm text-slate-500 capitalize">
                              {business.role?.toLowerCase() || "Member"}
                            </p>
                          </div>
                        </div>
                        {business.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">
                    No business access configured
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Session Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Last Login</span>
                    <span className="font-medium">
                      {profile?.lastLoginAt
                        ? formatDistanceToNow(new Date(profile.lastLoginAt), { addSuffix: true })
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Account Created</span>
                    <span className="font-medium">
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Active Sessions</span>
                    <span className="font-medium">{profile?.activeSessions || 1}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
