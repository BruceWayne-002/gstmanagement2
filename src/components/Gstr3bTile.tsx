import React from 'react';

const Gstr3bTile: React.FC<{ title: string; rows: { label: string; value: number }[]; onClick?: () => void }> = ({ title, rows, onClick }) => {
  return (
    <div className={`rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <div className="bg-[#17375E] text-white p-4">
        <div className="font-semibold">{title}</div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        {rows.map((row, idx) => (
          <React.Fragment key={idx}>
            <div className="text-sm text-gray-600">{row.label}</div>
            <div className="text-sm font-medium text-right">₹{(row.value || 0).toFixed(2)}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Gstr3bTile;
