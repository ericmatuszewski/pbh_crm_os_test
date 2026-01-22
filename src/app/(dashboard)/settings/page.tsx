"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  Palette,
  Bell,
  Shield,
  Database,
  Webhook,
  Users,
  Building2,
  FormInput,
  UserCog,
  ClipboardCheck,
  Key,
  Activity,
} from "lucide-react";

const settingsSections = [
  {
    title: "Business Settings",
    description: "Configure your business information, branding, email settings, and quote/invoice defaults",
    href: "/settings/business",
    icon: Building2,
    badge: null,
  },
  {
    title: "Custom Fields",
    description: "Add custom fields to track additional data on contacts, companies, deals, quotes, and tasks",
    href: "/settings/custom-fields",
    icon: FormInput,
    badge: null,
  },
  {
    title: "Roles & Permissions",
    description: "Define roles and configure permissions for team members",
    href: "/settings/roles",
    icon: UserCog,
    badge: null,
  },
  {
    title: "API & Integrations",
    description: "Manage API keys, webhooks, and third-party integrations",
    href: "/settings/api",
    icon: Key,
    badge: null,
  },
  {
    title: "Audit Log",
    description: "View activity history and compliance audit trail",
    href: "/settings/audit",
    icon: ClipboardCheck,
    badge: null,
  },
  {
    title: "System Monitoring",
    description: "Monitor performance, background jobs, and system health",
    href: "/settings/system",
    icon: Activity,
    badge: null,
  },
  {
    title: "Users",
    description: "Manage user accounts, invitations, status, and role assignments",
    href: "/settings/users",
    icon: Users,
    badge: null,
  },
  {
    title: "Teams",
    description: "Organize users into teams for collaboration and permissions",
    href: "/settings/teams",
    icon: UserCog,
    badge: null,
  },
  {
    title: "Notifications",
    description: "Configure email and in-app notification preferences",
    href: "/settings/notifications",
    icon: Bell,
    badge: "Coming Soon",
  },
  {
    title: "Security",
    description: "Manage password policies, two-factor authentication, and sessions",
    href: "/settings/security",
    icon: Shield,
    badge: "Coming Soon",
  },
  {
    title: "Data Management",
    description: "Database backups, cleanup configuration, and statistics",
    href: "/admin/data",
    icon: Database,
    badge: null,
  },
  {
    title: "Integrations",
    description: "Connect third-party apps and configure webhooks",
    href: "/settings/integrations",
    icon: Webhook,
    badge: "Coming Soon",
  },
  {
    title: "Appearance",
    description: "Customize the look and feel of your CRM",
    href: "/settings/appearance",
    icon: Palette,
    badge: "Coming Soon",
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Configure your CRM settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          const isDisabled = section.badge === "Coming Soon";

          return (
            <Link
              key={section.href}
              href={isDisabled ? "#" : section.href}
              className={isDisabled ? "cursor-not-allowed" : ""}
            >
              <Card
                className={`h-full transition-all ${
                  isDisabled
                    ? "opacity-50"
                    : "hover:border-primary hover:shadow-md"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {section.badge && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          section.badge === "New"
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {section.badge}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
