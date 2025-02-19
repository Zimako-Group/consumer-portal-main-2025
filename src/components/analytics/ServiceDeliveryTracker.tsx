import React, { useState, useEffect, lazy, Suspense } from 'react';
import { db } from '../../firebaseConfig';
import { onSnapshot, doc } from 'firebase/firestore';
import { getCurrentMonthStats } from '../../utils/communicationStats';
import { getCurrentMonthStats as getQueryStats } from '../../utils/customerQueryStats';

// Dynamically import react-apexcharts
const Chart = lazy(() => import('react-apexcharts'));

interface MessageMetrics {
  channel: string;
  value: number;
}

interface QueryStats {
  billingQueries: number;
  paymentArrangements: number;
}

const CHANNEL_INDICATORS = [
  { name: 'SMS', color: '#3b82f6' },      // Blue
  { name: 'Email', color: '#22c55e' },    // Green
  { name: 'WhatsApp', color: '#8b5cf6' }, // Purple
];

const QUERY_COLORS = ['#ec4899', '#14b8a6']; // Pink, Teal

export default function ServiceDeliveryTracker() {
  const [messageMetrics, setMessageMetrics] = useState<MessageMetrics[]>([]);
  const [queryStats, setQueryStats] = useState<QueryStats>({
    billingQueries: 0,
    paymentArrangements: 0
  });

  useEffect(() => {
    // Get initial stats
    getCurrentMonthStats().then((stats) => {
      if (stats) {
        setMessageMetrics([
          { channel: 'SMS', value: stats.sms },
          { channel: 'Email', value: stats.email },
          { channel: 'WhatsApp', value: stats.whatsapp },
        ]);
      }
    });

    // Set up real-time listener for communication stats
    const currentDate = new Date();
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    const unsubscribe = onSnapshot(
      doc(db, 'communicationStats', monthKey),
      (doc) => {
        if (doc.exists()) {
          const stats = doc.data();
          setMessageMetrics([
            { channel: 'SMS', value: stats.sms || 0 },
            { channel: 'Email', value: stats.email || 0 },
            { channel: 'WhatsApp', value: stats.whatsapp || 0 },
          ]);
        }
      },
      (error) => {
        console.error('Error listening to stats:', error);
      }
    );

    // Set up real-time listener for query stats
    const queryStatsUnsubscribe = onSnapshot(
      doc(db, 'customerQueryStats', monthKey),
      (doc) => {
        if (doc.exists()) {
          const stats = doc.data() as QueryStats;
          setQueryStats({
            billingQueries: stats.billingQueries || 0,
            paymentArrangements: stats.paymentArrangements || 0
          });
        }
      },
      (error) => {
        console.error('Error listening to query stats:', error);
      }
    );

    // Check for month change
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (tomorrow.getMonth() !== now.getMonth()) {
      // Set timeout to refresh at midnight on the first of the month
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      const timeout = setTimeout(() => {
        // Refresh both stats
        Promise.all([
          getCurrentMonthStats(),
          getQueryStats()
        ]).then(([commStats, qStats]) => {
          if (commStats) {
            setMessageMetrics([
              { channel: 'SMS', value: commStats.sms },
              { channel: 'Email', value: commStats.email },
              { channel: 'WhatsApp', value: commStats.whatsapp },
            ]);
          }
          if (qStats) {
            setQueryStats(qStats);
          }
        });
      }, timeUntilMidnight);

      return () => {
        clearTimeout(timeout);
        unsubscribe();
        queryStatsUnsubscribe();
      };
    }

    return () => {
      unsubscribe();
      queryStatsUnsubscribe();
    };
  }, []);

  const queryChartOptions = {
    chart: {
      type: 'pie',
      height: 350,
      toolbar: { show: false }
    },
    labels: ['Billing Queries', 'Payment Arrangements'],
    colors: QUERY_COLORS,
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      labels: {
        colors: undefined,
        useSeriesColors: false
      },
      markers: {
        width: 12,
        height: 12,
        strokeWidth: 0,
        strokeColor: '#fff',
        radius: 12
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: { width: 200 },
        legend: { position: 'bottom' }
      }
    }],
    tooltip: {
      y: {
        formatter: (val: number) => val.toString()
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col space-y-4">
          <h3 className="text-lg font-semibold text-center">Distribution Stats (current month)</h3>
          <div className="flex items-center justify-center space-x-8">
            {CHANNEL_INDICATORS.map((channel) => (
              <div key={channel.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: channel.color }}
                ></div>
                <span className="text-sm font-medium">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
        <Suspense fallback={<div>Loading chart...</div>}>
          <Chart
            options={{
              chart: {
                type: 'bar',
                height: 350,
                toolbar: {
                  show: false
                }
              },
              colors: ['#3b82f6', '#22c55e', '#8b5cf6'], // Blue, Green, Purple
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: '55%',
                },
              },
              dataLabels: {
                enabled: false
              },
              xaxis: {
                categories: messageMetrics.map(item => item.channel),
              },
              yaxis: {
                title: {
                  text: 'Messages'
                }
              },
              tooltip: {
                y: {
                  formatter: (val: number) => val.toString()
                }
              }
            }}
            series={[{
              name: 'Messages',
              data: messageMetrics.map(item => item.value)
            }]}
            type="bar"
            height={350}
          />
        </Suspense>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col space-y-4">
          <h3 className="text-lg font-semibold text-center">
            Payment Arrangements vs Billing Queries
          </h3>
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: QUERY_COLORS[0] }}
              ></div>
              <span className="text-sm font-medium">Billing Queries</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: QUERY_COLORS[1] }}
              ></div>
              <span className="text-sm font-medium">Payment Arrangements</span>
            </div>
          </div>
        </div>
        <Suspense fallback={<div>Loading chart...</div>}>
          <Chart
            options={queryChartOptions}
            series={[
              queryStats.billingQueries,
              queryStats.paymentArrangements
            ]}
            type="pie"
            height={350}
          />
        </Suspense>
      </div>
    </div>
  );
}