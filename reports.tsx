
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Calendar,
  DollarSign, 
  Download, 
  LineChart, 
  Loader2Icon, 
  PieChart,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Chart } from "@/components/ui/chart";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports/summary', dateRange],
    queryFn: () => apiRequest({ 
      path: "/api/reports/summary",
      method: "GET"
    })
  });
  
  // Fetch game performance data
  const { data: gameData } = useQuery({
    queryKey: ['/api/reports/game-performance', dateRange],
    queryFn: () => apiRequest({ 
      path: "/api/reports/game-performance",
      method: "GET"
    })
  });
  
  // Fetch loyalty program analytics
  const { data: loyaltyData } = useQuery({
    queryKey: ['/api/reports/loyalty-analytics'],
    queryFn: () => apiRequest({ 
      path: "/api/reports/loyalty-analytics",
      method: "GET"
    })
  });

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dateRange,
          reportType: activeTab
        }),
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infinity-gaming-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
            <p className="text-muted-foreground">View business performance metrics</p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex space-x-2">
              <div className="grid gap-1">
                <p className="text-xs font-medium">Start Date</p>
                <input 
                  type="date" 
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="grid gap-1">
                <p className="text-xs font-medium">End Date</p>
                <input 
                  type="date" 
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </div>
            <Button onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="games">Game Performance</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">
                          KSh {reportData?.stats?.totalRevenue?.toLocaleString() || 0}
                        </div>
                        <div className="flex items-center text-sm text-green-500">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          +12.5%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">
                          {reportData?.stats?.activeSessionsCount || 0}
                        </div>
                        <div className="flex items-center text-sm text-red-500">
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          -3.2%
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Completed Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">
                          {reportData?.stats?.completedSessionsCount || 0}
                        </div>
                        <div className="flex items-center text-sm text-green-500">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          +8.1%
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Average Session Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">
                          KSh {reportData?.stats?.averageSessionValue?.toLocaleString() || 0}
                        </div>
                        <div className="flex items-center text-sm text-green-500">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          +5.3%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart className="h-5 w-5 mr-2 text-primary" />
                        Revenue by Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <Chart 
                        type="bar"
                        data={{
                          labels: reportData?.customerActivity?.map(d => new Date(d.date).toLocaleDateString()) || [],
                          datasets: [
                            {
                              label: 'Revenue',
                              data: reportData?.customerActivity?.map(d => d.revenue) || [],
                              backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2 text-primary" />
                        Payment Methods
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <Chart 
                        type="doughnut"
                        data={{
                          labels: reportData?.paymentMethods?.map(pm => pm.method) || [],
                          datasets: [
                            {
                              data: reportData?.paymentMethods?.map(pm => pm.count) || [],
                              backgroundColor: [
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(16, 185, 129, 0.8)'
                              ],
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-primary" />
                      Popular Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 font-medium">Game</th>
                            <th className="text-left py-3 font-medium">Sessions</th>
                            <th className="text-left py-3 font-medium">Revenue</th>
                            <th className="text-left py-3 font-medium">Avg. Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameData?.popularGames?.slice(0, 5).map((game, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-3">{game.name}</td>
                              <td className="py-3">{game.sessions}</td>
                              <td className="py-3">KSh {game.revenue.toLocaleString()}</td>
                              <td className="py-3">{game.avgDuration || '-'} min</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="revenue" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <LineChart className="h-5 w-5 mr-2 text-primary" />
                        Revenue Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-96">
                      <Chart 
                        type="line"
                        data={{
                          labels: reportData?.customerActivity?.map(d => new Date(d.date).toLocaleDateString()) || [],
                          datasets: [
                            {
                              label: 'Revenue',
                              data: reportData?.customerActivity?.map(d => d.revenue) || [],
                              borderColor: 'rgba(99, 102, 241, 1)',
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              fill: true,
                              tension: 0.4,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Amount (KSh)'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Date'
                              }
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        Revenue by Day of Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-96">
                      <Chart 
                        type="bar"
                        data={{
                          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                          datasets: [
                            {
                              label: 'Average Revenue',
                              data: [12000, 19000, 15000, 17000, 25000, 30000, 28000],
                              backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          indexAxis: 'y',
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-primary" />
                      Payment Methods Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <Chart 
                          type="pie"
                          data={{
                            labels: reportData?.paymentMethods?.map(pm => pm.method) || [],
                            datasets: [
                              {
                                data: reportData?.paymentMethods?.map(pm => pm.count) || [],
                                backgroundColor: [
                                  'rgba(99, 102, 241, 0.8)',
                                  'rgba(59, 130, 246, 0.8)',
                                  'rgba(16, 185, 129, 0.8)'
                                ],
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-4">Payment Methods</h3>
                        <div className="space-y-4">
                          {reportData?.paymentMethods?.map((method, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 bg-indigo-500`} style={{
                                  backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)'][i % 3]
                                }}></div>
                                <span>{method.method}</span>
                              </div>
                              <div className="flex space-x-4">
                                <span>{method.count} transactions</span>
                                <span className="font-medium">KSh {method.amount?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="games" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart className="h-5 w-5 mr-2 text-primary" />
                        Game Popularity vs Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-96">
                      <Chart 
                        type="bar"
                        data={{
                          labels: gameData?.popularGames?.map(g => g.name) || [],
                          datasets: [
                            {
                              label: 'Sessions',
                              data: gameData?.popularGames?.map(g => g.sessions) || [],
                              backgroundColor: 'rgba(99, 102, 241, 0.8)',
                              yAxisID: 'y',
                            },
                            {
                              label: 'Revenue (KSh)',
                              data: gameData?.popularGames?.map(g => g.revenue) || [],
                              backgroundColor: 'rgba(16, 185, 129, 0.8)',
                              type: 'line',
                              yAxisID: 'y1',
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Number of Sessions'
                              }
                            },
                            y1: {
                              beginAtZero: true,
                              position: 'right',
                              grid: {
                                drawOnChartArea: false,
                              },
                              title: {
                                display: true,
                                text: 'Revenue (KSh)'
                              }
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2 text-primary" />
                        Game Type Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-96">
                      <Chart 
                        type="doughnut"
                        data={{
                          labels: ['PS5', 'XBOX', 'PC', 'VR'],
                          datasets: [
                            {
                              data: [45, 25, 20, 10],
                              backgroundColor: [
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(249, 115, 22, 0.8)'
                              ],
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-primary" />
                      Game Performance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 font-medium">Game</th>
                            <th className="text-left py-3 font-medium">Sessions</th>
                            <th className="text-left py-3 font-medium">Total Revenue</th>
                            <th className="text-left py-3 font-medium">Avg. Session Value</th>
                            <th className="text-left py-3 font-medium">Avg. Duration</th>
                            <th className="text-left py-3 font-medium">Revenue/Hour</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameData?.gamePerformance?.slice(0, 10).map((game, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-3">{game.gameName}</td>
                              <td className="py-3">{game.sessionCount}</td>
                              <td className="py-3">KSh {game.totalRevenue.toLocaleString()}</td>
                              <td className="py-3">KSh {(game.totalRevenue / game.sessionCount).toFixed(0)}</td>
                              <td className="py-3">{game.averageDuration.toFixed(0)} min</td>
                              <td className="py-3">KSh {game.revenuePerHour.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loyalty" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {loyaltyData?.totalCustomers || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Customers with Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {loyaltyData?.customersWithPoints || 0}
                        <span className="text-sm text-muted-foreground ml-2">
                          ({loyaltyData?.totalCustomers ? Math.round(loyaltyData.customersWithPoints / loyaltyData.totalCustomers * 100) : 0}%)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Points Issued</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {loyaltyData?.totalPointsIssued?.toLocaleString() || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-primary" />
                        Loyalty Tier Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <Chart 
                        type="bar"
                        data={{
                          labels: loyaltyData?.loyaltySegments?.map(s => s.name) || [],
                          datasets: [
                            {
                              label: 'Customers',
                              data: loyaltyData?.loyaltySegments?.map(s => s.count) || [],
                              backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2 text-primary" />
                        Points Distribution by Tier
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <Chart 
                        type="pie"
                        data={{
                          labels: loyaltyData?.loyaltySegments?.map(s => s.name) || [],
                          datasets: [
                            {
                              data: loyaltyData?.loyaltySegments?.map(s => s.totalPoints) || [],
                              backgroundColor: [
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(249, 115, 22, 0.8)'
                              ],
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-primary" />
                      Loyalty Segment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 font-medium">Tier</th>
                            <th className="text-left py-3 font-medium">Point Range</th>
                            <th className="text-left py-3 font-medium">Customers</th>
                            <th className="text-left py-3 font-medium">Total Points</th>
                            <th className="text-left py-3 font-medium">Avg Points</th>
                            <th className="text-left py-3 font-medium">% of Customers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loyaltyData?.loyaltySegments?.map((segment, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-3">{segment.name}</td>
                              <td className="py-3">{segment.min} - {segment.max < Infinity ? segment.max : "∞"}</td>
                              <td className="py-3">{segment.count}</td>
                              <td className="py-3">{segment.totalPoints.toLocaleString()}</td>
                              <td className="py-3">{segment.avgPoints.toFixed(0)}</td>
                              <td className="py-3">
                                {loyaltyData.customersWithPoints 
                                  ? (segment.count / loyaltyData.customersWithPoints * 100).toFixed(1) 
                                  : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}
