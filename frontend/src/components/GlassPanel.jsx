/**
 * GlassPanel Component
 * Glassmorphism panel with optional shimmer border effect
 */

export const GlassPanel = ({
    children,
    className = '',
    withShimmer = false,
    padding = 'p-8',
}) => {
    return (
        <div
            className={`glass-panel ${withShimmer ? 'shimmer-border' : ''} ${padding} ${className}`}
        >
            {children}
        </div>
    );
};
