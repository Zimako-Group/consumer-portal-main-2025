import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { format, differenceInHours } from 'date-fns';
import { Search, Filter, MoreVertical, X, ChevronLeft, ChevronRight, User, Info } from 'lucide-react';
import clsx from 'clsx';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import QueryAssignment from './QueryAssignment';

interface Query {
  id: string;
  referenceId: string;
  accountNumber: string;
  queryType: string;
  submissionDate: string;
  status: 'Open' | 'Active' | 'Resolved';
  description: string;
  customerName: string;
  contactNumber: string;
  resolutionMessage?: string;
  resolutionDate?: string;
  resolvedBy?: string;
  lastUpdated?: string;
  updatedBy?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedAt?: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  department: string;
}

const columnHelper = createColumnHelper<Query>();

const QueryManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Active' | 'Resolved'>('All');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [sorting, setSorting] = useState([{ id: 'submissionDate', desc: true }]);
  const [metrics, setMetrics] = useState<Array<{
    date: string;
    queryCount: number;
    avgResolutionDays: number | null;
  }>>([]);
  const [selectedRange, setSelectedRange] = useState<'7D' | '30D' | '3M' | '6M' | '12M'>('30D');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Query['status']>('Open');
  const { userData } = useAuth();
  const hasAccess = userData?.role === 'admin' || userData?.role === 'superadmin';

  // Fetch current user's role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role || '');
          console.log('Current user role:', userData.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [currentUser]);

  // Calculate and update metrics whenever queries or selected range changes
  useEffect(() => {
    const calculateMetrics = () => {
      const getDaysForRange = (range: '7D' | '30D' | '3M' | '6M' | '12M'): number => {
        switch (range) {
          case '7D': return 7;
          case '30D': return 30;
          case '3M': return 90;
          case '6M': return 180;
          case '12M': return 365;
          default: return 30;
        }
      };

      const daysToShow = getDaysForRange(selectedRange);
      const dateRange = [...Array(daysToShow)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (daysToShow - 1 - i));
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
      });

      // First, get all resolved queries
      const allResolvedQueries = queries.filter(q => q.status === 'Resolved' && q.resolutionDate);
      
      const newMetrics = dateRange.map(date => {
        // Get queries submitted on this date
        const submittedOnDate = queries.filter(q => {
          const queryDate = new Date(q.submissionDate);
          queryDate.setHours(0, 0, 0, 0);
          return queryDate.toISOString().split('T')[0] === date;
        });

        // Calculate resolution metrics
        const resolvedOnDate = allResolvedQueries.filter(q => 
          new Date(q.resolutionDate!).toISOString().split('T')[0] === date
        );

        let avgResolutionDays = 0;
        if (resolvedOnDate.length > 0) {
          const totalDays = resolvedOnDate.reduce((acc, q) => {
            const submissionDate = new Date(q.submissionDate);
            const resolutionDate = new Date(q.resolutionDate!);
            const diffTime = Math.abs(resolutionDate.getTime() - submissionDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return acc + diffDays;
          }, 0);
          avgResolutionDays = Number((totalDays / resolvedOnDate.length).toFixed(1));
        }

        return {
          date,
          queryCount: submittedOnDate.length,
          avgResolutionDays: avgResolutionDays || null
        };
      });

      setMetrics(newMetrics);
    };

    calculateMetrics();
  }, [queries, selectedRange]); // Recalculate whenever queries or selected range change

  // Add debug logging for queries state
  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    const todayQueries = queries.filter(q => {
      const queryDate = new Date(q.submissionDate).toISOString().split('T')[0];
      return queryDate === todayDate;
    });
    
    console.log('All queries:', queries.length);
    console.log('Today\'s queries from main state:', {
      date: todayDate,
      count: todayQueries.length,
      queries: todayQueries.map(q => ({
        id: q.id,
        submissionDate: q.submissionDate,
        status: q.status
      }))
    });
  }, [queries]);

  // Fetch queries with real-time updates
  useEffect(() => {
    if (!currentUser || !hasAccess) {
      toast.error('Unauthorized access');
      return;
    }

    console.log('Setting up queries listener');
    const queriesRef = collection(db, 'queries');
    const unsubscribe = onSnapshot(queriesRef, 
      (snapshot) => {
        const queriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Query[];
        console.log('Realtime update received:', queriesData.length, 'queries');
        setQueries(queriesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error in realtime listener:', error);
        toast.error('Failed to get realtime updates');
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up queries listener');
      unsubscribe();
    };
  }, [currentUser, hasAccess]);

  // Fetch admin users
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const adminsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'admin')
        );

        const snapshot = await getDocs(adminsQuery);
        const adminUsersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as { name: string; email: string; department: string }
        }));
        console.log('Fetched admin users:', adminUsersData);
        setAdminUsers(adminUsersData);
      } catch (error) {
        console.error('Error fetching admin users:', error);
        toast.error('Failed to load admin users');
      }
    };

    fetchAdminUsers();
  }, []);

  // Filter queries based on status
  const filteredData = React.useMemo(() => {
    return statusFilter === 'All' 
      ? queries 
      : queries.filter(query => query.status === statusFilter);
  }, [queries, statusFilter]);

  // Chart options and series with memoization to prevent unnecessary re-renders
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'line',
      height: 400,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 500,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      toolbar: {
        show: false
      },
      background: '#111827',
      foreColor: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '40%',
        dataLabels: {
          position: 'top'
        },
        colors: {
          ranges: [{
            from: 0,
            to: 100,
            color: '#4F46E5'
          }]
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      width: [0, 3], // Make line thicker
      curve: 'smooth',
      colors: ['#4F46E5', '#10B981']
    },
    title: {
      text: 'Query Analytics Dashboard',
      align: 'left' as const,
      style: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#f1f5f9',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      margin: 20
    },
    subtitle: {
      text: `Last ${selectedRange} Days Performance`,
      align: 'left' as const,
      style: {
        fontSize: '14px',
        color: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
        marginTop: 5
      }
    },
    fill: {
      type: ['gradient', 'gradient'],
      gradient: {
        type: 'vertical',
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 100],
        colorStops: [
          [
            {
              offset: 0,
              color: '#4F46E5',
              opacity: 1
            },
            {
              offset: 100,
              color: '#4F46E5',
              opacity: 0.1
            }
          ],
          [
            {
              offset: 0,
              color: '#10B981',
              opacity: 0.2
            },
            {
              offset: 100,
              color: '#10B981',
              opacity: 0
            }
          ]
        ]
      }
    },
    grid: {
      borderColor: '#1f2937',
      strokeDashArray: 3,
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
        top: 10,
        right: 20,
        bottom: 10,
        left: 20
      }
    },
    xaxis: {
      type: 'datetime' as const,
      categories: metrics.map(m => m.date),
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500
        },
        formatter: function(value: string) {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          });
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      crosshairs: {
        show: true,
        stroke: {
          color: '#475569',
          width: 1,
          dashArray: 3
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'Total Queries',
          style: {
            color: '#4F46E5',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        labels: {
          style: {
            colors: '#94a3b8',
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          formatter: function(value: number) {
            return Math.round(value).toString();
          }
        }
      },
      {
        opposite: true,
        title: {
          text: 'Resolution Time (days)',
          style: {
            color: '#10B981',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        labels: {
          style: {
            colors: '#94a3b8',
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          formatter: function(value: number) {
            return value.toFixed(1) + 'd';
          }
        },
        min: 0,
        max: undefined,
        tickAmount: 5,
        forceNiceScale: true
      }
    ],
    legend: {
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      offsetY: -10,
      labels: {
        colors: '#e2e8f0'
      },
      markers: {
        radius: 99,
        width: 12,
        height: 12,
        offsetX: -4
      },
      itemMargin: {
        horizontal: 20
      },
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      fontWeight: 500
    },
    theme: {
      mode: 'dark' as const,
      palette: 'palette1'
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      y: [
        {
          formatter: function(value: number) {
            return value + ' queries';
          }
        },
        {
          formatter: function(value: number | null) {
            if (value === null) return 'No resolutions';
            return value.toFixed(1) + ' days';
          }
        }
      ],
      marker: {
        show: true,
        fillColors: ['#4F46E5', '#10B981']
      }
    }
  }), [metrics, selectedRange]); // Recalculate options when metrics or selected range change

  const chartSeries = useMemo(() => [
    {
      name: 'Total Queries',
      type: 'column',
      data: metrics.map(m => m.queryCount)
    },
    {
      name: 'Resolution Time',
      type: 'line',
      data: metrics.map(m => m.avgResolutionDays)
    }
  ], [metrics]); // Recalculate series when metrics change

  const handleAssignClick = (query: Query) => {
    if (currentUserRole !== 'superadmin') {
      toast.error('Only Super admins can assign queries');
      return;
    }
    setSelectedQuery(query);
    setIsAssigning(true);
  };

  const handleAssignmentComplete = () => {
    setIsAssigning(false);
    setSelectedQuery(null);
  };

  const handleAssignQuery = async (queryId: string, adminId: string) => {
    if (!currentUser?.uid) {
      console.error('No current user found');
      return;
    }

    // Log current user details
    console.log('Current user details:', {
      uid: currentUser.uid,
      role: currentUserRole,
      email: currentUser.email
    });

    if (currentUserRole !== 'superadmin') {
      console.error('User is not a superadmin:', currentUserRole);
      toast.error('Only Super admins can assign queries');
      return;
    }

    console.log('Starting query assignment:', { queryId, adminId, currentUserRole });

    try {
      const adminUser = adminUsers.find(admin => admin.id === adminId);
      if (!adminUser) {
        console.error('Admin user not found:', adminId);
        toast.error('Selected admin user not found');
        return;
      }
      console.log('Found admin user:', adminUser);

      const queryRef = doc(db, 'queries', queryId);
      const queryDoc = await getDoc(queryRef);
      
      if (!queryDoc.exists()) {
        console.error('Query not found:', queryId);
        toast.error('Query not found');
        return;
      }
      
      const queryData = queryDoc.data() as Query;
      console.log('Found query data:', queryData);

      // Update query assignment
      const updateData = {
        assignedTo: adminId,
        assignedToName: adminUser.name,
        status: 'Active',
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser.uid,
        assignedBy: currentUser.uid,
        assignedAt: new Date().toISOString()
      };
      console.log('Updating query with:', updateData);
      
      try {
        await updateDoc(queryRef, updateData);
        console.log('Query updated successfully');
      } catch (updateError) {
        console.error('Error updating query:', updateError);
        throw updateError;
      }

      // Create notification
      const notificationData = {
        type: 'QUERY_ASSIGNMENT' as const,
        recipientId: adminId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        queryId: queryId,
        queryTitle: queryData.referenceId || 'New Query Assignment',
        queryDescription: queryData.description || '',
        read: false,
        createdAt: new Date().toISOString()
      };
      console.log('Creating notification with data:', notificationData);

      try {
        // First check if we can access the notifications collection
        const notificationsRef = collection(db, 'notifications');
        console.log('Notifications collection reference created');

        // Try to create the notification
        const notificationRef = await addDoc(notificationsRef, notificationData);
        console.log('Notification created successfully with ID:', notificationRef.id);
        
        // Verify the notification was created
        const createdNotification = await getDoc(doc(db, 'notifications', notificationRef.id));
        if (createdNotification.exists()) {
          console.log('Verified notification exists:', createdNotification.data());
        } else {
          console.error('Notification was not created properly');
          throw new Error('Notification creation verification failed');
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't throw here, we want the assignment to succeed even if notification fails
        toast.error('Failed to create notification');
      }

      toast.success('Query assigned successfully');
      setIsAssigning(false);
      setSelectedAdmin('');
    } catch (error) {
      console.error('Error in handleAssignQuery:', error);
      toast.error('Failed to assign query');
    }
  };

  const handleDotsClick = (query: Query) => {
    setSelectedQuery(query);
    setSelectedStatus(query.status); // Initialize with current status
    setShowStatusModal(true);
    setIsDetailsModalOpen(false);
  };

  const handleStatusChange = async (queryId: string, newStatus: Query['status']) => {
    if (!hasAccess) {
      toast.error('Unauthorized action');
      return;
    }

    // If changing to Resolved, open modal first
    if (newStatus === 'Resolved') {
      const query = queries.find(q => q.id === queryId);
      if (query) {
        setSelectedQuery(query);
        setIsDetailsModalOpen(true);
      }
      return;
    }

    try {
      const queryRef = doc(db, 'queries', queryId);
      const updateData: Partial<Query> = { 
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.uid
      };

      await updateDoc(queryRef, updateData);
      toast.success('Query status updated successfully');
    } catch (error) {
      console.error('Error updating query status:', error);
      toast.error('Failed to update query status');
    }
  };

  const handleResolutionSubmit = async () => {
    if (!selectedQuery || !resolutionMessage.trim()) {
      toast.error('Please provide a resolution message');
      return;
    }

    try {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Set time to start of day

      const updateData: Partial<Query> = { 
        status: 'Resolved',
        resolutionMessage,
        resolutionDate: currentDate.toISOString(),
        resolvedBy: userData?.name || 'Admin User',
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.uid
      };

      const queryRef = doc(db, 'queries', selectedQuery.id);
      await updateDoc(queryRef, updateData);
      
      toast.success('Query resolved successfully');
      setIsDetailsModalOpen(false);
      setSelectedQuery(null);
      setResolutionMessage('');
    } catch (error) {
      console.error('Error resolving query:', error);
      toast.error('Failed to resolve query');
    }
  };

  const handleReassignQuery = async (queryId: string, assigneeId: string) => {
    if (!hasAccess || userData?.role !== 'superadmin') {
      toast.error('Only super admins can reassign queries');
      return;
    }

    try {
      const assignee = adminUsers.find(user => user.id === assigneeId);
      if (!assignee) {
        toast.error('Selected admin user not found');
        return;
      }

      const queryRef = doc(db, 'queries', queryId);
      const updateData: Partial<Query> = {
        assignedTo: assigneeId,
        assignedToName: assignee.name,
        assignedBy: currentUser?.uid,
        assignedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.uid
      };

      await updateDoc(queryRef, updateData);
      toast.success(`Query reassigned to ${assignee.name}`);
    } catch (error) {
      console.error('Error reassigning query:', error);
      toast.error('Failed to reassign query');
    }
  };

  // Custom Tooltip component
  const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
    return (
      <div className="relative group">
        {children}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-2">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    columnHelper.accessor('referenceId', {
      header: 'Reference ID',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('customerName', {
      header: 'Customer Name',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => (
        <div className="max-w-xs truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <span className={clsx(
          'px-2 py-1 rounded-full text-xs font-medium',
          info.getValue() === 'Active' && 'bg-green-100 text-green-800',
          info.getValue() === 'Open' && 'bg-yellow-100 text-yellow-800',
          info.getValue() === 'Resolved' && 'bg-blue-100 text-blue-800',
          info.getValue() === 'Closed' && 'bg-gray-100 text-gray-800'
        )}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('assignedToName', {
      header: 'Assigned To',
      cell: (info) => info.getValue() || 'Unassigned',
    }),
    columnHelper.accessor('submissionDate', {
      header: 'Submission Date',
      cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy HH:mm'),
    }),
    columnHelper.accessor('lastUpdated', {
      header: 'Last Updated',
      cell: (info) => info.getValue() ? format(new Date(info.getValue()), 'MMM d, yyyy HH:mm') : '-',
    }),
    columnHelper.accessor('actions', {
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center justify-end space-x-2">
          <Tooltip text="Change Query Status">
            <button
              onClick={() => handleDotsClick(info.row.original)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip text="Assign Query">
            <button
              onClick={() => handleAssignClick(info.row.original)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <User className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip text="View Query Details">
            <button
              onClick={() => {
                setSelectedQuery(info.row.original);
                setIsDetailsModalOpen(true);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Info className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection: selectedQueries,
    },
    enableRowSelection: true,
    onRowSelectionChange: setSelectedQueries,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const StatusChangeModal = () => {
    if (!showStatusModal || !selectedQuery) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
          </div>

          <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg font-medium text-white mb-4">Change Query Status</h3>
              <div className="space-y-4">
                <div className="bg-gray-700 p-3 rounded-md text-gray-300">
                  <p><span className="font-medium">Reference:</span> {selectedQuery.referenceId}</p>
                  <p><span className="font-medium">Description:</span> {selectedQuery.description}</p>
                  <p><span className="font-medium">Current Status:</span> {selectedQuery.status}</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select New Status
                  </label>
                  <select
                    className="w-full px-3 py-2 text-gray-200 border rounded-lg bg-gray-700 border-gray-600 focus:outline-none focus:border-blue-500"
                    value={selectedStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as Query['status'];
                      setSelectedStatus(newStatus);
                    }}
                  >
                    <option value="Open">Open</option>
                    <option value="Active">Active</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  if (selectedStatus === 'Resolved') {
                    setIsDetailsModalOpen(true);
                    setShowStatusModal(false);
                  } else {
                    handleStatusChange(selectedQuery.id, selectedStatus);
                    setShowStatusModal(false);
                  }
                }}
              >
                Update Status
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedStatus(selectedQuery.status); // Reset to current status
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ResolutionModal = () => {
    if (!isDetailsModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
          </div>

          <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg font-medium text-white mb-4">Resolution Message</h3>
              <div className="space-y-4">
                <div className="bg-gray-700 p-3 rounded-md text-gray-300">
                  <p><span className="font-medium">Reference:</span> {selectedQuery?.referenceId}</p>
                  <p><span className="font-medium">Description:</span> {selectedQuery?.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter Resolution Details
                  </label>
                  <textarea
                    className="w-full px-3 py-2 text-gray-200 border rounded-lg bg-gray-700 border-gray-600 focus:outline-none focus:border-blue-500"
                    rows={4}
                    value={resolutionMessage}
                    onChange={(e) => setResolutionMessage(e.target.value)}
                    placeholder="Describe how the query was resolved..."
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleResolutionSubmit}
              >
                Resolve Query
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setResolutionMessage('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!currentUser || !hasAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">
          You don't have access to this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Query Management
        </h1>
        
        {/* Query Metrics Chart */}
        <div className="mb-6">
          <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-semibold text-white">Query Analytics</h2>
              <p className="text-gray-400 text-sm">Track query volumes and resolution times</p>
            </div>
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={400}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search queries..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg 
                text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent 
                transition-colors hover:border-gray-400 dark:hover:border-gray-500"
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg
              text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent
              transition-colors hover:border-gray-400 dark:hover:border-gray-500"
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
          </select>
          <div className="flex gap-2">
            {(['7D', '30D', '3M', '6M', '12M'] as ('7D' | '30D' | '3M' | '6M' | '12M')[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1 rounded ${
                  selectedRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Render both modals */}
      <StatusChangeModal />
      <ResolutionModal />
      
      {/* Table Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none'
                              : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.original.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Section */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing{' '}
              <span className="font-medium">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>
              {' '}to{' '}
              <span className="font-medium">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getRowModel().rows.length
                )}
              </span>
              {' '}of{' '}
              <span className="font-medium">{table.getRowModel().rows.length}</span>
              {' '}results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* QueryAssignment component */}
      <QueryAssignment
        isOpen={isAssigning}
        onClose={() => setIsAssigning(false)}
        query={selectedQuery}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </div>
  );
};

export default QueryManagement;