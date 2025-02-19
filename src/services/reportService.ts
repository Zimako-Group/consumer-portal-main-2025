import { CustomerData } from './customerService';
import { ApexOptions } from 'apexcharts';

export interface ReportMetrics {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  totalOutstandingBalance: number;
  averageOutstandingBalance: number;
  customersByStatus: { [key: string]: number };
  outstandingBalanceRanges: {
    range: string;
    count: number;
    totalAmount: number;
  }[];
  recentPaymentStats: {
    totalPayments: number;
    averagePayment: number;
    customersWithPayments: number;
  };
}

export interface ChartConfigs {
  statusChart: ApexOptions;
  balanceChart: ApexOptions;
}

export const generateCustomerReport = (customers: CustomerData[]): ReportMetrics => {
  const metrics: ReportMetrics = {
    totalCustomers: customers.length,
    activeCustomers: 0,
    inactiveCustomers: 0,
    totalOutstandingBalance: 0,
    averageOutstandingBalance: 0,
    customersByStatus: {},
    outstandingBalanceRanges: [],
    recentPaymentStats: {
      totalPayments: 0,
      averagePayment: 0,
      customersWithPayments: 0,
    },
  };

  // Balance ranges for categorization
  const balanceRanges = [
    { min: 0, max: 1000, label: 'R0 - R1,000' },
    { min: 1000, max: 5000, label: 'R1,000 - R5,000' },
    { min: 5000, max: 10000, label: 'R5,000 - R10,000' },
    { min: 10000, max: 50000, label: 'R10,000 - R50,000' },
    { min: 50000, max: Infinity, label: 'R50,000+' },
  ];

  // Initialize balance ranges
  const balanceRangeData = balanceRanges.map(range => ({
    range: range.label,
    count: 0,
    totalAmount: 0,
  }));

  // Calculate total outstanding balance separately first
  metrics.totalOutstandingBalance = customers.reduce((total, customer) => {
    const balance = parseFloat(customer.outstandingTotalBalance?.toString() || '0');
    return total + (isNaN(balance) ? 0 : balance);
  }, 0);

  let totalPayments = 0;
  let customersWithPayments = 0;

  customers.forEach(customer => {
    // Count by status
    const status = customer.accountStatus || 'Unknown';
    metrics.customersByStatus[status] = (metrics.customersByStatus[status] || 0) + 1;

    // Active/Inactive counts
    if (status.toLowerCase() === 'active') {
      metrics.activeCustomers++;
    } else {
      metrics.inactiveCustomers++;
    }

    // Outstanding balance for ranges
    const balance = parseFloat(customer.outstandingTotalBalance?.toString() || '0');
    if (!isNaN(balance)) {
      // Categorize balance ranges
      const rangeIndex = balanceRanges.findIndex(
        range => balance >= range.min && balance < range.max
      );
      if (rangeIndex !== -1) {
        balanceRangeData[rangeIndex].count++;
        balanceRangeData[rangeIndex].totalAmount += balance;
      }
    }

    // Payment statistics
    if (customer.lastPaymentAmount) {
      const payment = parseFloat(customer.lastPaymentAmount.toString());
      if (!isNaN(payment)) {
        totalPayments += payment;
        customersWithPayments++;
      }
    }
  });

  // Calculate averages
  metrics.averageOutstandingBalance = 
    customers.length > 0 ? metrics.totalOutstandingBalance / customers.length : 0;

  metrics.recentPaymentStats = {
    totalPayments,
    averagePayment: customersWithPayments > 0 ? totalPayments / customersWithPayments : 0,
    customersWithPayments,
  };

  metrics.outstandingBalanceRanges = balanceRangeData;

  return metrics;
};

export const generateChartConfigs = (metrics: ReportMetrics): ChartConfigs => {
  // Customer Status Chart (Pie) - Simplified to just Active/Inactive
  const statusChart: ApexOptions = {
    series: [metrics.activeCustomers, metrics.inactiveCustomers],
    chart: {
      type: 'pie',
      height: 350,
    },
    labels: ['ACTIVE', 'INACTIVE'],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 300
        },
        legend: {
          position: 'bottom'
        }
      }
    }],
    colors: ['#4CAF50', '#f44336'], // Green for active, red for inactive
    tooltip: {
      y: {
        formatter: (value) => value.toString()
      }
    },
  };

  // Outstanding Balance Distribution Chart (Bar)
  const balanceChart: ApexOptions = {
    series: [{
      name: 'Customers',
      data: metrics.outstandingBalanceRanges.map(range => range.count)
    }],
    chart: {
      type: 'bar',
      height: 350
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
        columnWidth: '55%',
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
      categories: metrics.outstandingBalanceRanges.map(range => range.range),
      labels: {
        rotate: -45,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Customers'
      }
    },
    fill: {
      opacity: 1,
      colors: ['#2196F3']
    },
    tooltip: {
      y: {
        formatter: (value) => value.toString()
      }
    }
  };

  return {
    statusChart,
    balanceChart,
  };
};