import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { Search, Loader2, TrendingUp, TrendingDown, AlertTriangle, Plus, Download, LineChart } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { collection, getDocs, query, where, orderBy, addDoc, Timestamp, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import imageCompression from 'browser-image-compression';

interface MeterReading {
  id?: string;
  accountNumber: string;
  meterNumber: string;
  meterType: string;
  tariffCode: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  photoUrl?: string;
  currentReadingDate: Date;
  AccountHolder?: string;
  Address?: string;
  Description?: string;
  location?: { latitude: number; longitude: number };
}

interface ConsumptionStats {
  averageConsumption: number;
  totalConsumption: number;
  highestConsumption: number;
  lowestConsumption: number;
  consumptionTrend: 'up' | 'down' | 'stable';
}

interface FormData {
  accountNumber: string;
  meterNumber: string;
  currentReading: string;
  readingDate: string;
  meterType: string;
  tariffCode: string;
  photo?: File | null;
}

const columnHelper = createColumnHelper<MeterReading>();

export default function MeterReadings() {
  const { currentUser, userData } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MeterReading[]>([]);
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    accountNumber: '',
    meterNumber: '',
    currentReading: '',
    readingDate: format(new Date(), 'yyyy-MM-dd'),
    meterType: '',
    tariffCode: '',
    photo: null
  });
  const [customerMeterNumber, setCustomerMeterNumber] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const videoRef = React.createRef<HTMLVideoElement>();
  const canvasRef = React.createRef<HTMLCanvasElement>();

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Update form data when readings are loaded
  useEffect(() => {
    if (data.length > 0) {
      const latestReading = data[0]; // Get the most recent reading
      setFormData(prev => ({
        ...prev,
        accountNumber: userData?.accountNumber || '',
        meterNumber: latestReading.meterNumber,
        meterType: latestReading.meterType,
        tariffCode: latestReading.tariffCode,
        currentReading: '',
        readingDate: format(new Date(), 'yyyy-MM-dd'),
        photo: null
      }));
    }
  }, [data, userData]);

  useEffect(() => {
    const fetchMeterNumber = async () => {
      if (!userData?.accountNumber) {
        console.log('No account number found');
        return;
      }
      
      try {
        console.log('Fetching meter number for account:', userData.accountNumber);
        const readingsRef = collection(db, 'meterReadings');
        
        // Log the query parameters
        console.log('Query parameters:', {
          accountNumber: userData.accountNumber
        });

        // Create a simple query to get the document
        const q = query(
          readingsRef,
          where('AccountNo', '==', userData.accountNumber)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Log the raw query results
        console.log('Query snapshot size:', querySnapshot.size);
        console.log('Query results:', querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
        
        if (!querySnapshot.empty) {
          const latestReading = querySnapshot.docs[0].data();
          console.log('Latest reading data:', latestReading);
          
          // Log all the relevant fields we're trying to access
          console.log('Field check:', {
            hasMeterNumber: !!latestReading.MeterNumber,
            meterNumber: latestReading.MeterNumber,
            meterType: latestReading.MeterType,
            tariffCode: latestReading.TariffCode
          });
          
          if (latestReading.MeterNumber) {
            setCustomerMeterNumber(latestReading.MeterNumber);
            setFormData(prev => ({
              ...prev,
              meterNumber: latestReading.MeterNumber,
              meterType: latestReading.MeterType || 'PREPAID WATER',
              tariffCode: latestReading.TariffCode || ''
            }));
            console.log('Successfully updated meter details:', {
              meterNumber: latestReading.MeterNumber,
              meterType: latestReading.MeterType,
              tariffCode: latestReading.TariffCode
            });
          } else {
            console.warn('No meter number found in the reading data:', latestReading);
          }
        } else {
          console.warn('No readings found for account:', userData.accountNumber);
        }
      } catch (error: any) {
        console.error('Error fetching meter number:', {
          error,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      }
    };

    if (showSubmitForm) {
      fetchMeterNumber();
    }
  }, [showSubmitForm, userData?.accountNumber]);

  useEffect(() => {
    const fetchMeterReadings = async () => {
      try {
        setIsLoading(true);
        if (!currentUser || !userData?.accountNumber) {
          console.log('No user or account number found');
          return;
        }

        console.log('Fetching meter readings for account:', userData.accountNumber);
        
        // Create a reference to the specific document using the nested path
        const yearDoc = doc(db, 'meterReadings', '2024');
        const monthCollection = collection(yearDoc, '09');
        const accountDoc = doc(monthCollection, userData.accountNumber);
        
        // Get the document
        const docSnapshot = await getDoc(accountDoc);
        
        console.log('Document exists:', docSnapshot.exists());
        
        const readings: MeterReading[] = [];
        
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log('Document data:', data);

          // Parse the date string from YYYYMMDD format
          const currDateStr = data.CurrReadDate || '20240915';
          const prevDateStr = data.PrevReadDate || '20240815';
          
          const currDate = new Date(
            parseInt(currDateStr.substring(0, 4)),
            parseInt(currDateStr.substring(4, 6)) - 1,
            parseInt(currDateStr.substring(6, 8))
          );
          
          readings.push({
            id: docSnapshot.id,
            accountNumber: data.AccountNo,
            meterNumber: data.MeterNumber,
            meterType: data.MeterType,
            tariffCode: data.TariffCode,
            previousReading: data.PrevRead,
            currentReading: data.CurrRead,
            consumption: data.Consumption,
            photoUrl: null,
            currentReadingDate: currDate,
            AccountHolder: data.AccountHolder,
            Address: data.Address,
            Description: data.Description,
            location: null
          });
        }
        
        console.log('Found readings:', readings.length);
        
        if (readings.length === 0) {
          console.log('No readings found for account:', userData.accountNumber);
        } else {
          setData(readings);
          setStats(calculateStats(readings));
          console.log('Successfully loaded readings with data:', readings);
        }
      } catch (error: any) {
        console.error('Error fetching meter readings:', {
          error,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeterReadings();
  }, [currentUser, userData]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Only start camera if we have location permission
        if (showCamera && userLocation) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' },
            audio: false 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast.error('Unable to access camera. Please ensure you have given camera permissions.');
        setShowCamera(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, userLocation]);

  const requestLocationAndCamera = async () => {
    try {
      // First request location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      // Store location
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      // Then show camera
      setShowCamera(true);
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Location access is required to take meter readings. Please enable location services and try again.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'meter-reading.jpg', { type: 'image/jpeg' });
            setFormData(prev => ({ ...prev, photo: file }));
            setShowCamera(false);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, files } = e.target;
    if (type === 'file' && files) {
      setFormData(prev => ({
        ...prev,
        photo: files[0],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const calculateStats = (readings: MeterReading[]): ConsumptionStats => {
    if (readings.length === 0) {
      return {
        averageConsumption: 0,
        totalConsumption: 0,
        highestConsumption: 0,
        lowestConsumption: 0,
        consumptionTrend: 'stable'
      };
    }

    const consumptions = readings.map(r => r.consumption);
    const total = consumptions.reduce((a, b) => a + b, 0);
    const average = total / consumptions.length;
    const highest = Math.max(...consumptions);
    const lowest = Math.min(...consumptions);

    // Calculate trend based on last two readings
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (readings.length >= 2) {
      const lastReading = readings[0].consumption;
      const previousReading = readings[1].consumption;
      if (lastReading > previousReading) {
        trend = 'up';
      } else if (lastReading < previousReading) {
        trend = 'down';
      }
    }

    return {
      averageConsumption: Number(average.toFixed(2)),
      totalConsumption: Number(total.toFixed(2)),
      highestConsumption: Number(highest.toFixed(2)),
      lowestConsumption: Number(lowest.toFixed(2)),
      consumptionTrend: trend
    };
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('meterNumber', {
        header: 'Meter Number',
      }),
      columnHelper.accessor('currentReadingDate', {
        header: 'Reading Date',
        cell: info => format(info.getValue(), 'PPP'),
      }),
      columnHelper.accessor('previousReading', {
        header: 'Previous Reading',
        cell: info => `${info.getValue()} kWh`,
      }),
      columnHelper.accessor('currentReading', {
        header: 'Current Reading',
        cell: info => `${info.getValue()} kWh`,
      }),
      columnHelper.accessor('consumption', {
        header: 'Consumption',
        cell: info => `${info.getValue()} kWh`,
      }),
      columnHelper.accessor('photoUrl', {
        header: 'Photo',
        cell: info => {
          const url = info.getValue();
          return url ? (
            <div className="relative group">
              <img
                src={url}
                alt="Meter Reading"
                className="h-16 w-16 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                onClick={() => setSelectedImage(url)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
            </div>
          ) : (
            <span className="text-gray-400">No photo</span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination: {
        pageIndex: currentPage,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-red-500';
      case 'down':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5" />;
      case 'down':
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Date', 'Meter Number', 'Previous Reading', 'Current Reading', 'Consumption'];
      const csvContent = [
        headers.join(','),
        ...data.map(reading => [
          format(reading.currentReadingDate, 'yyyy-MM-dd'),
          reading.meterNumber,
          reading.previousReading,
          reading.currentReading,
          reading.consumption
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `meter_readings_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      toast.success('Exported readings successfully');
    } catch (error) {
      console.error('Error exporting readings:', error);
      toast.error('Failed to export readings');
    }
  };

  const validateReading = (currentReading: number, lastReading: number, meterType: string) => {
    // Basic validation
    if (isNaN(currentReading)) {
      return 'Please enter a valid number for the current reading';
    }

    if (currentReading <= lastReading) {
      return 'Current reading must be greater than the last reading';
    }

    // Suspicious increase validation based on meter type
    const increase = ((currentReading - lastReading) / lastReading) * 100;
    const thresholds = {
      'PREPAID WATER': 400,
      'PREPAID ELECTRIC': 300,
      'CONVENTIONAL WATER': 400,
      'CONVENTIONAL ELECTRIC': 300,
      'default': 300
    };

    const threshold = thresholds[meterType as keyof typeof thresholds] || thresholds.default;
    
    if (increase > threshold) {
      return `Warning: Unusually high consumption detected (${increase.toFixed(1)}% increase). Please verify the reading.`;
    }

    // Check for unrealistic readings based on meter type
    const maxReadings = {
      'PREPAID WATER': 999999,
      'PREPAID ELECTRIC': 999999,
      'CONVENTIONAL WATER': 999999,
      'CONVENTIONAL ELECTRIC': 999999,
      'default': 999999
    };

    const maxReading = maxReadings[meterType as keyof typeof maxReadings] || maxReadings.default;
    
    if (currentReading > maxReading) {
      return `Reading exceeds maximum value for ${meterType} meter (${maxReading})`;
    }

    return null;
  };

  const uploadPhotoToStorage = async (file: File, accountNumber: string, location: { latitude: number; longitude: number }) => {
    try {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error('Photo size exceeds 5MB limit');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const fileName = `MeterReadings/${accountNumber}_${timestamp}.jpg`;
      const storageRef = ref(storage, fileName);

      // Compress image if needed
      let compressedFile = file;
      if (file.size > 1024 * 1024) { // If larger than 1MB
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        try {
          compressedFile = await imageCompression(file, options);
        } catch (error) {
          console.warn('Image compression failed, using original file:', error);
        }
      }

      // Add metadata including location and timestamp
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          accountNumber,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
          timestamp: new Date().toISOString(),
          originalFileName: file.name,
          deviceInfo: navigator.userAgent
        }
      };

      // Upload file with metadata and track progress
      const uploadTask = uploadBytes(storageRef, compressedFile, metadata);
      
      // Show upload progress
      toast.loading('Uploading photo...', { id: 'photo-upload' });
      
      const snapshot = await uploadTask;
      console.log('Photo uploaded successfully:', snapshot.metadata);
      toast.success('Photo uploaded successfully', { id: 'photo-upload' });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(`Failed to upload photo: ${error.message}`, { id: 'photo-upload' });
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading('Processing submission...');

    try {
      if (!userData?.accountNumber) {
        toast.error('Account number not found', { id: toastId });
        return;
      }

      // Get current date components
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      // Create the date string in the required format
      const currReadDate = `${year}${month}${day}`;
      const prevReadDate = data[0]?.currentReadingDate 
        ? format(data[0].currentReadingDate, 'yyyyMMdd')
        : format(subMonths(now, 1), 'yyyyMMdd');

      // Calculate consumption
      const currentReading = parseFloat(formData.currentReading);
      const previousReading = data[0]?.currentReading || 0;
      const consumption = currentReading - previousReading;

      // Reference to the specific document
      const yearDoc = doc(db, 'meterReadings', year);
      const monthCollection = collection(yearDoc, month);
      const accountDoc = doc(monthCollection, userData.accountNumber);

      // Create the new meter reading record
      const meterReadingData = {
        AccountHolder: data[0]?.AccountHolder || '',
        AccountNo: userData.accountNumber,
        Address: data[0]?.Address || '',
        AmpsPhase: '',
        AppliesToAccountType: '',
        BasicAmount: 52,
        BasicRebate: 0,
        Book: '0',
        ConsAmount: 26.6,
        ConsRebate: 0,
        Consumption: consumption,
        CurrRead: currentReading,
        CurrReadDate: currReadDate,
        Description: data[0]?.Description || 'TARIFF 1: DOMESTIC/HUISHOUDELI',
        ErfNo: data[0]?.ErfNo || '',
        Factor: 1,
        HistType: 'LVY',
        LocalAuthority: '',
        MeterAlpha: '',
        MeterNumber: formData.meterNumber,
        MeterType: formData.meterType,
        Period: `${year}${month}`,
        PrevRead: previousReading,
        PrevReadDate: prevReadDate,
        ReadType: 'CUSTOMER',
        Reservoir: ' ',
        Seq: '0',
        Status: 'ACTIVE',
        Suburb: data[0]?.Suburb || '',
        SurCharge: 0,
        TariffCode: formData.tariffCode,
        TotLevied: 78.6,
        Town: data[0]?.Town || '',
        VATAmount: 3.99,
        Ward: ' ',
        accountNoIndex: userData.accountNumber,
        month: month,
        uploadDate: `${year}-${month}`,
        uploadTimestamp: new Date().toISOString(),
        year: year
      };

      // Upload photo if exists
      let photoUrl = null;
      if (formData.photo && userLocation) {
        photoUrl = await uploadPhotoToStorage(formData.photo, userData.accountNumber, userLocation);
      }

      if (photoUrl) {
        meterReadingData.photoUrl = photoUrl;
      }

      // Create the year document if it doesn't exist
      await setDoc(yearDoc, {}, { merge: true });

      // Set the document data
      await setDoc(accountDoc, meterReadingData);

      toast.success('Meter reading submitted successfully', { id: toastId });
      setShowSubmitForm(false);
      
      // Refresh the data without page reload
      const refreshData = async () => {
        try {
          setIsLoading(true);
          if (!userData?.accountNumber) return;

          const yearDoc = doc(db, 'meterReadings', year);
          const monthCollection = collection(yearDoc, month);
          const accountDoc = doc(monthCollection, userData.accountNumber);
          
          const docSnapshot = await getDoc(accountDoc);
          
          if (docSnapshot.exists()) {
            const newReading = docSnapshot.data();
            // Add the new reading to the existing data
            setData(prevData => {
              const newData = [{
                id: docSnapshot.id,
                accountNumber: newReading.AccountNo,
                meterNumber: newReading.MeterNumber,
                meterType: newReading.MeterType,
                tariffCode: newReading.TariffCode,
                previousReading: newReading.PrevRead,
                currentReading: newReading.CurrRead,
                consumption: newReading.Consumption,
                photoUrl: newReading.photoUrl,
                currentReadingDate: new Date(newReading.CurrReadDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')),
                AccountHolder: newReading.AccountHolder,
                Address: newReading.Address,
                Description: newReading.Description,
                location: newReading.location
              }, ...prevData];
              return newData;
            });
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      await refreshData();
      
    } catch (error: any) {
      console.error('Error submitting meter reading:', error);
      toast.error(`Failed to submit meter reading: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      height: 350,
      type: 'line',
      zoom: {
        enabled: true
      },
    },
    dataLabels: {
      enabled: true
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    grid: {
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      }
    },
    xaxis: {
      type: 'datetime',
      categories: data
        .filter(reading => reading.currentReadingDate)
        .map(reading => new Date(reading.currentReadingDate).getTime()),
      labels: {
        formatter: function(value: any) {
          return format(new Date(value), 'yyyy-MM-dd');
        }
      },
      title: {
        text: 'Date'
      }
    },
    yaxis: {
      title: {
        text: 'Consumption'
      }
    },
    tooltip: {
      x: {
        formatter: function(value: any) {
          return format(new Date(value), 'yyyy-MM-dd');
        }
      }
    }
  };

  const chartSeries = [
    {
      name: "Consumption",
      data: data
        .filter(reading => reading.consumption !== undefined && reading.consumption !== null)
        .map(reading => ({
          x: new Date(reading.currentReadingDate).getTime(),
          y: reading.consumption
        }))
        .sort((a, b) => a.x - b.x)
    }
  ];

  // Only render chart if we have valid data
  const renderChart = () => {
    if (data.length === 0) {
      return <div className="text-center p-4">No meter readings available</div>;
    }

    const validData = data.some(reading => 
      reading.currentReadingDate && 
      reading.consumption !== undefined && 
      reading.consumption !== null
    );

    if (!validData) {
      return <div className="text-center p-4">Invalid meter reading data</div>;
    }

    return (
      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={350}
      />
    );
  };

  return (
    <div className="space-y-8">
      {/* Header with Search, Export and Submit Button */}
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
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowSubmitForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme text-white rounded-lg hover:bg-theme/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Submit Reading
          </button>
        </div>
      </div>

      {/* Consumption Graph */}
      {data.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Consumption Analysis</h3>
              <p className="text-sm text-gray-500">Track your energy usage patterns over time</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0EA5E9]" />
                <span>Consumption</span>
              </div>
            </div>
          </div>
          <div className="relative h-[350px] w-full overflow-hidden">
            {renderChart()}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm text-gray-500">
            <p>* Hover over the graph to see detailed values</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Consumption</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {stats.averageConsumption} kWh
              </h3>
            </div>
            <div className={`${getTrendColor(stats.consumptionTrend)} flex items-center`}>
              {getTrendIcon(stats.consumptionTrend)}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Consumption</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            {stats.totalConsumption} kWh
          </h3>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Highest Reading</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            {stats.highestConsumption} kWh
          </h3>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Lowest Reading</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            {stats.lowestConsumption} kWh
          </h3>
        </div>
      </div>
      )}

      {/* Submit Reading Modal */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Submit Meter Reading</h2>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                    Account Number
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    value={formData.accountNumber}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Your municipal account number</p>
                </div>

                <div>
                  <label htmlFor="meterNumber" className="block text-sm font-medium text-gray-700">
                    Meter Number
                  </label>
                  <input
                    type="text"
                    id="meterNumber"
                    value={formData.meterNumber}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-populated from your account</p>
                </div>

                <div>
                  <label htmlFor="meterType" className="block text-sm font-medium text-gray-700">
                    Meter Type
                  </label>
                  <input
                    type="text"
                    id="meterType"
                    value={formData.meterType}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-populated from your account</p>
                </div>

                <div>
                  <label htmlFor="tariffCode" className="block text-sm font-medium text-gray-700">
                    Tariff Code
                  </label>
                  <input
                    type="text"
                    id="tariffCode"
                    value={formData.tariffCode}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Auto-populated from your account</p>
                </div>

                <div>
                  <label htmlFor="previousReading" className="block text-sm font-medium text-gray-700">
                    Previous Reading
                  </label>
                  <input
                    type="text"
                    id="previousReading"
                    value={data[0]?.previousReading ? `${data[0].previousReading} kWh` : 'No previous reading'}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Last submitted meter reading</p>
                </div>

                <div>
                  <label htmlFor="previousReadingDate" className="block text-sm font-medium text-gray-700">
                    Previous Reading Date
                  </label>
                  <input
                    type="text"
                    id="previousReadingDate"
                    value={data[0]?.currentReadingDate ? format(data[0].currentReadingDate, 'PPP') : 'No previous date'}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">Date of last submitted reading</p>
                </div>

                <div>
                  <label htmlFor="currentReading" className="block text-sm font-medium text-gray-700">
                    Current Reading
                  </label>
                  <input
                    type="number"
                    id="currentReading"
                    value={formData.currentReading}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="camera-capture" className="block text-sm font-medium text-gray-700">
                    Reading Photo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {showCamera ? (
                        <div className="flex flex-col items-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="h-64 w-full object-cover rounded-lg mb-2"
                          />
                          <canvas ref={canvasRef} style={{ display: 'none' }} />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="px-4 py-2 text-sm font-medium text-white bg-theme rounded-md shadow-sm hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
                            >
                              Take Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCamera(false)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : formData.photo ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={URL.createObjectURL(formData.photo)}
                            alt="Preview"
                            className="h-64 w-full object-cover rounded-lg mb-2"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setShowCamera(true)}
                              className="text-sm text-theme hover:text-theme/90"
                            >
                              Retake photo
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Remove photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 015.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <button
                            type="button"
                            onClick={requestLocationAndCamera}
                            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-theme rounded-md shadow-sm hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
                          >
                            Take Photo
                          </button>
                          <p className="mt-1 text-xs text-gray-500">
                            Location access is required to take meter readings. Please ensure location services are enabled.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowSubmitForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-theme border border-transparent rounded-md shadow-sm hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-white rounded-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-2">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={selectedImage}
                alt="Meter Reading Large View"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Latest Reading Summary */}
      {data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Reading Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current Reading</p>
              <p className="text-xl font-semibold">{data[0].currentReading} kWh</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Previous Reading</p>
              <p className="text-xl font-semibold">{data[0].previousReading} kWh</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Consumption</p>
              <p className="text-xl font-semibold">{data[0].consumption} kWh</p>
            </div>
          </div>
        </div>
      )}

      {/* Readings Table */}
      <div className="space-y-4">
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
                  <tr key={row.id} className="hover:bg-gray-50">
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
                    No meter readings found for your account
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
            <span className="text-sm text-gray-700">
              | Total: {table.getPrePaginationRowModel().rows.length} readings
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-theme" />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}