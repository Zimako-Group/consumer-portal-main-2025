import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  ArrowDownTrayIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

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

const AdminReports: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AggregatedStats[]>([]);
  const [sortField, setSortField] = useState<keyof AggregatedStats>('month');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get references to all stats collections
        const commStatsRef = collection(db, 'communicationStats');
        const queryStatsRef = collection(db, 'customerQueryStats');
        const usageStatsRef = collection(db, 'usageStats');

        // Create queries for last 12 months
        const commQuery = query(commStatsRef, orderBy('month', 'desc'), limit(12));
        const queryQuery = query(queryStatsRef, orderBy('timestamp', 'desc'), limit(12));
        const usageQuery = query(usageStatsRef, orderBy('timestamp', 'desc'), limit(12));

        // Set up real-time listeners
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
  }, []);

  // Helper function to update stats when any collection changes
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

      // Convert map back to array and sort by month
      return Array.from(newStats.values())
        .sort((a, b) => b.month.localeCompare(a.month));
    });

    setIsLoading(false);
  };

  const handleSort = (field: keyof AggregatedStats) => {
    setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const sortedStats = [...stats].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortField] > b[sortField] ? 1 : -1;
    }
    return a[sortField] < b[sortField] ? 1 : -1;
  });

  const filteredStats = filterMonth === 'all' 
    ? sortedStats 
    : sortedStats.filter(stat => stat.month === filterMonth);

  const downloadPDF = (monthData: AggregatedStats) => {
    const doc = new jsPDF();
    const monthName = format(new Date(monthData.month), 'MMMM yyyy');
    
    // Title
    doc.setFontSize(20);
    doc.text('Monthly Municipal Statistics Report', 20, 20);
    doc.setFontSize(16);
    doc.text(monthName, 20, 30);

    // Communication Statistics
    doc.setFontSize(14);
    doc.text('Communication Statistics', 20, 45);
    doc.autoTable({
      startY: 50,
      head: [['Channel', 'Count', 'Percentage']],
      body: [
        ['SMS', monthData.sms.toString(), `${((monthData.sms / monthData.totalCommunications) * 100).toFixed(1)}%`],
        ['Email', monthData.email.toString(), `${((monthData.email / monthData.totalCommunications) * 100).toFixed(1)}%`],
        ['WhatsApp', monthData.whatsapp.toString(), `${((monthData.whatsapp / monthData.totalCommunications) * 100).toFixed(1)}%`],
        ['Total', monthData.totalCommunications.toString(), '100%']
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Customer Queries
    doc.setFontSize(14);
    doc.text('Customer Query Statistics', 20, doc.lastAutoTable!.finalY! + 15);
    doc.autoTable({
      startY: doc.lastAutoTable!.finalY! + 20,
      head: [['Query Type', 'Count', 'Percentage']],
      body: [
        ['Billing Queries', monthData.billingQueries.toString(), 
         `${((monthData.billingQueries / monthData.totalQueries) * 100).toFixed(1)}%`],
        ['Payment Arrangements', monthData.paymentArrangements.toString(),
         `${((monthData.paymentArrangements / monthData.totalQueries) * 100).toFixed(1)}%`],
        ['Total', monthData.totalQueries.toString(), '100%']
      ],
      theme: 'striped',
      headStyles: { fillColor: [236, 72, 153] },
    });

    // Usage Statistics
    doc.setFontSize(14);
    doc.text('Usage Statistics', 20, doc.lastAutoTable!.finalY! + 15);
    doc.autoTable({
      startY: doc.lastAutoTable!.finalY! + 20,
      head: [['Activity', 'Count', 'Percentage']],
      body: [
        ['Statement Downloads', monthData.statementDownloads.toString(),
         `${((monthData.statementDownloads / monthData.totalUsage) * 100).toFixed(1)}%`],
        ['Meter Readings', monthData.meterReadings.toString(),
         `${((monthData.meterReadings / monthData.totalUsage) * 100).toFixed(1)}%`],
        ['Total', monthData.totalUsage.toString(), '100%']
      ],
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    });

    // Summary
    doc.setFontSize(14);
    doc.text('Monthly Summary', 20, doc.lastAutoTable!.finalY! + 15);
    doc.autoTable({
      startY: doc.lastAutoTable!.finalY! + 20,
      head: [['Metric', 'Total']],
      body: [
        ['Total Communications', monthData.totalCommunications.toString()],
        ['Total Customer Queries', monthData.totalQueries.toString()],
        ['Total Usage Activities', monthData.totalUsage.toString()],
        ['Total Interactions', 
         (monthData.totalCommunications + monthData.totalQueries + monthData.totalUsage).toString()]
      ],
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });

    // Footer
    const timestamp = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`Generated on ${timestamp}`, 20, doc.internal.pageSize.height - 10);

    // Save the PDF
    doc.save(`municipal-report-${monthData.month}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme"></div>
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
    <div className="space-y-6 p-6 bg-white dark:bg-dark-card rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">
          Monthly Communication Statistics
        </h2>
        
        <div className="flex gap-2">
          <select
            className="rounded-md border border-gray-300 dark:border-dark-border px-3 py-2 text-sm"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {stats.map(stat => (
              <option key={stat.month} value={stat.month}>
                {format(new Date(stat.month), 'MMMM yyyy')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer>
          <BarChart data={filteredStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={(value) => format(new Date(value), 'MMM yyyy')}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'MMMM yyyy')}
            />
            <Legend />
            <Bar dataKey="sms" fill="#3B82F6" name="SMS" />
            <Bar dataKey="email" fill="#22C55E" name="Email" />
            <Bar dataKey="whatsapp" fill="#8B5CF6" name="WhatsApp" />
            <Bar dataKey="billingQueries" fill="#F59E0B" name="Billing Queries" />
            <Bar dataKey="paymentArrangements" fill="#F472B6" name="Payment Arrangements" />
            <Bar dataKey="statementDownloads" fill="#F7DC6F" name="Statement Downloads" />
            <Bar dataKey="meterReadings" fill="#8B9467" name="Meter Readings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead>
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('month')}
              >
                <div className="flex items-center gap-2">
                  Month
                  <ArrowsUpDownIcon className="w-4 h-4" />
                </div>
              </th>
              {['sms', 'email', 'whatsapp', 'billingQueries', 'paymentArrangements', 'statementDownloads', 'meterReadings'].map((field) => (
                <th 
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort(field as keyof AggregatedStats)}
                >
                  <div className="flex items-center gap-2">
                    {field.toUpperCase()}
                    <ArrowsUpDownIcon className="w-4 h-4" />
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
            {filteredStats.map((stat) => (
              <tr key={stat.month}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {format(new Date(stat.month), 'MMMM yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.sms.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.email.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.whatsapp.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.billingQueries.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.paymentArrangements.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.statementDownloads.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  {stat.meterReadings.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text-primary">
                  <button
                    onClick={() => downloadPDF(stat)}
                    className="text-theme dark:text-theme-dark hover:text-theme-dark flex items-center gap-1"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReports;