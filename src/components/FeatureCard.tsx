import React from 'react';
import { Card } from '../components/ui/card';
import { ArrowUpRight, ArrowDownRight, MessageCircle } from 'lucide-react';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  textColor?: string;
  pathColor?: string;
  trailColor?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 64,
  strokeWidth = 8,
  textColor = '#ffffff',
  pathColor = '#22c55e',
  trailColor = '#374151'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trailColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={pathColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
      <div 
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
        style={{ color: textColor }}
      >
        {value}%
      </div>
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  metric?: string;
  trend?: number;
  trendText?: string;
  progressValue?: number;
  onClick?: () => void;
  description?: string;
  bgGradient?: string;
  bgImage?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  value,
  icon,
  metric,
  trend,
  trendText,
  progressValue,
  onClick,
  description,
  bgGradient,
  bgImage
}) => {
  const isPositiveTrend = trend && trend > 0;

  const getProgressColor = (value: number) => {
    if (value >= 80) return '#22c55e'; // green for high resolution rate
    if (value >= 60) return '#eab308'; // yellow for medium resolution rate
    return '#ef4444'; // red for low resolution rate
  };

  const cardStyle = bgImage ? {
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'transparent'
  } : {};

  const cardClasses = `
    p-6 border-0 transition-all duration-300 hover:shadow-lg relative overflow-hidden
    ${onClick ? 'cursor-pointer transform hover:scale-[1.02]' : ''}
    ${!bgImage ? (bgGradient || 'bg-[#1a1f2e]') : ''}
  `;

  return (
    <Card className={cardClasses} style={cardStyle} onClick={onClick}>
      {bgImage && (
        <div 
          className="absolute inset-0" 
          style={{
            background: bgGradient || 'linear-gradient(135deg, rgba(67, 56, 202, 0.7), rgba(126, 34, 206, 0.7))',
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
      
      {/* Content with relative positioning to appear above the overlay */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {icon && (
                <div className="p-2 rounded-lg bg-white/10">
                  {icon}
                </div>
              )}
              <p className="text-sm text-gray-300">{title}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-white">{value}</h3>
              {metric && (
                <span className="text-sm text-gray-400">{metric}</span>
              )}
            </div>
            {description && (
              <p className="mt-2 text-sm text-gray-400">{description}</p>
            )}
          </div>
          {progressValue !== undefined && (
            <div className="w-16 h-16">
              <CircularProgress
                value={progressValue}
                pathColor={getProgressColor(progressValue)}
              />
            </div>
          )}
        </div>

        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {isPositiveTrend ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                isPositiveTrend ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {Math.abs(trend)}%
            </span>
            {trendText && (
              <span className="text-sm text-gray-400 ml-1">{trendText}</span>
            )}
          </div>
        )}
        
        {title === "Query Resolution Rate" && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Resolved Queries</span>
              <span className="text-white font-medium">{progressValue}%</span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${progressValue}%`,
                  backgroundColor: getProgressColor(progressValue)
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Target: 85%</span>
              <span>{`${Math.round(progressValue! / 85 * 100)}% of target`}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FeatureCard;
