import React, { useEffect, useState } from "react";
import { listenToActivities } from "../firebaseServices";

interface Activity {
  id: string;
  userType: string;
  activityType: string;
  details: Record<string, any>;
  timestamp: { seconds: number; nanoseconds: number };
}

const RecentActivities: React.FC<{ userType: string }> = ({ userType }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const unsubscribe = listenToActivities((allActivities) => {
      // Filter activities based on userType
      const filteredActivities = allActivities.filter(
        (activity) => activity.userType === userType
      );
      setActivities(filteredActivities.slice(0, 3)); // Limit to 3 recent activities
    });

    return () => unsubscribe(); // Clean up listener on unmount
  }, [userType]);

  return (
    <div>
      <h3>Recent Activities</h3>
      <ul>
        {activities.map((activity) => (
          <li key={activity.id}>
            <strong>{activity.activityType}</strong>: {JSON.stringify(activity.details)} <br />
            <small>{new Date(activity.timestamp.seconds * 1000).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivities;
