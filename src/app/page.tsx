"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { OnboardingChecklist } from "@/components/onboarding";
import {
  PoundSterling,
  Users,
  Target,
  TrendingUp,
  Plus,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalRevenue: number;
  activeDeals: number;
  dealsClosingThisMonth: number;
  newContacts: number;
  conversionRate: number;
  revenueTrend: number;
  dealsTrend: number;
  contactsTrend: number;
  conversionTrend: number;
  pipeline: {
    stage: string;
    count: number;
    value: number;
  }[];
}

const defaultStats: DashboardStats = {
  totalRevenue: 0,
  activeDeals: 0,
  dealsClosingThisMonth: 0,
  newContacts: 0,
  conversionRate: 0,
  revenueTrend: 0,
  dealsTrend: 0,
  contactsTrend: 0,
  conversionTrend: 0,
  pipeline: [],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStats(data.data);
          setIsDemo(false);
        } else {
          // No real data, show demo values
          setIsDemo(true);
          setStats({
            totalRevenue: 284500,
            activeDeals: 24,
            dealsClosingThisMonth: 8,
            newContacts: 142,
            conversionRate: 24.8,
            revenueTrend: 12.5,
            dealsTrend: 8.2,
            contactsTrend: 5.1,
            conversionTrend: 2.7,
            pipeline: [
              { stage: "Qualification", count: 8, value: 45000 },
              { stage: "Discovery", count: 6, value: 78000 },
              { stage: "Proposal", count: 5, value: 120000 },
              { stage: "Negotiation", count: 3, value: 95000 },
            ],
          });
        }
      } else {
        // API error, show demo values
        setIsDemo(true);
        setStats({
          totalRevenue: 284500,
          activeDeals: 24,
          dealsClosingThisMonth: 8,
          newContacts: 142,
          conversionRate: 24.8,
          revenueTrend: 12.5,
          dealsTrend: 8.2,
          contactsTrend: 5.1,
          conversionTrend: 2.7,
          pipeline: [
            { stage: "Qualification", count: 8, value: 45000 },
            { stage: "Discovery", count: 6, value: 78000 },
            { stage: "Proposal", count: 5, value: 120000 },
            { stage: "Negotiation", count: 3, value: 95000 },
          ],
        });
      }
    } catch {
      // Network error, show demo values
      setIsDemo(true);
      setStats({
        totalRevenue: 284500,
        activeDeals: 24,
        dealsClosingThisMonth: 8,
        newContacts: 142,
        conversionRate: 24.8,
        revenueTrend: 12.5,
        dealsTrend: 8.2,
        contactsTrend: 5.1,
        conversionTrend: 2.7,
        pipeline: [
          { stage: "Qualification", count: 8, value: 45000 },
          { stage: "Discovery", count: 6, value: 78000 },
          { stage: "Proposal", count: 5, value: 120000 },
          { stage: "Negotiation", count: 3, value: 95000 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToEmpty = () => {
    setStats(defaultStats);
    setIsDemo(false);
    setShowDemoBanner(false);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Dashboard"
          subtitle="Welcome back! Here's what's happening with your sales."
          actions={
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Demo Data Banner */}
          {isDemo && showDemoBanner && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-800">Sample Data Displayed</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    The dashboard is showing sample data for demonstration purposes.
                    Add contacts, deals, and activities to see your real metrics.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToEmpty}
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Show Empty State
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDemoBanner(false)}
                      className="text-amber-700 hover:bg-amber-100"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => setShowDemoBanner(false)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Onboarding Checklist for new agents */}
          <div className="mb-6">
            <OnboardingChecklist />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricsCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              subtitle="from last month"
              icon={PoundSterling}
              trend={stats.revenueTrend ? { value: stats.revenueTrend, isPositive: stats.revenueTrend > 0 } : undefined}
            />
            <MetricsCard
              title="Active Deals"
              value={stats.activeDeals.toString()}
              subtitle={`${stats.dealsClosingThisMonth} closing this month`}
              icon={Target}
              trend={stats.dealsTrend ? { value: stats.dealsTrend, isPositive: stats.dealsTrend > 0 } : undefined}
            />
            <MetricsCard
              title="New Contacts"
              value={stats.newContacts.toString()}
              subtitle="this month"
              icon={Users}
              trend={stats.contactsTrend ? { value: stats.contactsTrend, isPositive: stats.contactsTrend > 0 } : undefined}
            />
            <MetricsCard
              title="Conversion Rate"
              value={`${stats.conversionRate.toFixed(1)}%`}
              subtitle="vs last month"
              icon={TrendingUp}
              trend={stats.conversionTrend ? { value: stats.conversionTrend, isPositive: stats.conversionTrend > 0 } : undefined}
            />
          </div>

          {/* Pipeline Preview */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sales Pipeline</h2>
              <Button variant="outline" size="sm" asChild>
                <a href="/deals">View All</a>
              </Button>
            </div>
            {stats.pipeline.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {stats.pipeline.map((item) => (
                  <div
                    key={item.stage}
                    className="bg-slate-50 rounded-lg p-4 text-center"
                  >
                    <p className="text-sm text-muted-foreground">{item.stage}</p>
                    <p className="text-2xl font-bold mt-1">{item.count}</p>
                    <p className="text-sm text-primary font-medium">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No deals in pipeline yet</p>
                <Button variant="link" className="mt-2" asChild>
                  <a href="/deals">Create your first deal</a>
                </Button>
              </div>
            )}
          </div>

          {/* Recent Activity & Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              {isDemo ? (
                <div className="space-y-4">
                  {[
                    { action: "Deal updated", target: "Acme Corp - Enterprise", time: "2 hours ago" },
                    { action: "New contact added", target: "John Smith", time: "4 hours ago" },
                    { action: "Meeting scheduled", target: "TechStart Inc", time: "5 hours ago" },
                    { action: "Deal won", target: "GlobalTech - Pro Plan", time: "1 day ago" },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <span className="text-muted-foreground">{activity.action}: </span>
                        <span className="font-medium">{activity.target}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{activity.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">Activity will appear here as you work</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Upcoming Tasks</h2>
              {isDemo ? (
                <div className="space-y-3">
                  {[
                    { task: "Follow up with Acme Corp", due: "Today", priority: "high" },
                    { task: "Prepare proposal for TechStart", due: "Tomorrow", priority: "medium" },
                    { task: "Schedule demo with GlobalTech", due: "Jan 22", priority: "medium" },
                    { task: "Review contract terms", due: "Jan 23", priority: "low" },
                  ].map((task, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <input type="checkbox" className="rounded border-slate-300" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.task}</p>
                        <p className="text-xs text-muted-foreground">Due: {task.due}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No upcoming tasks</p>
                  <Button variant="link" className="mt-2" asChild>
                    <a href="/tasks">Create a task</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
