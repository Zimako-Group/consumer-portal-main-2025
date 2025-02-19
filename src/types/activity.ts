export type ActivityType =
  | 'payment'
  | 'meter_reading'
  | 'statement'
  | 'query'
  | 'payment_arrangement'
  | 'communication_preference'
  | 'COMMUNICATION_UPDATE'
  | 'STATEMENT_DOWNLOAD'
  | 'PAYMENT'
  | 'METER_READING'
  | 'QUERY_SUBMISSION'
  | 'REPORT_DOWNLOAD'
  | 'ACCOUNT_MANAGEMENT'
  | 'PAYMENT_REMINDER'
  | 'QUERY_UPDATE'
  | 'COMMUNICATION_LOG';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  metadata?: {
    amount?: number;
    meterNumber?: string;
    queryType?: string;
    statementMonth?: string;
    arrangementDetails?: string;
    communicationMethod?: string;
  };
}

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  department?: string;
  name: string;
}