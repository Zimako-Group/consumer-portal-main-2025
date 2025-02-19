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
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, TrendingUp, TrendingDown, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { collection, getDocs, query, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import Modal from 'react-modal';
import AdminViewModal from './meter-readings/AdminViewModal';

Modal.setAppElement('#root');

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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MeterReading[]>([]);
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [selectedReading, setSelectedReading] = useState<MeterReading | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            info.getValue() === 'PENDING' 
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {info.getValue() || 'APPROVED'}
          </span>
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
    <div className="space-y-8">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search readings..."
            className="pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Total Readings</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalReadings.toLocaleString()}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Average Consumption</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats.averageConsumption.toFixed(2)}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Total Consumption</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalConsumption.toLocaleString()}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Pending Readings</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats.pendingReadings}
            </h3>
          </div>
        </div>
      )}

      {/* Loading State */}
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
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
            className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-5 w-5" />
          </button>
          <button
            className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Details Modal */}
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