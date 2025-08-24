import React, { memo } from 'react';

interface MetricDisplayProps {
  value: string | number;
  label: string;
  extraLabel?: string;
  extraLabelId?: string;
  extraLabelClass?: string;
  valueClassName?: string;
}

const MetricDisplay: React.FC<MetricDisplayProps> = memo(({ 
  value, 
  label, 
  extraLabel,
  extraLabelId,
  extraLabelClass = 'hr-zone-label',
  valueClassName
}) => {
  return (
    <div className="metric-display">
      <div className={`metric-value ${valueClassName || ''}`}>
        {value}
      </div>
      <div className="metric-label">
        {label}
      </div>
      {extraLabel && (
        <div className={extraLabelClass} id={extraLabelId}>
          {extraLabel}
        </div>
      )}
    </div>
  );
});

MetricDisplay.displayName = 'MetricDisplay';

export default MetricDisplay;