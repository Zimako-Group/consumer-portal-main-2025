import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, Calendar, Activity, UserCheck, LogIn, Eye } from 'lucide-react';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { format, subDays, startOfDay, endOfDay, isToday, isYesterday } from 'date-fns';

interface LoginData {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  timestamp: Date;
  component: string;
}

interface LoginStats {
  todayLogins: number;
  weekLogins: number;
  monthLogins: number;
  uniqueUsersToday: number;
  uniqueUsersWeek: number;
  uniqueUsersMonth: number;
  recentLogins: LoginData[];
  loginsByDay: { date: string; count: number }[];
  loginsByRole: { role: string; count: number }[];
}

export default function UserLoginAnalytics() {
  const [stats, setStats] = useState<LoginStats>({
    todayLogins: 0,
    weekLogins: 0,
    monthLogins: 0,
    uniqueUsersToday: 0,
    uniqueUsersWeek: 0,
    uniqueUsersMonth: 0,
    recentLogins: [],
    loginsByDay: [],
    loginsByRole: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchLoginAnalytics();
  }, [selectedTimeframe]);

  const fetchLoginAnalytics = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);
      
      let daysToFetch = 7;
      if (selectedTimeframe === '30d') daysToFetch = 30;
      if (selectedTimeframe === '90d') daysToFetch = 90;
      const timeframeStart = subDays(now, daysToFetch);

      // Fetch all login activities
      const activitiesRef = collection(db, 'userActivities');
      const loginQuery = query(
        activitiesRef,
        where('action', '==', 'login'),
        where('timestamp', '>=', Timestamp.fromDate(timeframeStart)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(loginQuery);
      
      // Process login data
      const allLogins: LoginData[] = [];
      const uniqueUsersToday = new Set<string>();
      const uniqueUsersWeek = new Set<string>();
      const uniqueUsersMonth = new Set<string>();
      const loginsByDay = new Map<string, number>();
      const loginsByRole = new Map<string, number>();
      
      let todayCount = 0;
      let weekCount = 0;
      let monthCount = 0;

      // Fetch user details for recent logins
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersMap = new Map();
      usersSnapshot.forEach(doc => {
        usersMap.set(doc.id, doc.data());
      });

      snapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate() || new Date();
        const userId = data.userId;
        const userData = usersMap.get(userId);

        const loginData: LoginData = {
          userId,
          userEmail: userData?.email || data.metadata?.email || 'Unknown',
          userName: userData?.fullName || userData?.name || 'Unknown User',
          userRole: userData?.role || data.metadata?.userRole || 'user',
          timestamp,
          component: data.component || 'Unknown'
        };

        allLogins.push(loginData);

        // Count by timeframe
        if (timestamp >= todayStart) {
          todayCount++;
          uniqueUsersToday.add(userId);
        }
        if (timestamp >= weekAgo) {
          weekCount++;
          uniqueUsersWeek.add(userId);
        }
        if (timestamp >= monthAgo) {
          monthCount++;
          uniqueUsersMonth.add(userId);
        }

        // Group by day
        const dateKey = format(timestamp, 'MMM dd');
        loginsByDay.set(dateKey, (loginsByDay.get(dateKey) || 0) + 1);

        // Group by role
        const role = loginData.userRole;
        loginsByRole.set(role, (loginsByRole.get(role) || 0) + 1);
      });

      // Convert maps to arrays and sort
      const loginsByDayArray = Array.from(loginsByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .reverse()
        .slice(0, daysToFetch);

      const loginsByRoleArray = Array.from(loginsByRole.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        todayLogins: todayCount,
        weekLogins: weekCount,
        monthLogins: monthCount,
        uniqueUsersToday: uniqueUsersToday.size,
        uniqueUsersWeek: uniqueUsersWeek.size,
        uniqueUsersMonth: uniqueUsersMonth.size,
        recentLogins: allLogins.slice(0, 10),
        loginsByDay: loginsByDayArray,
        loginsByRole: loginsByRoleArray
      });
    } catch (error) {
      console.error('Error fetching login analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`;
    return format(date, 'MMM dd, HH:mm');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin': return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30';
      case 'admin': return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30';
      case 'customer': return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30';
      default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white/80 dark:bg-slate-800/40 rounded-2xl p-8 border border-gray-200/50 dark:border-slate-700/50 backdrop-blur-md">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Login Analytics</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Real-time user authentication tracking</p>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex gap-2 bg-gray-100 dark:bg-slate-800/50 rounded-lg p-1 border border-gray-300 dark:border-slate-700/50">
          {(['7d', '30d', '90d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTimeframe === timeframe
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50'
              }`}
            >
              {timeframe === '7d' ? '7 Days' : timeframe === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-800/40 border border-blue-200/50 dark:border-blue-500/20 rounded-xl p-6 backdrop-blur-md shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <LogIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-2 py-1 rounded-full">Today</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.todayLogins}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Logins</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-700 dark:text-gray-300">{stats.uniqueUsersToday} unique users</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 dark:bg-slate-800/40 border border-purple-200/50 dark:border-purple-500/20 rounded-xl p-6 backdrop-blur-md shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-2 py-1 rounded-full">7 Days</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.weekLogins}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Weekly Logins</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-700 dark:text-gray-300">{stats.uniqueUsersWeek} unique users</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-slate-800/40 border border-green-200/50 dark:border-green-500/20 rounded-xl p-6 backdrop-blur-md shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-full">30 Days</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.monthLogins}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Monthly Logins</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-gray-700 dark:text-gray-300">{stats.uniqueUsersMonth} unique users</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 dark:bg-slate-800/40 border border-orange-200/50 dark:border-orange-500/20 rounded-xl p-6 backdrop-blur-md shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 px-2 py-1 rounded-full">Avg</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.weekLogins > 0 ? Math.round(stats.weekLogins / 7) : 0}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Daily Average</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300">Last 7 days</span>
          </div>
        </motion.div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Login Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white/80 dark:bg-slate-800/40 rounded-xl p-6 border border-gray-200/50 dark:border-slate-700/50 backdrop-blur-md shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Login Trend
          </h3>
          <div className="space-y-3">
            {stats.loginsByDay.map((day, index) => {
              const maxCount = Math.max(...stats.loginsByDay.map(d => d.count));
              const percentage = (day.count / maxCount) * 100;
              
              return (
                <div key={index} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{day.date}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{day.count} logins</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.1 * index, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full group-hover:from-purple-400 group-hover:to-blue-400 transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Login by Role */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/80 dark:bg-slate-800/40 rounded-xl p-6 border border-gray-200/50 dark:border-slate-700/50 backdrop-blur-md shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            By Role
          </h3>
          <div className="space-y-4">
            {stats.loginsByRole.map((roleData, index) => {
              const total = stats.loginsByRole.reduce((sum, r) => sum + r.count, 0);
              const percentage = (roleData.count / total) * 100;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full border ${getRoleBadgeColor(roleData.role)}`}>
                      {roleData.role}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{roleData.count}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.1 * index, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Recent Login Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white/80 dark:bg-slate-800/40 rounded-xl p-6 border border-gray-200/50 dark:border-slate-700/50 backdrop-blur-md shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Recent Login Activity
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {stats.recentLogins.map((login, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-700/30 rounded-lg border border-gray-200/50 dark:border-slate-600/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-gray-100/70 dark:hover:bg-slate-700/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {login.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {login.userName}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{login.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${getRoleBadgeColor(login.userRole)}`}>
                  {login.userRole}
                </span>
                <div className="text-right">
                  <p className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(login.timestamp)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
