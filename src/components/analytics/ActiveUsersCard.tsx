import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ApexOptions } from 'apexcharts';
import { getRecentActivities, getBiweeklyUniqueUsers, getActivityDataByDate } from '../../utils/activityTracker';
import { format, subDays } from 'date-fns';

type TimeRange = '7d' | '30d' | '90d';

const ActiveUsersCard = () => {
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('7d');
  const [uniqueUsers, setUniqueUsers] = useState(0);

  useEffect(() => {
    // Initial fetch and setup real-time listener for unique users
    const fetchUniqueUsers = async () => {
      const count = await getBiweeklyUniqueUsers();
      setUniqueUsers(count);
    };

    fetchUniqueUsers();

    // Set up real-time listener for login activities
    const unsubscribeLogins = onSnapshot(
      query(
        collection(db, 'userActivities'),
        where('action', '==', 'login'),
        orderBy('timestamp', 'desc'),
        limit(1)
      ),
      () => {
        fetchUniqueUsers(); // Refresh unique users count when new login occurs
      }
    );

    return () => unsubscribeLogins();
  }, []);

  useEffect(() => {
    const fetchActivityData = async () => {
      const daysRange = getDaysRange(selectedRange);
      const days = Array.from({ length: daysRange }, (_, i) => {
        const date = subDays(new Date(), i);
        return format(date, 'yyyy-MM-dd');
      }).reverse();

      // Get activity data by date
      const activityByDate = await getActivityDataByDate(daysRange);
      
      // Format data for chart
      const formattedData = days.map(date => ({
        date: format(new Date(date), 'MMM dd'),
        count: activityByDate[date] || 0
      }));

      setActivityData(formattedData);

      // Get recent activities for click and item counts
      const activities = await getRecentActivities(
        selectedRange === '7d' ? 'week' : selectedRange === '30d' ? 'month' : 'month',
        1000
      );

      const totalClicksCount = activities.filter((a: any) => 
        a.action === 'click' || a.action === 'navigation'
      ).length;

      const totalItemsCount = activities.filter((a: any) => 
        a.action === 'view' || a.action === 'download'
      ).length;

      setTotalClicks(totalClicksCount);
      setTotalItems(totalItemsCount);
    };

    fetchActivityData();

    // Set up real-time listener for activity updates
    const unsubscribeActivities = onSnapshot(
      query(
        collection(db, 'userActivities'),
        orderBy('timestamp', 'desc'),
        limit(1)
      ),
      () => {
        fetchActivityData(); // Refresh data when new activity is added
      }
    );

    return () => {
      unsubscribeActivities();
    };
  }, [selectedRange]);

  // Helper function to get number of days based on selected range
  const getDaysRange = (range: TimeRange): number => {
    switch (range) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 7;
    }
  };

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: false,
      },
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '40%',
      }
    },
    stroke: {
      colors: ['transparent'],
      width: 4
    },
    colors: ['#0EA5E9'],
    grid: {
      show: true,
      borderColor: '#1F2937',
      strokeDashArray: 5,
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: activityData.map(data => data.date),
      labels: {
        style: {
          colors: '#9CA3AF',
          fontSize: '12px'
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9CA3AF',
          fontSize: '12px'
        },
        formatter: function (value) {
          return value.toLocaleString();
        }
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: function (value) {
          return value.toLocaleString() + ' activities';
        }
      }
    }
  };

  const series = [{
    name: 'User Activities',
    data: activityData.map(data => data.count)
  }];

  return (
    <div className="col-span-full bg-[#1a1f2e] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Active Users</h3>
          <p className="text-sm text-gray-400">Last two weeks</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setSelectedRange('7d')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedRange === '7d'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setSelectedRange('30d')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedRange === '30d'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setSelectedRange('90d')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedRange === '90d'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              90D
            </button>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{uniqueUsers.toLocaleString()}</span>
          <span className="text-sm font-medium text-green-500">+2.5%</span>
        </div>
        
        <div className="h-[300px] w-full">
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="bar"
            height="100%"
            width="100%"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-8 pt-6 border-t border-gray-800">
        <div>
          <p className="text-sm text-gray-400 mb-1">Users</p>
          <p className="text-lg font-semibold text-white">{uniqueUsers.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Clicks</p>
          <p className="text-lg font-semibold text-white">{totalClicks.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Items</p>
          <p className="text-lg font-semibold text-white">{totalItems.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersCard;
