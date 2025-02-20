import React, { useState, useMemo, useEffect } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, TrendingUp, TrendingDown, AlertTriangle, ArrowUpDown, Download, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { collection, getDocs, query, orderBy, Timestamp, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import Modal from 'react-modal';
import AdminViewModal from './meter-readings/AdminViewModal';
import { useTheme } from '../contexts/ThemeContext';
import ReactApexChart from 'react-apexcharts';

interface MeterReading {
  id?: string;
  accountNumber: string;
  accountHolder: string;
  address: string;
  meterNumber: string;
  meterType: string;
  tariffCode: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  currentReadingDate?: Date | Timestamp;
  previousReadingDate?: Date | Timestamp;
  status?: string;
  submittedBy?: string;
}

interface ConsumptionStats {
  totalReadings: number;
  averageConsumption: number;
  totalConsumption: number;
  pendingReadings: number;
}

const columnHelper = createColumnHelper<MeterReading>();

export default function AdminMeterReadings() {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MeterReading[]>([]);
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [selectedReading, setSelectedReading] = useState<MeterReading | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchAllMeterReadings = async () => {
      setIsLoading(true);
      try {
        const allReadings: MeterReading[] = [];
        
        // Get all months from January 2024 to current month
        const months = [];
        const currentDate = new Date();
        const startDate = new Date(2024, 0); // Start from January 2024
        
        let currentMonth = new Date(startDate);
        while (currentMonth <= currentDate) {
          months.push({
            year: currentMonth.getFullYear().toString(),
            month: (currentMonth.getMonth() + 1).toString().padStart(2, '0')
          });
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        // Fetch data for each month
        for (const { year, month } of months) {
          const meterReadingsRef = collection(db, 'meterReadings', year, month);
          const q = query(meterReadingsRef);
          
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const reading: MeterReading = {
              id: doc.id,
              accountNumber: data.AccountNo,
              accountHolder: data.AccountHolder,
              address: data.Address,
              meterNumber: data.MeterNumber,
              meterType: data.MeterType,
              tariffCode: data.TariffCode,
              previousReading: data.PrevRead,
              currentReading: data.CurrRead,
              consumption: data.Consumption,
              currentReadingDate: data.CurrReadDate ? new Date(
                data.CurrReadDate.substring(0, 4) + '-' +
                data.CurrReadDate.substring(4, 6) + '-' +
                data.CurrReadDate.substring(6, 8)
              ) : undefined,
              previousReadingDate: data.PrevReadDate ? new Date(
                data.PrevReadDate.substring(0, 4) + '-' +
                data.PrevReadDate.substring(4, 6) + '-' +
                data.PrevReadDate.substring(6, 8)
              ) : undefined,
              status: data.Status
            };
            allReadings.push(reading);
          });
        }

        setData(allReadings);

        // Calculate stats
        if (allReadings.length > 0) {
          const totalConsumption = allReadings.reduce((sum, reading) => sum + reading.consumption, 0);
          const avgConsumption = totalConsumption / allReadings.length;
          const pendingCount = allReadings.filter(reading => reading.status === 'PENDING').length;

          setStats({
            totalReadings: allReadings.length,
            averageConsumption: avgConsumption,
            totalConsumption: totalConsumption,
            pendingReadings: pendingCount
          });
        }
      } catch (error) {
        console.error('Error fetching meter readings:', error);
        toast.error('Failed to fetch meter readings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMeterReadings();
  }, []);

  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Safe date parsing function
    const parseDate = (dateInput: any) => {
      try {
        if (!dateInput) return null;
        
        // Handle Firestore Timestamp
        if (dateInput?.toDate instanceof Function) {
          return dateInput.toDate();
        }
        
        // Handle Date object
        if (dateInput instanceof Date) {
          return dateInput;
        }
        
        // Handle string date
        if (typeof dateInput === 'string') {
          const parsedDate = new Date(dateInput);
          return !isNaN(parsedDate.getTime()) ? parsedDate : null;
        }
        
        return null;
      } catch {
        return null;
      }
    };

    // Filter and sort valid data entries
    const validData = data
      .filter(reading => parseDate(reading.currentReadingDate) !== null)
      .sort((a, b) => {
        const dateA = parseDate(a.currentReadingDate)!;
        const dateB = parseDate(b.currentReadingDate)!;
        return dateA.getTime() - dateB.getTime();
      });

    if (!validData.length) return null;

    return {
      options: {
        chart: {
          type: 'area',
          toolbar: {
            show: false
          },
          background: 'transparent',
          zoom: {
            enabled: true
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth',
          width: 2
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.3,
            stops: [0, 90, 100]
          }
        },
        theme: {
          mode: isDarkMode ? 'dark' : 'light'
        },
        colors: ['#2563eb'],
        xaxis: {
          categories: validData.map(reading => {
            const date = parseDate(reading.currentReadingDate);
            return date ? format(date, 'dd/MM/yyyy') : 'Invalid Date';
          }),
          labels: {
            style: {
              colors: isDarkMode ? '#fff' : '#000'
            },
            rotate: -45,
            rotateAlways: true,
            trim: false,
            minHeight: 60
          },
          axisBorder: {
            show: false
          },
          axisTicks: {
            show: false
          },
          tickAmount: Math.min(validData.length, 10)
        },
        yaxis: {
          labels: {
            style: {
              colors: isDarkMode ? '#fff' : '#000'
            },
            formatter: (value: number) => value.toFixed(0)
          }
        },
        grid: {
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          strokeDashArray: 4,
          xaxis: {
            lines: {
              show: true
            }
          },
          yaxis: {
            lines: {
              show: true
            }
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          theme: isDarkMode ? 'dark' : 'light',
          y: {
            formatter: (value: number) => value.toFixed(2)
          },
          x: {
            show: true,
            format: 'dd/MM/yyyy'
          }
        }
      },
      series: [{
        name: 'Consumption',
        data: validData.map(reading => reading.consumption)
      }]
    };
  }, [data, isDarkMode]);

  const StatusIndicator = ({ status, consumption, previousConsumption }: { status: string, consumption: number, previousConsumption?: number }) => {
    const trend = previousConsumption
      ? consumption > previousConsumption
        ? <TrendingUp className="h-4 w-4 text-red-500" />
        : <TrendingDown className="h-4 w-4 text-green-500" />
      : null;

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'PENDING' 
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
            : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
        }`}>
          {status || 'APPROVED'}
        </span>
        {trend}
      </div>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['Account Number', 'Meter Number', 'Current Reading', 'Consumption', 'Status', 'Date'].join(','),
      ...data.map(reading => [
        reading.accountNumber,
        reading.meterNumber,
        reading.currentReading,
        reading.consumption,
        reading.status || 'APPROVED',
        reading.currentReadingDate instanceof Date 
          ? format(reading.currentReadingDate, 'yyyy-MM-dd')
          : format(reading.currentReadingDate.toDate(), 'yyyy-MM-dd')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meter-readings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('accountNumber', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Account Number
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
      }),
      columnHelper.accessor('meterNumber', {
        header: 'Meter Number',
      }),
      columnHelper.accessor('meterType', {
        header: 'Meter Type',
      }),
      columnHelper.accessor('currentReading', {
        header: 'Current Reading',
        cell: info => info.getValue()?.toLocaleString() || 'N/A',
      }),
      columnHelper.accessor('consumption', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Consumption
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: info => info.getValue()?.toLocaleString() || 'N/A',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => (
          <StatusIndicator 
            status={info.getValue() || 'APPROVED'} 
            consumption={info.row.original.consumption} 
            previousConsumption={info.row.original.previousConsumption} 
          />
        ),
      }),
    ],
    []
  );

  useEffect(() => {
    if (!currentUser) {
      toast.error('You must be logged in to view meter readings');
      return;
    }

    setIsLoading(true);
    const readingsRef = collection(db, 'meterReadings');
    const q = query(readingsRef, orderBy('currentReadingDate', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const readings: MeterReading[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          readings.push({
            id: doc.id,
            accountNumber: data.accountNumber,
            accountHolder: data.accountHolder,
            address: data.address,
            meterNumber: data.meterNumber,
            meterType: data.meterType,
            tariffCode: data.tariffCode,
            previousReading: typeof data.previousReading === 'string' ? parseFloat(data.previousReading) : data.previousReading,
            currentReading: typeof data.currentReading === 'string' ? parseFloat(data.currentReading) : data.currentReading,
            consumption: typeof data.consumption === 'string' ? parseFloat(data.consumption) : data.consumption,
            currentReadingDate: data.currentReadingDate instanceof Timestamp ? data.currentReadingDate.toDate() : data.currentReadingDate,
            previousReadingDate: data.previousReadingDate instanceof Timestamp ? data.previousReadingDate.toDate() : data.previousReadingDate,
            status: data.status,
            submittedBy: data.submittedBy
          });
        });
        
        setData(readings);
        calculateStats(readings);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching meter readings:', error);
        toast.error('Failed to load meter readings');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const calculateStats = (readings: MeterReading[]) => {
    const stats = {
      totalReadings: readings.length,
      averageConsumption: 0,
      totalConsumption: 0,
      pendingReadings: readings.filter(r => r.status === 'PENDING').length,
    };

    const consumptions = readings.map(r => r.consumption || 0);
    stats.totalConsumption = consumptions.reduce((a, b) => a + b, 0);
    stats.averageConsumption = stats.totalConsumption / (readings.length || 1);

    setStats(stats);
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <div className={`space-y-8 p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Meter Readings Management</h1>
          <p className="text-blue-100 text-sm">Monitor and manage all meter readings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} h-4 w-4`} />
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search readings..."
            className={`w-full pl-9 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'year')}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-6 rounded-xl shadow-sm border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Readings
                </p>
                <h3 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalReadings.toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900">
                <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Average Consumption
                </p>
                <h3 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.averageConsumption.toFixed(2)}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900">
                <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Consumption
                </p>
                <h3 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalConsumption.toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900">
                <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Pending Readings
                </p>
                <h3 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.pendingReadings}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900">
                <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consumption Chart */}
      {chartData && (
        <div className={`p-6 rounded-xl shadow-sm border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Consumption Trend
          </h3>
          <ReactApexChart
            options={chartData.options}
            series={chartData.series}
            type="area"
            height={350}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-theme" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedReading(row.original);
                      setIsModalOpen(true);
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className={`flex items-center justify-between px-4 py-3 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Page{' '}
            <span className="font-medium">
              {table.getState().pagination.pageIndex + 1}
            </span>{' '}
            of{' '}
            <span className="font-medium">{table.getPageCount()}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`p-2 border rounded ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className={`h-4 w-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            className={`p-2 border rounded ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className={`h-4 w-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            className={`p-2 border rounded ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className={`h-4 w-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            className={`p-2 border rounded ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className={`h-4 w-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => {
          setIsModalOpen(false);
          setSelectedReading(null);
        }}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
        contentLabel="Meter Reading Details"
      >
        {selectedReading && (
          <AdminViewModal
            reading={selectedReading}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedReading(null);
            }}
            onStatusUpdate={() => {
              toast.success('Reading status updated successfully');
            }}
          />
        )}
      </Modal>
    </div>
  );
}