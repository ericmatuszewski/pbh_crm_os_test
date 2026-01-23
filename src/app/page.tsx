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
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  user?: { name: string };
  contact?: { firstName: string; lastName: string };
  deal?: { title: string };
}

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  priority: string;
  status: string;
  assignee?: { name: string };
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

const activityIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: FileText,
  TASK: CheckSquare,
  DEAL_UPDATE: ArrowRight,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [statsRes, activitiesRes, tasksRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/activities?limit=5"),
        fetch("/api/tasks?limit=5&status=TODO"),
      ]);

      // Handle stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
          setIsDemo(false);
        } else {
          setIsDemo(true);
          setShowDemoBanner(true);
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
      }

      // Handle activities
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        if (activitiesData.success && activitiesData.data) {
          setActivities(activitiesData.data);
        }
      }

      // Handle tasks
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData.success && tasksData.data) {
          setTasks(tasksData.data);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setIsDemo(true);
      setShowDemoBanner(true);
    } finally {
      setLoading(false);
    }
  };

  const resetToEmpty = () => {
    setStats(defaultStats);
    setIsDemo(false);
    setShowDemoBanner(false);
  };

  const formatActivityTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return "No due date";
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
      return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const getActivityIcon = (type: string) => {
    const Icon = activityIcons[type] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Dashboard"
          subtitle="Welcome back! Here's what's happening with your sales."
          actions={
            <Button asChild>
              <a href="/deals">
                <Plus className="w-4 h-4 mr-2" />
                New Deal
              </a>
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
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Sales Pipeline</h2>
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
                    <p className="text-sm text-slate-600">{item.stage}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{item.count}</p>
                    <p className="text-sm text-blue-600 font-medium">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
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
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/activities">View All</a>
                </Button>
              </div>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{activity.title}</p>
                        {activity.contact && (
                          <p className="text-slate-500 text-xs">
                            {activity.contact.firstName} {activity.contact.lastName}
                          </p>
                        )}
                        {activity.deal && (
                          <p className="text-slate-500 text-xs">{activity.deal.title}</p>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs whitespace-nowrap">
                        {formatActivityTime(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">Activity will appear here as you work</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Tasks</h2>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/tasks">View All</a>
                </Button>
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        onChange={() => {
                          // Could implement task completion here
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500">Due: {formatDueDate(task.dueDate)}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          task.priority === "HIGH" || task.priority === "URGENT"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {task.priority.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
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
