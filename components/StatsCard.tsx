
import React from 'react';

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`${color} p-4 rounded-xl text-white`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;
