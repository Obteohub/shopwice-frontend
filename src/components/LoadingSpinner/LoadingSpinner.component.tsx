import React from 'react';

type LoadingColor = 'orange' | 'blue' | 'black' | 'white' | 'gray';

interface LoadingSpinnerProps {
  color?: LoadingColor;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ color = 'orange', size = 'md' }) => {
  const colorClasses = {
    orange: 'bg-orange-700',
    blue: 'bg-blue-600',
    black: 'bg-black',
    white: 'bg-white',
    gray: 'bg-gray-400'
  };

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4'
  };

  const dotClass = `${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`;

  return (
    <div className="w-full flex justify-center items-center p-4">
      <div className="flex space-x-1.5 justify-center items-center">
        <span className="sr-only">Loading...</span>
        <div className={`${dotClass} [animation-delay:0s]`}></div>
        <div className={`${dotClass} [animation-delay:0.15s]`}></div>
        <div className={`${dotClass} [animation-delay:0.3s]`}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
