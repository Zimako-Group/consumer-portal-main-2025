import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { WhatsAppService } from '../services/whatsapp/whatsappService';

interface MessageMetrics {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  uniqueUsers: number;
  averageResponseTime: number;
}

interface MessageTypeData {
  name: string;
  value: number;
}

interface DailyMessageData {
  date: string;
  inbound: number;
  outbound: number;
}

interface StatusDistribution {
  name: string;
  value: number;
}

const WhatsAppAnalytics: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [timeRange, setTimeRange] = useState<number>(7); // Default to 7 days
  const [metrics, setMetrics] = useState<MessageMetrics>({
    totalMessages: 0,
    inboundMessages: 0,
    outboundMessages: 0,
    uniqueUsers: 0,
    averageResponseTime: 0
  });
  const [messageTypeData, setMessageTypeData] = useState<MessageTypeData[]>([]);
  const [dailyMessageData, setDailyMessageData] = useState<DailyMessageData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Use the new API endpoint for analytics
      const response = await axios.get(`/api/admin/whatsapp/analytics?days=${timeRange}`);
      const data = response.data;
      
      // Set basic metrics
      setMetrics({
        totalMessages: data.totalMessages,
        inboundMessages: data.inboundMessages,
        outboundMessages: data.outboundMessages,
        uniqueUsers: data.uniqueUsers,
        averageResponseTime: data.averageResponseTime
      });
      
      // Process message types for pie chart
      const messageTypes = Object.entries(data.messageTypes || {}).map(([name, value]) => ({
        name,
        value
      }));
      setMessageTypeData(messageTypes);
      
      // Process status distribution for pie chart
      const statuses = Object.entries(data.statusDistribution || {}).map(([name, value]) => ({
        name,
        value
      }));
      setStatusDistribution(statuses);
      
      // Process daily message data for bar chart
      const dailyData = Object.entries(data.dailyMessageCount || {}).map(([date, counts]: [string, any]) => ({
        date: format(new Date(date), 'MMM dd'),
        inbound: counts.inbound,
        outbound: counts.outbound
      }));
      
      // Sort by date
      dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDailyMessageData(dailyData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching WhatsApp analytics:', error);
      setLoading(false);
    }
  };

  // Fallback to direct service call if API fails
  const fetchAnalyticsDirectly = async () => {
    try {
      const whatsappService = new WhatsAppService();
      const data = await whatsappService.getMessageAnalytics(timeRange);
      
      // Process data as above
      setMetrics({
        totalMessages: data.totalMessages,
        inboundMessages: data.inboundMessages,
        outboundMessages: data.outboundMessages,
        uniqueUsers: data.uniqueUsers,
        averageResponseTime: data.averageResponseTime
      });
      
      // Process message types for pie chart
      const messageTypes = Object.entries(data.messageTypes || {}).map(([name, value]) => ({
        name,
        value
      }));
      setMessageTypeData(messageTypes);
      
      // Process status distribution for pie chart
      const statuses = Object.entries(data.statusDistribution || {}).map(([name, value]) => ({
        name,
        value
      }));
      setStatusDistribution(statuses);
      
      // Process daily message data for bar chart
      const dailyData = Object.entries(data.dailyMessageCount || {}).map(([date, counts]: [string, any]) => ({
        date: format(new Date(date), 'MMM dd'),
        inbound: counts.inbound,
        outbound: counts.outbound
      }));
      
      // Sort by date
      dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDailyMessageData(dailyData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching WhatsApp analytics directly:', error);
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(Number(event.target.value));
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">WhatsApp Analytics</h2>
        <div>
          <label htmlFor="timeRange" className="mr-2">Time Range:</label>
          <select
            id="timeRange"
            value={timeRange}
            onChange={handleTimeRangeChange}
            className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-2">Total Messages</h3>
              <p className="text-3xl font-bold">{metrics.totalMessages}</p>
            </div>
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-2">Inbound</h3>
              <p className="text-3xl font-bold">{metrics.inboundMessages}</p>
            </div>
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-2">Outbound</h3>
              <p className="text-3xl font-bold">{metrics.outboundMessages}</p>
            </div>
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-2">Unique Users</h3>
              <p className="text-3xl font-bold">{metrics.uniqueUsers}</p>
            </div>
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-2">Avg Response Time</h3>
              <p className="text-3xl font-bold">{metrics.averageResponseTime.toFixed(1)}s</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Message Chart */}
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-4">Daily Message Volume</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyMessageData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#555' : '#ccc'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#ddd' : '#333'} />
                    <YAxis stroke={isDarkMode ? '#ddd' : '#333'} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#333' : '#fff',
                        color: isDarkMode ? '#fff' : '#333',
                        border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`
                      }}
                    />
                    <Legend />
                    <Bar dataKey="inbound" name="Inbound" fill="#0088FE" />
                    <Bar dataKey="outbound" name="Outbound" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Message Types Chart */}
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-4">Message Types</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={messageTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {messageTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#333' : '#fff',
                        color: isDarkMode ? '#fff' : '#333',
                        border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`
                      }}
                      formatter={(value: any) => [`${value} messages`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-4">Message Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#333' : '#fff',
                        color: isDarkMode ? '#fff' : '#333',
                        border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`
                      }}
                      formatter={(value: any) => [`${value} messages`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Additional metrics or chart can be added here */}
            <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-4">Engagement Summary</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Inbound/Outbound Ratio</h4>
                  <div className="w-full bg-gray-300 rounded-full h-4">
                    <div 
                      className="bg-blue-500 h-4 rounded-full" 
                      style={{ 
                        width: `${metrics.totalMessages > 0 ? (metrics.inboundMessages / metrics.totalMessages) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Inbound: {metrics.totalMessages > 0 ? ((metrics.inboundMessages / metrics.totalMessages) * 100).toFixed(1) : 0}%</span>
                    <span>Outbound: {metrics.totalMessages > 0 ? ((metrics.outboundMessages / metrics.totalMessages) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Key Insights</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Average of {(metrics.totalMessages / (timeRange || 1)).toFixed(1)} messages per day</li>
                    <li>Each user sends approximately {metrics.uniqueUsers > 0 ? (metrics.inboundMessages / metrics.uniqueUsers).toFixed(1) : 0} messages</li>
                    <li>Response time: {metrics.averageResponseTime < 60 ? 
                      `${metrics.averageResponseTime.toFixed(1)} seconds` : 
                      `${(metrics.averageResponseTime / 60).toFixed(1)} minutes`}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WhatsAppAnalytics;
