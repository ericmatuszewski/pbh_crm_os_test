"use client";

import { useMemo } from "react";
import { Deal, DealStage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Target, Percent, Timer } from "lucide-react";

interface PipelineAnalyticsProps {
  deals: Deal[];
}

interface StageMetric {
  stage: DealStage;
  label: string;
  count: number;
  value: number;
  conversionRate: number;
  color: string;
}

const stageOrder: DealStage[] = [
  DealStage.QUALIFICATION,
  DealStage.DISCOVERY,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.CLOSED_WON,
  DealStage.CLOSED_LOST,
];

const stageLabels: Record<DealStage, string> = {
  QUALIFICATION: "Qualification",
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const stageColors: Record<DealStage, string> = {
  QUALIFICATION: "bg-slate-400",
  DISCOVERY: "bg-blue-400",
  PROPOSAL: "bg-yellow-400",
  NEGOTIATION: "bg-orange-400",
  CLOSED_WON: "bg-green-500",
  CLOSED_LOST: "bg-red-400",
};

export function PipelineAnalytics({ deals }: PipelineAnalyticsProps) {
  const metrics = useMemo(() => {
    // Pipeline value (open deals)
    const openDeals = deals.filter(d => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage));
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = openDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

    // Won/Lost metrics
    const wonDeals = deals.filter(d => d.stage === "CLOSED_WON");
    const lostDeals = deals.filter(d => d.stage === "CLOSED_LOST");
    const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const lostValue = lostDeals.reduce((sum, d) => sum + d.value, 0);

    // Win rate
    const closedDeals = wonDeals.length + lostDeals.length;
    const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;

    // Average deal size
    const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

    // Stage metrics with conversion rates
    const stageMetrics: StageMetric[] = stageOrder.map((stage, index) => {
      const stageDeals = deals.filter(d => d.stage === stage);
      const count = stageDeals.length;
      const value = stageDeals.reduce((sum, d) => sum + d.value, 0);

      // Calculate conversion rate (% that moved to next stage or won)
      let conversionRate = 0;
      if (index < stageOrder.length - 2) { // Not closed stages
        const nextStages: string[] = stageOrder.slice(index + 1).filter(s => s !== DealStage.CLOSED_LOST);
        const dealsInNextStages = deals.filter(d => nextStages.includes(d.stage)).length;
        const totalFromThisStage = count + dealsInNextStages;
        conversionRate = totalFromThisStage > 0 ? (dealsInNextStages / totalFromThisStage) * 100 : 0;
      } else if (stage === DealStage.CLOSED_WON) {
        conversionRate = 100;
      }

      return {
        stage,
        label: stageLabels[stage],
        count,
        value,
        conversionRate,
        color: stageColors[stage],
      };
    });

    // Calculate average time in pipeline (for won deals)
    let avgDaysToClose = 0;
    if (wonDeals.length > 0) {
      const totalDays = wonDeals.reduce((sum, deal) => {
        if (deal.closedAt && deal.createdAt) {
          const days = Math.ceil(
            (new Date(deal.closedAt).getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }
        return sum;
      }, 0);
      avgDaysToClose = Math.round(totalDays / wonDeals.length);
    }

    return {
      pipelineValue,
      weightedValue,
      wonValue,
      lostValue,
      winRate,
      avgDealSize,
      avgDaysToClose,
      stageMetrics,
      totalDeals: deals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
    };
  }, [deals]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pipeline Value</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(metrics.pipelineValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Weighted: {formatCurrency(metrics.weightedValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Won Revenue</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.wonValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.wonDeals} deals won
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Win Rate</span>
            </div>
            <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.wonDeals} won / {metrics.wonDeals + metrics.lostDeals} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Deal Size</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(metrics.avgDealSize)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.avgDaysToClose > 0 ? `${metrics.avgDaysToClose} days avg. cycle` : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.stageMetrics
              .filter(s => !["CLOSED_WON", "CLOSED_LOST"].includes(s.stage))
              .map((stage, index, arr) => {
                const maxCount = Math.max(...arr.map(s => s.count));
                const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

                return (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                        <span className="font-medium">{stage.label}</span>
                        <span className="text-muted-foreground">({stage.count})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(stage.value)}</span>
                        {index < arr.length - 1 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            → {stage.conversionRate.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${stage.color} transition-all duration-500 rounded-lg`}
                        style={{ width: `${Math.max(widthPercent, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Closed Deals Summary */}
          <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Won</p>
                <p className="text-lg font-bold text-green-800">{metrics.wonDeals}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-semibold text-green-700">
                  {formatCurrency(metrics.wonValue)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">Lost</p>
                <p className="text-lg font-bold text-red-800">{metrics.lostDeals}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-semibold text-red-700">
                  {formatCurrency(metrics.lostValue)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
