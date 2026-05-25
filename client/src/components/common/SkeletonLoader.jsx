const SkeletonLoader = ({ rows = 5, cols = 4 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="skeleton h-4 flex-1 rounded" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="card animate-pulse">
    <div className="flex items-center gap-4">
      <div className="skeleton h-12 w-12 rounded-xl" />
      <div className="flex-1">
        <div className="skeleton h-3 w-24 mb-2 rounded" />
        <div className="skeleton h-6 w-16 rounded" />
      </div>
    </div>
  </div>
);

export default SkeletonLoader;
