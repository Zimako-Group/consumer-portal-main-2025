import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FormSection from './form/FormSection';
import SideNav from './form/SideNav';

interface Profile {
  id: string;
  fullName: string;
  surname: string;
  idNumber: string;
  customerNumber: string;
  email: string;
  phone: string;
  address: string;
  accountStatus: 'active' | 'inactive';
  currentBalance: number;
  dueDate: string;
  lastPaymentAmount: number;
  lastPaymentDate: string;
  notes: string;
  createdAt: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => void;
  profile: Profile;
}

const sections = [
  { id: 'basic-info', title: 'Basic Information' },
  { id: 'account-details', title: 'Account Details' }
];

export default function EditProfileModal({ isOpen, onClose, onSave, profile }: EditProfileModalProps) {
  const [formData, setFormData] = useState<Profile>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState(sections[0].id);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.surname) newErrors.surname = 'Surname is required';
    if (!formData.idNumber) {
      newErrors.idNumber = 'ID number is required';
    } else if (!/^\d{13}$/.test(formData.idNumber)) {
      newErrors.idNumber = 'ID number must be exactly 13 digits';
    }
    if (!formData.customerNumber) newErrors.customerNumber = 'Customer number is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (formData.currentBalance < 0) {
      newErrors.currentBalance = 'Current balance cannot be negative';
    }
    if (formData.lastPaymentAmount < 0) {
      newErrors.lastPaymentAmount = 'Last payment amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 flex max-h-[90vh]">
        <SideNav
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-semibold text-gray-900">Edit Profile</h2>
            <button 
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6">
              <FormSection
                id="basic-info"
                active={activeSection === 'basic-info'}
                title="Basic Information"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Surname *</label>
                    <input
                      type="text"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.surname ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.surname && <p className="mt-1 text-sm text-red-500">{errors.surname}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Number *</label>
                    <input
                      type="text"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                      maxLength={13}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.idNumber ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.idNumber && <p className="mt-1 text-sm text-red-500">{errors.idNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Number *</label>
                    <input
                      type="text"
                      value={formData.customerNumber}
                      onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.customerNumber ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.customerNumber && <p className="mt-1 text-sm text-red-500">{errors.customerNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-theme focus:border-theme"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                id="account-details"
                active={activeSection === 'account-details'}
                title="Account Details"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                    <select
                      value={formData.accountStatus}
                      onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value as 'active' | 'inactive' })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-theme focus:border-theme"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Balance (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.currentBalance}
                      onChange={(e) => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.currentBalance ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.currentBalance && <p className="mt-1 text-sm text-red-500">{errors.currentBalance}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.dueDate ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.dueDate && <p className="mt-1 text-sm text-red-500">{errors.dueDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Payment Amount (ZAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.lastPaymentAmount}
                      onChange={(e) => setFormData({ ...formData, lastPaymentAmount: parseFloat(e.target.value) })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        errors.lastPaymentAmount ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-theme focus:border-theme`}
                    />
                    {errors.lastPaymentAmount && <p className="mt-1 text-sm text-red-500">{errors.lastPaymentAmount}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Payment Date</label>
                    <input
                      type="date"
                      value={formData.lastPaymentDate}
                      onChange={(e) => setFormData({ ...formData, lastPaymentDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-theme focus:border-theme"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-theme focus:border-theme"
                      placeholder="Admin comments..."
                    />
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="border-t p-6 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-theme text-white rounded-md hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}