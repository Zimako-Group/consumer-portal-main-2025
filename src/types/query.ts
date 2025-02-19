export interface Query {
    id: string;
    referenceId: string;
    accountNumber: string;
    customerName: string;
    contactNumber: string;
    queryType: string;
    description: string;
    submissionDate: string;
    status: 'Open' | 'Active' | 'Resolved';
    resolutionMessage?: string;
    lastUpdated: string;
  }