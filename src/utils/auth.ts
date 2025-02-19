interface UserCredentials {
    email: string;
    password: string;
  }
  
  const USER_CREDENTIALS: Record<string, string> = {
    'tshepang@zimako.co.za': '12345678',
    'mudau@zimako.co.za': '12345678',
    'admin@zimako.co.za': '12345678'
  };
  
  export const validateCredentials = (credentials: UserCredentials): boolean => {
    const storedPassword = USER_CREDENTIALS[credentials.email];
    return storedPassword === credentials.password;
  };