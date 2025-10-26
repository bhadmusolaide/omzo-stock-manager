import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // For number inputs, allow clearing to empty string
    if (props.type === 'number') {
      const value = e.target.value;
      // Allow empty string or valid numbers
      if (value === '' || !isNaN(Number(value))) {
        props.onChange?.(e);
      }
    } else {
      props.onChange?.(e);
    }
  };

  // Ensure value is never NaN for input elements
  const safeProps = {
    ...props,
    value: props.value !== undefined && props.value !== null
      ? (typeof props.value === 'number' && isNaN(props.value) ? '' : String(props.value))
      : props.value
  };

  return (
    <div className={`${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input
        className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : ''}`}
        {...safeProps}
        onChange={handleInputChange}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Input;
export { Input };