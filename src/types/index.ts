export interface CommunicationPreferences {
  sms: { enabled: boolean; value: string };
  whatsapp: { enabled: boolean; value: string };
  email: { enabled: boolean; value: string };
}
