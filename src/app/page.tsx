import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
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
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricsCard
              title="Total Revenue"
              value="$284,500"
              subtitle="from last month"
              icon={DollarSign}
              trend={{ value: 12.5, isPositive: true }}
            />
            <MetricsCard
              title="Active Deals"
              value="24"
              subtitle="8 closing this month"
              icon={Target}
              trend={{ value: 8.2, isPositive: true }}
            />
            <MetricsCard
              title="New Contacts"
              value="142"
              subtitle="this month"
              icon={Users}
              trend={{ value: 5.1, isPositive: true }}
            />
            <MetricsCard
              title="Conversion Rate"
              value="24.8%"
              subtitle="vs 22.1% last month"
              icon={TrendingUp}
              trend={{ value: 2.7, isPositive: true }}
            />
          </div>

          {/* Pipeline Preview */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sales Pipeline</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { stage: "Qualification", count: 8, value: "$45,000" },
                { stage: "Discovery", count: 6, value: "$78,000" },
                { stage: "Proposal", count: 5, value: "$120,000" },
                { stage: "Negotiation", count: 3, value: "$95,000" },
              ].map((item) => (
                <div
                  key={item.stage}
                  className="bg-slate-50 rounded-lg p-4 text-center"
                >
                  <p className="text-sm text-muted-foreground">{item.stage}</p>
                  <p className="text-2xl font-bold mt-1">{item.count}</p>
                  <p className="text-sm text-primary font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity & Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
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
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Upcoming Tasks</h2>
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
