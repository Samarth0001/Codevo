
interface StatsCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: React.ReactNode;
  }
  
  const StatsCard = ({ title, value, change, trend, icon }: StatsCardProps) => {
    return (
      <div className="bg-dark-accent border border-dark-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-semibold text-white mt-1">{value}</p>
            
            {change && trend && (
              <div className="mt-1 flex items-center">
                <span
                  className={`text-xs font-medium ${
                    trend === 'up' ? 'text-green-500' :
                    trend === 'down' ? 'text-red-500' :
                    'text-gray-400'
                  }`}
                >
                  {trend === 'up' && '↑'}
                  {trend === 'down' && '↓'}
                  {' '}
                  {change}
                </span>
                <span className="text-xs text-gray-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
          <div className="bg-dark-bg p-3 rounded-lg">
            {icon}
          </div>
        </div>
      </div>
    );
  };
  
  export default StatsCard;
  