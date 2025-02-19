import React from 'react';
import './PaymentGateway.css';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  outstandingAmount: number;
  accountNumber: string;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  isOpen,
  onClose,
  customerName,
  outstandingAmount,
  accountNumber,
}) => {
  if (!isOpen) return null;

  const handleProceedPayment = () => {
    const paymentUrl = `/payment/confirm?account_no=${accountNumber}&name=${encodeURIComponent(customerName)}&amount=${outstandingAmount}`;
    window.location.href = paymentUrl;
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Customer Payment Details</h2>
        </div>

        <div className="modal-body">
          <div className="detail-group">
            <label>Account Holder:</label>
            <span>{customerName}</span>
          </div>

          <div className="detail-group">
            <label>Outstanding Amount:</label>
            <span className="amount">R {outstandingAmount.toFixed(2)}</span>
          </div>

          <p className="info-text">
            Would you like to proceed with the payment or set up a payment arrangement?
          </p>
        </div>

        <div className="modal-footer">
          <button className="proceed-button" onClick={handleProceedPayment}>
            Proceed Now
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
