import React from 'react';

const StatsCard = ({ icon: Icon, title, value, change }) => (
  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-emerald-500/10 rounded-lg">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      {change && (
        <span className={`text-sm font-normal ${change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <h3 className="text-gray-400 text-sm font-light mb-1">{title}</h3>
    <p className="text-2xl font-semibold text-white">{value}</p>
  </div>
);

export default StatsCard;