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

  return (
    <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
        <h2 className="text-xl font-semibold text-gray-900">Meter Reading Details</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Account Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={Hash}
              label="ERF Number"
              value={reading.erfNumber}
            />
            <InfoItem
              icon={MapPin}
              label="Ward"
              value={reading.ward}
            />
            <InfoItem
              icon={Building2}
              label="Town"
              value={reading.town}
            />
            <InfoItem
              icon={MapPin}
              label="Suburb"
              value={reading.suburb}
            />
            <InfoItem
              icon={Building2}
              label="Local Authority"
              value={reading.localAuthority}
            />
          </div>
        </div>

        {/* Meter Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Meter Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={Database}
              label="Meter Number"
              value={reading.meterNumber}
            />
            <InfoItem
              icon={Gauge}
              label="Meter Type"
              value={reading.meterType}
            />
            <InfoItem
              icon={Receipt}
              label="Tariff Code"
              value={reading.tariffCode}
            />
            <InfoItem
              icon={AlertCircle}
              label="Status"
              value={reading.status}
              className={reading.status === 'PENDING' ? 'text-yellow-600' : 'text-green-600'}
            />
          </div>
        </div>

        {/* Reading Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reading Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={Calculator}
              label="Previous Reading"
              value={reading.previousReading?.toLocaleString()}
            />
            <InfoItem
              icon={Calendar}
              label="Previous Reading Date"
              value={formatDate(reading.previousReadingDate)}
            />
            <InfoItem
              icon={Calculator}
              label="Current Reading"
              value={reading.currentReading?.toLocaleString()}
            />
            <InfoItem
              icon={Calendar}
              label="Current Reading Date"
              value={formatDate(reading.currentReadingDate)}
            />
            <InfoItem
              icon={Calculator}
              label="Consumption"
              value={reading.consumption?.toLocaleString()}
              className="font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {reading.status === 'PENDING' && (
        <div className="p-6 border-t sticky bottom-0 bg-white">
          <div className="flex justify-end gap-4">
            <button
              onClick={() => handleStatusUpdate('REJECTED')}
              disabled={isUpdating}
              className="px-4 py-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XIcon className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={isUpdating}
              className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface InfoItemProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: any;
  className?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, className }) => {
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`mt-1 text-sm text-gray-900 ${className || ''}`}>
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default AdminViewModal;
