"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MicrosoftCredential {
  id: string;
  tenantId: string;
  isActive: boolean;
  tokenExpiresAt: string;
  scopes: string[];
  mailboxes: {
    id: string;
    mailboxEmail: string;
    syncStatus: string;
    lastSyncAt: string | null;
  }[];
}

interface MicrosoftConnectionCardProps {
  className?: string;
  onConnectionChange?: () => void;
}

export function MicrosoftConnectionCard({
  className,
  onConnectionChange,
}: MicrosoftConnectionCardProps) {
  const [credential, setCredential] = useState<MicrosoftCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [useSharedMailbox, setUseSharedMailbox] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredential();
  }, []);

  const fetchCredential = async () => {
    try {
      const res = await fetch("/api/microsoft/credentials");
      const data = await res.json();
      if (data.success && data.data) {
        setCredential(data.data);
      } else {
        setCredential(null);
      }
    } catch (error) {
      console.error("Failed to fetch credential:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (useSharedMailbox) {
        params.set("shared", "true");
      }

      const res = await fetch(`/api/microsoft/auth?${params}`);
      const data = await res.json();

      if (data.success && data.data.authUrl) {
        // Redirect to Microsoft OAuth
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error?.message || "Failed to get authorization URL");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Microsoft 365? This will stop email sync.")) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/microsoft/credentials", {
        method: "DELETE",
      });

      if (res.ok) {
        setCredential(null);
        onConnectionChange?.();
      } else {
        const data = await res.json();
        setError(data.error?.message || "Failed to disconnect");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      const res = await fetch("/api/microsoft/credentials/refresh", {
        method: "POST",
      });
      if (res.ok) {
        await fetchCredential();
      }
    } catch (error) {
      console.error("Failed to refresh token:", error);
    }
  };

  const isTokenExpired = credential
    ? new Date(credential.tokenExpiresAt) < new Date()
    : false;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a4ef] rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Microsoft 365</CardTitle>
              <CardDescription>
                Sync emails from Outlook and shared mailboxes
              </CardDescription>
            </div>
          </div>
          {credential && (
            <Badge
              variant="secondary"
              className={cn(
                credential.isActive && !isTokenExpired
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {credential.isActive && !isTokenExpired ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {isTokenExpired ? "Token Expired" : "Inactive"}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {credential ? (
          <>
            {/* Connection Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tenant ID</span>
                <span className="font-mono text-xs">{credential.tenantId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token Expires</span>
                <span className={cn(isTokenExpired && "text-red-600")}>
                  {formatDate(credential.tokenExpiresAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mailboxes</span>
                <span>{credential.mailboxes.length} configured</span>
              </div>
            </div>

            {/* Scopes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Permissions
              </div>
              <div className="flex flex-wrap gap-1">
                {credential.scopes.slice(0, 5).map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs">
                    {scope.split("/").pop()}
                  </Badge>
                ))}
                {credential.scopes.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{credential.scopes.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isTokenExpired ? (
                <Button onClick={handleConnect} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              ) : (
                <Button variant="outline" onClick={handleRefreshToken} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Token
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-red-600 hover:text-red-700"
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Microsoft 365 account to sync emails and integrate
                with your CRM contacts and deals.
              </p>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sharedMailbox">Shared Mailbox Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Request permissions for shared mailboxes (e.g., sales@company.com)
                  </p>
                </div>
                <Switch
                  id="sharedMailbox"
                  checked={useSharedMailbox}
                  onCheckedChange={setUseSharedMailbox}
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Microsoft 365
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You will be redirected to Microsoft to authorize access.
              </p>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 pt-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MicrosoftConnectionCard;
