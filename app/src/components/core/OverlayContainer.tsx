import React, { ReactNode } from 'react';

interface OverlayContainerProps {
  className?: string;
  children: ReactNode;
}

const OverlayContainer: React.FC<OverlayContainerProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`overlay-container ${className}`.trim()}>
      {children}
    </div>
  );
};

export default OverlayContainer;