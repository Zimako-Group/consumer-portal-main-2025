import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Save, Edit2, XCircle } from 'lucide-react';
import { CustomerData, updateCustomerData } from '../services/customerService';
import { toast } from 'react-hot-toast';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerData | null;
  onCustomerUpdate: (updatedCustomer: CustomerData) => void;
}

const CustomerDetailsModalContainer: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<CustomerData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edited customer when modal opens or customer changes
  useEffect(() => {
    if (customer) {
      setEditedCustomer(customer);
    }
  }, [customer]);

  if (!customer || !editedCustomer) return null;

  const handleInputChange = (
    field: keyof CustomerData,
    value: string | number
  ) => {
    setEditedCustomer((prev) => ({
      ...prev!,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!editedCustomer) return;
    
    setIsSaving(true);
    const result = await updateCustomerData(editedCustomer.accountNumber, {
      accountHolderName: editedCustomer.accountHolderName,
      idNumber: editedCustomer.idNumber,
      erfNumber: editedCustomer.erfNumber,
      emailAddress: editedCustomer.emailAddress,
      cellNumber: editedCustomer.cellNumber,
      postalAddress1: editedCustomer.postalAddress1,
      postalAddress2: editedCustomer.postalAddress2,
      postalAddress3: editedCustomer.postalAddress3,
      postalCode: editedCustomer.postalCode,
      accountType: editedCustomer.accountType,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success('Customer information updated successfully');
      setIsEditing(false);
      onCustomerUpdate(editedCustomer);
      onClose(); // Close the modal after successful save
    } else {
      toast.error(result.error || 'Failed to update customer information');
    }
  };

  const handleCancel = () => {
    setEditedCustomer(customer);
    setIsEditing(false);
    onClose(); // Close the modal when canceling
  };

  const renderEditableField = (
    label: string,
    field: keyof CustomerData,
    type: 'text' | 'number' | 'email' | 'tel' = 'text'
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-500">
        {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          value={editedCustomer[field] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      ) : (
        <p className="mt-1 text-sm text-gray-900">
          {editedCustomer[field] || 'N/A'}
        </p>
      )}
    </div>
  );

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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md transform overflow-hidden bg-white rounded-lg shadow-xl transition-all">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Customer Details
                      </h3>
                      <div className="mt-2">
                        {renderEditableField('Account Holder Name', 'accountHolderName')}
                        {renderEditableField('ID Number', 'idNumber')}
                        {renderEditableField('ERF Number', 'erfNumber')}
                        {renderEditableField('Email Address', 'emailAddress', 'email')}
                        {renderEditableField('Cell Number', 'cellNumber', 'tel')}
                        {renderEditableField('Postal Address 1', 'postalAddress1')}
                        {renderEditableField('Postal Address 2', 'postalAddress2')}
                        {renderEditableField('Postal Address 3', 'postalAddress3')}
                        {renderEditableField('Postal Code', 'postalCode')}
                        {renderEditableField('Account Type', 'accountType')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CustomerDetailsModalContainer;