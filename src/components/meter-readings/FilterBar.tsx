import React from 'react';
import { Search } from 'lucide-react';
import DatePicker from 'react-datepicker';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedMeterType: string;
  onMeterTypeChange: (value: string) => void;
  dateRange: [Date | null, Date | null];
  onDateRangeChange: (update: [Date | null, Date | null]) => void;
}

function FilterBar({
  searchTerm,
  onSearchChange,
  selectedMeterType,
  onMeterTypeChange,
  dateRange,
  onDateRangeChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by account or meter number..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="flex-1 min-w-[200px]">
        <select
          value={selectedMeterType}
          onChange={(e) => onMeterTypeChange(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        >
          <option value="all">All Meter Types</option>
          <option value="Water">Water</option>
          <option value="Electric">Electric</option>
          <option value="Gas">Gas</option>
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <DatePicker
          selectsRange
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          onChange={(update) => onDateRangeChange(update)}
          className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          placeholderText="Select date range..."
        />
      </div>
    </div>
  );
}

export default FilterBar;