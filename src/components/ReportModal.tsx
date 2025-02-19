import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ReportMetrics, ChartConfigs } from '../services/reportService';
import { FileDown } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: ReportMetrics;
  chartConfigs: ChartConfigs;
  onExportReport: () => void;
  isExporting: boolean;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'R0.00';
  }
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-ZA').format(value);
};

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  metrics,
  chartConfigs,
  onExportReport,
  isExporting,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Customer Analytics Report
                </Dialog.Title>

                <div className="flex justify-end mb-4">
                  <button
                    onClick={onExportReport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    <FileDown className="h-5 w-5" />
                    {isExporting ? 'Exporting...' : 'Export Report'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Key Metrics */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3">Key Metrics</h4>
                    <div className="space-y-2">
                      <p>Total Customers: {formatNumber(metrics.totalCustomers)}</p>
                      <p>Active Customers: {formatNumber(metrics.activeCustomers)}</p>
                      <p>Inactive Customers: {formatNumber(metrics.inactiveCustomers)}</p>
                      <p>Total Outstanding: {formatCurrency(metrics.totalOutstandingBalance)}</p>
                      <p>Average Outstanding: {formatCurrency(metrics.averageOutstandingBalance)}</p>
                    </div>
                  </div>

                  {/* Payment Statistics */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3">Payment Statistics</h4>
                    <div className="space-y-2">
                      <p>Total Payments: {formatCurrency(metrics.recentPaymentStats?.totalPayments)}</p>
                      <p>Average Payment: {formatCurrency(metrics.recentPaymentStats?.averagePayment)}</p>
                      <p>Customers with Payments: {formatNumber(metrics.recentPaymentStats?.customersWithPayments)}</p>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h4 className="font-medium text-gray-700 mb-3">Customer Status Distribution</h4>
                    <div className="h-64">
                      <ReactApexChart
                        options={chartConfigs.statusChart}
                        series={chartConfigs.statusChart.series}
                        type="pie"
                        height={350}
                      />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow">
                    <h4 className="font-medium text-gray-700 mb-3">Outstanding Balance Distribution</h4>
                    <div className="h-64">
                      <ReactApexChart
                        options={chartConfigs.balanceChart}
                        series={chartConfigs.balanceChart.series}
                        type="bar"
                        height={350}
                      />
                    </div>
                  </div>
                </div>

                {/* Outstanding Balance Details */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-3">Outstanding Balance Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Range</th>
                          <th className="px-4 py-2 text-left">Customers</th>
                          <th className="px-4 py-2 text-left">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.outstandingBalanceRanges.map((range, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">{range.range}</td>
                            <td className="px-4 py-2">{formatNumber(range.count)}</td>
                            <td className="px-4 py-2">{formatCurrency(range.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ReportModal;