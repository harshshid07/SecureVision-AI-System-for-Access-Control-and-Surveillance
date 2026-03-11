/**
 * StatCard Component
 * Dashboard stat card with hover effect and icon
 */

export const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'primary-blue',
    trend,
}) => {
    const colorClasses = {
        'primary-blue': 'text-primary-blue',
        'green': 'text-green-400',
        'yellow': 'text-yellow-400',
        'blue': 'text-blue-400',
    };

    return (
        <div className="stat-card">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-dark-muted text-sm mb-1">{title}</p>
                    <h3 className={`stat-number ${colorClasses[color] || colorClasses['primary-blue']}`}>
                        {value}
                    </h3>
                    {trend && (
                        <p className="text-xs text-dark-muted mt-2">{trend}</p>
                    )}
                </div>
                <div className={`text-5xl ${colorClasses[color] || colorClasses['primary-blue']} opacity-80`}>
                    {Icon && <Icon size={48} />}
                </div>
            </div>
        </div>
    );
};
