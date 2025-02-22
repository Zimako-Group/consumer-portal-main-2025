import { createSuperAdmin } from '../src/utils/createSuperAdmin';

// Replace these values with your desired super admin details
const newSuperAdmin = {
  email: "your.email@zimako.co.za",
  password: "YourStrongPassword123!",
  fullName: "Your Full Name"
};

createSuperAdmin(newSuperAdmin)
  .then(() => {
    console.log('Super admin created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create super admin:', error);
    process.exit(1);
  });
