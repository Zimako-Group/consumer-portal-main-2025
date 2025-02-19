export interface MeterReading {
    id: string;
    accountNumber: string;
    meterNumber: string;
    meterType: 'Water' | 'Electric' | 'Gas';
    tariffCode: string;
    previousReading: {
      value: number;
      date: Date;
    };
    currentReading: {
      value: number;
      date: Date;
      image: string;
    };
    isAnomaly: boolean;
  }