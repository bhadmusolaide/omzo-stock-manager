import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', color = 'currentColor' }) => {
  let sizeClass = '';
  switch (size) {
    case 'small':
      sizeClass = 'w-4 h-4';
      break;
    case 'large':
      sizeClass = 'w-8 h-8';
      break;
    case 'medium':
    default:
      sizeClass = 'w-6 h-6';
      break;
  }

  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClass}`}
      style={{ color: color }}
      role="status">
      <span
        className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]"
      >
        Loading...
      </span>
    </div>
  );
};

export default Spinner;