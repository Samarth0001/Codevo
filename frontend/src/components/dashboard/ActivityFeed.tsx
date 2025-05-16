
interface ActivityItem {
    id: number;
    user: string;
    action: string;
    target: string;
    time: string;
  }
  
  interface ActivityFeedProps {
    activities: ActivityItem[];
  }
  
  const ActivityFeed = ({ activities }: ActivityFeedProps) => {
    return (
      <div className="bg-dark-accent border border-dark-border rounded-lg p-4">
        <h3 className="text-md font-medium text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-codevo-blue to-codevo-cyan flex items-center justify-center text-white text-xs font-medium">
                {activity.user.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-white">
                  <span className="font-medium">{activity.user}</span>
                  {' '}
                  <span className="text-gray-400">{activity.action}</span>
                  {' '}
                  <span className="font-medium text-codevo-blue">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default ActivityFeed;
  