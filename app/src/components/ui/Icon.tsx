import React, { useState, useEffect } from 'react';

interface IconProps {
  name: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = '' }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIcon = async () => {
      try {
        const response = await fetch(`/src/icons/${name}.svg`);
        if (response.ok) {
          const svg = await response.text();
          setSvgContent(svg);
        } else {
          console.error(`Failed to load icon: ${name}`);
        }
      } catch (error) {
        console.error(`Error loading icon ${name}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadIcon();
  }, [name]);

  if (loading) {
    return <span className={`icon-container ${className}`.trim()}>...</span>;
  }

  return (
    <span 
      className={`icon-container ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export default Icon;