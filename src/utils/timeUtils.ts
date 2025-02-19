export const getGreeting = (hour: number): string => {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const getSASTHour = (): number => {
  const date = new Date();
  const saTimeOffset = 2; // SAST is UTC+2
  return (date.getUTCHours() + saTimeOffset) % 24;
};