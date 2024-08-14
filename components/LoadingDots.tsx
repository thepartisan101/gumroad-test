import React from 'react';

export const LoadingDots: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 my-2 p-2 md:p-2 self-start">
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};