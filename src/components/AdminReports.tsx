import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  ArrowDownTrayIcon,
  ChartBarIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  ArrowPathIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';

interface MonthlyStats {
  month: string;
  sms: number;
  email: number;
  whatsapp: number;
  billingQueries: number;
  paymentArrangements: number;
  statementDownloads: number;
  meterReadings: number;
  timestamp?: Timestamp;
}

interface AggregatedStats extends MonthlyStats {
  totalCommunications: number;
  totalQueries: number;
  totalUsage: number;
}

const COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  pink: '#EC4899',
  yellow: '#F59E0B',
  indigo: '#6366F1'
};

const AdminReports: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AggregatedStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'communications' | 'queries' | 'usage'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const commStatsRef = collection(db, 'communicationStats');
        const queryStatsRef = collection(db, 'customerQueryStats');
        const usageStatsRef = collection(db, 'usageStats');

        const commQuery = query(commStatsRef, orderBy('month', 'desc'), limit(12));
        const queryQuery = query(queryStatsRef, orderBy('timestamp', 'desc'), limit(12));
        const usageQuery = query(usageStatsRef, orderBy('timestamp', 'desc'), limit(12));

        const unsubscribeCommunication = onSnapshot(commQuery, (snapshot) => {
          const commData = new Map();
          snapshot.docs.forEach((doc) => {
            commData.set(doc.id, doc.data());
          });
          updateStats(commData, 'communication');
        });

        const unsubscribeQueries = onSnapshot(queryQuery, (snapshot) => {
          const queryData = new Map();
          snapshot.docs.forEach((doc) => {
            queryData.set(doc.id, doc.data());
          });
          updateStats(queryData, 'queries');
        });

        const unsubscribeUsage = onSnapshot(usageQuery, (snapshot) => {
          const usageData = new Map();
          snapshot.docs.forEach((doc) => {
            usageData.set(doc.id, doc.data());
          });
          updateStats(usageData, 'usage');
        });

        return () => {
          unsubscribeCommunication();
          unsubscribeQueries();
          unsubscribeUsage();
        };
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics');
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [refreshKey]);

  const updateStats = (
    data: Map<string, any>,
    type: 'communication' | 'queries' | 'usage'
  ) => {
    setStats((currentStats) => {
      const newStats = new Map(
        currentStats.map((stat) => [stat.month, { ...stat }])
      );

      data.forEach((value, month) => {
        if (!newStats.has(month)) {
          newStats.set(month, {
            month,
            sms: 0,
            email: 0,
            whatsapp: 0,
            billingQueries: 0,
            paymentArrangements: 0,
            statementDownloads: 0,
            meterReadings: 0,
            totalCommunications: 0,
            totalQueries: 0,
            totalUsage: 0,
          });
        }

        const currentMonth = newStats.get(month)!;

        switch (type) {
          case 'communication':
            currentMonth.sms = value.sms || 0;
            currentMonth.email = value.email || 0;
            currentMonth.whatsapp = value.whatsapp || 0;
            currentMonth.totalCommunications = 
              currentMonth.sms + currentMonth.email + currentMonth.whatsapp;
            break;

          case 'queries':
            currentMonth.billingQueries = value.billingQueries || 0;
            currentMonth.paymentArrangements = value.paymentArrangements || 0;
            currentMonth.totalQueries = 
              currentMonth.billingQueries + currentMonth.paymentArrangements;
            break;

          case 'usage':
            currentMonth.statementDownloads = value.statementDownloads || 0;
            currentMonth.meterReadings = value.meterReadings || 0;
            currentMonth.totalUsage = 
              currentMonth.statementDownloads + currentMonth.meterReadings;
            break;
        }
      });

      return Array.from(newStats.values())
        .sort((a, b) => b.month.localeCompare(a.month));
    });

    setIsLoading(false);
  };

  const getLatestStats = () => {
    return stats[0] || {
      sms: 0,
      email: 0,
      whatsapp: 0,
      billingQueries: 0,
      paymentArrangements: 0,
      statementDownloads: 0,
      meterReadings: 0,
      totalCommunications: 0,
      totalQueries: 0,
      totalUsage: 0,
    };
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const latestStats = getLatestStats();
    const monthName = format(new Date(), 'MMMM yyyy');

    // Add your existing PDF generation code here
    doc.save(`municipal-report-${monthName}.pdf`);
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );

  const renderOverviewTab = () => {
    const latestStats = getLatestStats();
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Communications"
            value={latestStats.totalCommunications}
            icon={ChatBubbleLeftRightIcon}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Queries"
            value={latestStats.totalQueries}
            icon={DocumentTextIcon}
            color="bg-green-500"
          />
          <StatCard
            title="Statement Downloads"
            value={latestStats.statementDownloads}
            icon={ArrowDownTrayIcon}
            color="bg-purple-500"
          />
          <StatCard
            title="Meter Readings"
            value={latestStats.meterReadings}
            icon={ChartBarIcon}
            color="bg-pink-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Communication Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Communication Trends</h2>
            <div className="h-[300px]">
              <ReactApexChart
                options={{
                  chart: {
                    type: 'line',
                    toolbar: {
                      show: true
                    },
                    background: 'transparent'
                  },
                  stroke: {
                    curve: 'smooth',
                    width: 3
                  },
                  dataLabels: {
                    enabled: false
                  },
                  xaxis: {
                    categories: stats.map(stat => format(new Date(stat.month), 'MMM')),
                    labels: {
                      style: {
                        colors: '#718096'
                      }
                    }
                  },
                  yaxis: {
                    title: {
                      text: 'Messages',
                      style: {
                        color: '#718096'
                      }
                    },
                    labels: {
                      style: {
                        colors: '#718096'
                      }
                    }
                  },
                  colors: [COLORS.blue, COLORS.green, COLORS.purple],
                  tooltip: {
                    y: {
                      formatter: (value) => value.toLocaleString()
                    }
                  },
                  legend: {
                    position: 'bottom',
                    labels: {
                      colors: '#718096'
                    }
                  },
                  theme: {
                    mode: 'dark'
                  }
                }}
                series={[
                  {
                    name: 'SMS',
                    data: stats.map(stat => stat.sms)
                  },
                  {
                    name: 'Email',
                    data: stats.map(stat => stat.email)
                  },
                  {
                    name: 'WhatsApp',
                    data: stats.map(stat => stat.whatsapp)
                  }
                ]}
                type="line"
                height="100%"
              />
            </div>
          </div>

          {/* Query Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Query Distribution</h2>
            <div className="h-[300px]">
              <ReactApexChart
                options={{
                  chart: {
                    type: 'donut',
                    background: 'transparent'
                  },
                  labels: ['Billing Queries', 'Payment Arrangements'],
                  colors: [COLORS.yellow, COLORS.indigo],
                  legend: {
                    position: 'bottom',
                    labels: {
                      colors: '#718096'
                    }
                  },
                  dataLabels: {
                    enabled: true
                  },
                  tooltip: {
                    y: {
                      formatter: (value) => value.toLocaleString()
                    }
                  },
                  theme: {
                    mode: 'dark'
                  }
                }}
                series={[
                  getLatestStats().billingQueries,
                  getLatestStats().paymentArrangements
                ]}
                type="donut"
                height="100%"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommunicationsTab = () => {
    const communicationChartOptions: ApexOptions = {
      chart: {
        type: 'bar',
        stacked: false,
        toolbar: {
          show: true
        },
        background: 'transparent'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: stats.map(stat => format(new Date(stat.month), 'MMM yyyy')),
        labels: {
          style: {
            colors: '#718096'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Messages',
          style: {
            color: '#718096'
          }
        },
        labels: {
          style: {
            colors: '#718096'
          }
        }
      },
      colors: [COLORS.blue, COLORS.green, COLORS.purple],
      tooltip: {
        y: {
          formatter: (value) => value.toLocaleString()
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          colors: '#718096'
        }
      },
      theme: {
        mode: 'dark'
      }
    };

    const communicationChartSeries = [
      {
        name: 'SMS',
        data: stats.map(stat => stat.sms)
      },
      {
        name: 'Email',
        data: stats.map(stat => stat.email)
      },
      {
        name: 'WhatsApp',
        data: stats.map(stat => stat.whatsapp)
      }
    ];

    return (
      <div className="space-y-6">
        {/* Communication Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="SMS Messages"
            value={getLatestStats().sms}
            icon={PhoneIcon}
            color="bg-blue-500"
          />
          <StatCard
            title="Emails Sent"
            value={getLatestStats().email}
            icon={EnvelopeIcon}
            color="bg-green-500"
          />
          <StatCard
            title="WhatsApp Messages"
            value={getLatestStats().whatsapp}
            icon={ChatBubbleLeftRightIcon}
            color="bg-purple-500"
          />
        </div>

        {/* Communication Channels Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Communication Channel Usage</h2>
          <div className="h-[400px]">
            <ReactApexChart
              options={communicationChartOptions}
              series={communicationChartSeries}
              type="bar"
              height="100%"
            />
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Monthly Communication Comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SMS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.map((stat) => (
                  <tr key={stat.month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {format(new Date(stat.month), 'MMMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {stat.sms.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {stat.email.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {stat.whatsapp.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                      {stat.totalCommunications.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderQueriesTab = () => {
    const queryTrendsOptions: ApexOptions = {
      chart: {
        type: 'line',
        toolbar: {
          show: true
        },
        background: 'transparent'
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: stats.map(stat => format(new Date(stat.month), 'MMM yyyy')),
        labels: {
          style: {
            colors: '#718096'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Queries',
          style: {
            color: '#718096'
          }
        },
        labels: {
          style: {
            colors: '#718096'
          }
        }
      },
      colors: [COLORS.yellow, COLORS.indigo],
      tooltip: {
        y: {
          formatter: (value) => value.toLocaleString()
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          colors: '#718096'
        }
      },
      theme: {
        mode: 'dark'
      }
    };

    const queryTrendsSeries = [
      {
        name: 'Billing Queries',
        data: stats.map(stat => stat.billingQueries)
      },
      {
        name: 'Payment Arrangements',
        data: stats.map(stat => stat.paymentArrangements)
      }
    ];

    const queryDistributionOptions: ApexOptions = {
      chart: {
        type: 'donut',
        background: 'transparent'
      },
      labels: ['Billing Queries', 'Payment Arrangements'],
      colors: [COLORS.yellow, COLORS.indigo],
      legend: {
        position: 'bottom',
        labels: {
          colors: '#718096'
        }
      },
      dataLabels: {
        enabled: true
      },
      tooltip: {
        y: {
          formatter: (value) => value.toLocaleString()
        }
      },
      theme: {
        mode: 'dark'
      }
    };

    const queryDistributionSeries = [
      getLatestStats().billingQueries,
      getLatestStats().paymentArrangements
    ];

    return (
      <div className="space-y-6">
        {/* Query Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Billing Queries"
            value={getLatestStats().billingQueries}
            icon={CurrencyDollarIcon}
            color="bg-yellow-500"
          />
          <StatCard
            title="Payment Arrangements"
            value={getLatestStats().paymentArrangements}
            icon={CalendarDaysIcon}
            color="bg-indigo-500"
          />
        </div>

        {/* Query Trends Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Query Trends Over Time</h2>
          <div className="h-[400px]">
            <ReactApexChart
              options={queryTrendsOptions}
              series={queryTrendsSeries}
              type="line"
              height="100%"
            />
          </div>
        </div>

        {/* Query Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Query Distribution</h2>
            <div className="h-[300px]">
              <ReactApexChart
                options={queryDistributionOptions}
                series={queryDistributionSeries}
                type="donut"
                height="100%"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Monthly Query Summary</h2>
            <div className="overflow-y-auto max-h-[300px]">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Billing</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.map((stat) => (
                    <tr key={stat.month}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {format(new Date(stat.month), 'MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {stat.billingQueries.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {stat.paymentArrangements.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                        {stat.totalQueries.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsageTab = () => {
    const usageChartOptions: ApexOptions = {
      chart: {
        type: 'bar',
        stacked: false,
        toolbar: {
          show: true
        },
        background: 'transparent'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: stats.map(stat => format(new Date(stat.month), 'MMM yyyy')),
        labels: {
          style: {
            colors: '#718096'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Activities',
          style: {
            color: '#718096'
          }
        },
        labels: {
          style: {
            colors: '#718096'
          }
        }
      },
      colors: [COLORS.pink, COLORS.blue],
      tooltip: {
        y: {
          formatter: (value) => value.toLocaleString()
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          colors: '#718096'
        }
      },
      theme: {
        mode: 'dark'
      }
    };

    const usageChartSeries = [
      {
        name: 'Statement Downloads',
        data: stats.map(stat => stat.statementDownloads)
      },
      {
        name: 'Meter Readings',
        data: stats.map(stat => stat.meterReadings)
      }
    ];

    return (
      <div className="space-y-6">
        {/* Usage Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Statement Downloads"
            value={getLatestStats().statementDownloads}
            icon={ArrowDownTrayIcon}
            color="bg-pink-500"
          />
          <StatCard
            title="Meter Readings"
            value={getLatestStats().meterReadings}
            icon={ChartBarIcon}
            color="bg-blue-500"
          />
        </div>

        {/* Usage Trends Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Usage Activity Trends</h2>
          <div className="h-[400px]">
            <ReactApexChart
              options={usageChartOptions}
              series={usageChartSeries}
              type="bar"
              height="100%"
            />
          </div>
        </div>

        {/* Monthly Usage Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Monthly Usage Statistics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statement Downloads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Meter Readings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Activities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.map((stat) => (
                  <tr key={stat.month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {format(new Date(stat.month), 'MMMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {stat.statementDownloads.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {stat.meterReadings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                      {stat.totalUsage.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Municipal Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive overview of municipal operations and customer interactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'overview', label: 'Overview', icon: ChartPieIcon },
              { key: 'communications', label: 'Communications', icon: ChatBubbleLeftRightIcon },
              { key: 'queries', label: 'Queries', icon: DocumentTextIcon },
              { key: 'usage', label: 'Usage', icon: ChartBarIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'communications' && renderCommunicationsTab()}
          {activeTab === 'queries' && renderQueriesTab()}
          {activeTab === 'usage' && renderUsageTab()}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;