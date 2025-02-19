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
import { collection, getDocs, query, where, orderBy, addDoc, Timestamp, limit, doc, getDoc } from 'firebase/firestore';
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
            toast.error('No meter number found in the reading data');
          }
        } else {
          console.warn('No readings found for account:', userData.accountNumber);
          toast.error('No readings found for your account');
        }
      } catch (error: any) {
        console.error('Error fetching meter number:', {
          error,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        toast.error(`Failed to fetch meter number: ${error.message}`);
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
          toast.error('No meter readings found for your account');
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
        toast.error(`Failed to load meter readings: ${error.message}`);
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
      if (!formData.photo) {
        toast.error('Please take a photo of your meter reading', { id: toastId });
        return;
      }

      if (!userLocation) {
        toast.error('Location data is required. Please allow location access and try again.', { id: toastId });
        return;
      }

      if (!userData?.accountNumber) {
        toast.error('Account number is required', { id: toastId });
        return;
      }

      const lastReading = data[0]?.currentReading || 0;
      const currentReading = parseInt(formData.currentReading);
      
      // Enhanced validation
      const error = validateReading(currentReading, lastReading, formData.meterType);
      if (error) {
        if (error.startsWith('Warning:')) {
          const proceed = window.confirm(`${error}\n\nDo you want to proceed with submitting this reading?`);
          if (!proceed) {
            toast.error('Submission cancelled', { id: toastId });
            return;
          }
        } else {
          toast.error(error, { id: toastId });
          return;
        }
      }

      // Upload photo with progress tracking
      toast.loading('Uploading photo...', { id: toastId });
      const photoUrl = await uploadPhotoToStorage(formData.photo, userData.accountNumber, userLocation);

      // Get current date in YYYYMMDD format
      const currentDate = format(new Date(), 'yyyyMMdd');
      const currentPeriod = format(new Date(), 'yyyyMM');

      // Query for the existing document
      toast.loading('Fetching account details...', { id: toastId });
      const readingsRef = collection(db, 'meterReadings');
      const q = query(
        readingsRef,
        where('AccountNo', '==', userData.accountNumber),
        orderBy('CurrReadDate', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingData = querySnapshot.docs[0].data();

        // Create new reading document with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let newReadingDoc;

        while (retryCount < maxRetries) {
          try {
            toast.loading('Saving reading...', { id: toastId });
            newReadingDoc = await addDoc(collection(db, 'meterReadings'), {
              // Existing fields...
              AccountNo: userData.accountNumber,
              AccountHolder: existingData.AccountHolder,
              Address: existingData.Address,
              Description: existingData.Description,
              MeterNumber: existingData.MeterNumber,
              MeterType: existingData.MeterType,
              TariffCode: existingData.TariffCode,
              ErfNo: existingData.ErfNo,
              Book: existingData.Book,
              Suburb: existingData.Suburb,
              Town: existingData.Town,
              Ward: existingData.Ward,
              
              // New reading details
              PrevRead: lastReading,
              PrevReadDate: data[0]?.currentReadingDate ? format(data[0].currentReadingDate, 'yyyyMMdd') : existingData.CurrReadDate,
              CurrRead: currentReading,
              CurrReadDate: currentDate,
              Period: currentPeriod,
              Consumption: currentReading - lastReading,
              photoUrl: photoUrl,
              location: userLocation,
              ReadType: 'CUSTOMER',
              Status: 'PENDING_REVIEW',
              createdAt: Timestamp.now(),
              lastUpdated: Timestamp.now(),
              Factor: existingData.Factor || 1,
              AmpsPhase: existingData.AmpsPhase || '',
              MeterAlpha: existingData.MeterAlpha || '',
              Reservoir: existingData.Reservoir || ' ',
              Seq: existingData.Seq || '',
              LocalAuthority: existingData.LocalAuthority || '',
              deviceInfo: navigator.userAgent,
              submissionMethod: 'MOBILE_APP'
            });
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        if (!newReadingDoc) {
          throw new Error('Failed to create new reading document');
        }

        // Update local state
        const newReading: MeterReading = {
          id: newReadingDoc.id,
          accountNumber: userData.accountNumber,
          meterNumber: existingData.MeterNumber,
          meterType: existingData.MeterType,
          tariffCode: existingData.TariffCode,
          previousReading: lastReading,
          currentReading: currentReading,
          consumption: currentReading - lastReading,
          photoUrl,
          currentReadingDate: new Date(),
          AccountHolder: existingData.AccountHolder,
          Address: existingData.Address,
          Description: existingData.Description,
          location: userLocation
        };

        setData(prevData => {
          const newData = [newReading, ...prevData];
          setStats(calculateStats(newData));
          return newData;
        });

        toast.success('Meter reading submitted successfully', { id: toastId });
        
        // Show consumption alert if there's a significant increase
        const increase = ((currentReading - lastReading) / lastReading) * 100;
        if (increase > 50) {
          toast.warning(
            `Your consumption has increased by ${increase.toFixed(1)}% compared to your last reading. ` +
            'Consider checking for leaks or unusual usage patterns.',
            { duration: 10000 }
          );
        }
      } else {
        toast.error('Could not find your meter reading record', { id: toastId });
      }

      // Reset state
      setShowCamera(false);
      setUserLocation(null);
      setFormData({
        accountNumber: '',
        meterNumber: '',
        currentReading: '',
        readingDate: format(new Date(), 'yyyy-MM-dd'),
        meterType: '',
        tariffCode: '',
        photo: null
      });
      setShowSubmitForm(false);
    } catch (error: any) {
      console.error('Error submitting reading:', error);
      toast.error(
        `Failed to submit meter reading: ${error.message}. ` +
        'Please try again or contact support if the problem persists.',
        { id: toastId }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data.length) return null;

    const sortedData = [...data].sort((a, b) => 
      new Date(a.currentReadingDate).getTime() - new Date(b.currentReadingDate).getTime()
    );

    return {
      dates: sortedData.map(reading => format(new Date(reading.currentReadingDate), 'MMM dd')),
      consumption: sortedData.map(reading => reading.consumption),
      readings: sortedData.map(reading => reading.currentReading)
    };
  }, [data]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: false,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      zoom: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: ['#0EA5E9', '#6366F1'],
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      }
    },
    title: {
      text: 'Consumption & Meter Reading Trends',
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#374151'
      }
    },
    legend: {
      show: false
    },
    xaxis: {
      categories: chartData?.dates || [],
      title: {
        text: 'Date'
      },
      labels: {
        rotate: -45,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'Consumption (kWh)'
        },
        labels: {
          formatter: (value) => `${value.toFixed(1)}`
        }
      },
      {
        opposite: true,
        title: {
          text: 'Meter Reading'
        },
        labels: {
          formatter: (value) => `${value.toFixed(0)}`
        }
      }
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value, { seriesIndex }) => {
          return `${value.toFixed(seriesIndex === 0 ? 1 : 0)} kWh`;
        }
      }
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: {
            toolbar: {
              show: false
            }
          },
          legend: {
            position: 'bottom',
            offsetY: 0
          },
          plotOptions: {
            bar: {
              columnWidth: '70%'
            }
          },
          xaxis: {
            labels: {
              rotate: -45,
              style: {
                fontSize: '10px'
              }
            }
          }
        }
      }
    ]
  };

  const series = chartData ? [
    {
      name: 'Consumption',
      type: 'bar',
      data: chartData.consumption
    },
    {
      name: 'Meter Reading',
      type: 'bar',
      data: chartData.readings
    }
  ] : [];

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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#6366F1]" />
                <span>Meter Reading</span>
              </div>
            </div>
          </div>
          <div className="relative h-[350px] w-full overflow-hidden">
            <ReactApexChart
              options={chartOptions}
              series={series}
              type="bar"
              height={350}
            />
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm text-gray-500">
            <p>* Hover over the graph to see detailed values</p>
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              <span>Use the toolbar above to zoom and pan the chart</span>
            </div>
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
            className="relative max-w-4xl w-full bg-white rounded-lg shadow-xl"
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