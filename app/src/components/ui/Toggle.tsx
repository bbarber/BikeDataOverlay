import React from 'react';

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({ 
  id, 
  label, 
  checked, 
  onChange, 
  className = '' 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className={`filter-toggle ${className}`.trim()}>
      <input 
        type="checkbox" 
        id={id} 
        className="toggle-checkbox"
        checked={checked}
        onChange={handleChange}
      />
      <label htmlFor={id} className="toggle-label">
        <span className="toggle-slider"></span>
        <span className="toggle-text">{label}</span>
      </label>
    </div>
  );
};

export default Toggle;