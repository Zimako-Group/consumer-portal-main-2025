import React from 'react';
import { 
  X, 
  User, 
  Hash, 
  Home,
  MapPin,
  Database,
  Calendar,
  Clock,
  Calculator,
  DollarSign,
  Percent,
  AlertCircle,
  CheckCircle2,
  Building2,
  BookOpen,
  Gauge,
  Receipt,
  Info,
  Check,
  X as XIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import toast from 'react-hot-toast';

interface MeterReadingDetails {
  id?: string;
  accountHolder: string;
  accountNumber: string;
  address: string;
  ampsPhase?: string;
  appliesToAccountType?: string;
  basicAmount?: number;
  basicRebate?: number;
  book?: string;
  consAmount?: number;
  consRebate?: number;
  consumption?: number;
  createdAt?: Date;
  currentReading?: number;
  currentReadingDate?: Date;
  previousReading?: number;
  previousReadingDate?: Date;
  status?: string;
  meterNumber?: string;
  meterType?: string;
  tariffCode?: string;
  erfNumber?: string;
  ward?: string;
  town?: string;
  suburb?: string;
  localAuthority?: string;
}

interface ViewModalProps {
  reading: MeterReadingDetails;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

const AdminViewModal: React.FC<ViewModalProps> = ({ reading, onClose, onStatusUpdate }) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleStatusUpdate = async (newStatus: 'APPROVED' | 'REJECTED') => {
    if (!reading.id) return;
    
    setIsUpdating(true);
    try {
      const readingRef = doc(db, 'meterReadings', reading.id);
      await updateDoc(readingRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      
      toast.success(`Reading ${newStatus.toLowerCase()} successfully`);
      onStatusUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update reading status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return format(date, 'dd MMM yyyy');
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10 backdrop-blur-sm bg-opacity-90">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Meter Reading Details</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Meter Number: {reading.meterNumber}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Status Banner */}
      <div className={`px-6 py-3 ${getStatusColor(reading.status)} border-b border-t flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          {reading.status === 'APPROVED' && <CheckCircle2 className="h-5 w-5" />}
          {reading.status === 'REJECTED' && <XIcon className="h-5 w-5" />}
          {reading.status === 'PENDING' && <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">Status: {reading.status || 'N/A'}</span>
        </div>
        {reading.status === 'PENDING' && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={isUpdating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => handleStatusUpdate('REJECTED')}
              disabled={isUpdating}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span>Reject</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Account Information */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-500" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem
              icon={Hash}
              label="Account Number"
              value={reading.accountNumber || 'N/A'}
            />
            <InfoItem
              icon={User}
              label="Account Holder"
              value={reading.accountHolder || 'N/A'}
            />
            <InfoItem
              icon={Home}
              label="Address"
              value={reading.address || 'N/A'}
            />
            <InfoItem
              icon={Info}
              label="Account Type"
              value={reading.appliesToAccountType || 'N/A'}
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-500" />
            Location Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem
              icon={Hash}
              label="ERF Number"
              value={reading.erfNumber || 'N/A'}
            />
            <InfoItem
              icon={MapPin}
              label="Ward"
              value={reading.ward || 'N/A'}
            />
            <InfoItem
              icon={Building2}
              label="Town"
              value={reading.town || 'N/A'}
            />
            <InfoItem
              icon={MapPin}
              label="Suburb"
              value={reading.suburb || 'N/A'}
            />
            <InfoItem
              icon={Building2}
              label="Local Authority"
              value={reading.localAuthority || 'N/A'}
            />
          </div>
        </div>

        {/* Meter Information */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Gauge className="h-5 w-5 mr-2 text-blue-500" />
            Meter Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem
              icon={Database}
              label="Meter Number"
              value={reading.meterNumber || 'N/A'}
            />
            <InfoItem
              icon={Gauge}
              label="Meter Type"
              value={reading.meterType || 'N/A'}
            />
            <InfoItem
              icon={Receipt}
              label="Tariff Code"
              value={reading.tariffCode || 'N/A'}
            />
            <InfoItem
              icon={BookOpen}
              label="Book"
              value={reading.book || 'N/A'}
            />
          </div>
        </div>

        {/* Reading Information */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-blue-500" />
            Reading Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem
              icon={Calculator}
              label="Previous Reading"
              value={reading.previousReading || 'N/A'}
            />
            <InfoItem
              icon={Calendar}
              label="Previous Reading Date"
              value={formatDate(reading.previousReadingDate)}
            />
            <InfoItem
              icon={Calculator}
              label="Current Reading"
              value={reading.currentReading || 'N/A'}
            />
            <InfoItem
              icon={Calendar}
              label="Current Reading Date"
              value={formatDate(reading.currentReadingDate)}
            />
            <InfoItem
              icon={Calculator}
              label="Consumption"
              value={reading.consumption || 'N/A'}
              className="font-semibold text-blue-600 dark:text-blue-400"
            />
          </div>
        </div>

        {/* Financial Information */}
        {(reading.basicAmount || reading.basicRebate || reading.consAmount || reading.consRebate) && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-500" />
              Financial Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem
                icon={DollarSign}
                label="Basic Amount"
                value={reading.basicAmount ? `R ${reading.basicAmount.toFixed(2)}` : 'N/A'}
              />
              <InfoItem
                icon={Percent}
                label="Basic Rebate"
                value={reading.basicRebate ? `R ${reading.basicRebate.toFixed(2)}` : 'N/A'}
              />
              <InfoItem
                icon={DollarSign}
                label="Consumption Amount"
                value={reading.consAmount ? `R ${reading.consAmount.toFixed(2)}` : 'N/A'}
              />
              <InfoItem
                icon={Percent}
                label="Consumption Rebate"
                value={reading.consRebate ? `R ${reading.consRebate.toFixed(2)}` : 'N/A'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface InfoItemProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: any;
  className?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, className = '' }) => {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`mt-1 text-sm text-gray-900 dark:text-white ${className}`}>
          {value}
        </p>
      </div>
    </div>
  );
};

export default AdminViewModal;
