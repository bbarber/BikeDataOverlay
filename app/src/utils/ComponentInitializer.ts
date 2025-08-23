/**
 * Component initialization utilities
 */

import { componentLoader, type TemplateData } from './ComponentLoader.js';
import { HR_ZONES, calculateHRZones, formatZoneRange, DEFAULT_HR_CONFIG } from '../config/HRZoneConfig.js';

export class ComponentInitializer {
  
  /**
   * Initialize all dynamic components
   */
  async initializeComponents() {
    await this.initializeSettingsPanel();
    await this.initializeAnalyticsPanel();
    await this.loadIcons();
  }

  /**
   * Initialize settings panel with HR zone options
   */
  private async initializeSettingsPanel() {
    const hrZones = calculateHRZones(DEFAULT_HR_CONFIG.age, DEFAULT_HR_CONFIG.restingHR);
    
    // Generate zone options
    let zoneOptionsHtml = '';
    for (const zone of HR_ZONES) {
      const zoneData = hrZones.find(z => z.id === zone.id)!;
      const templateData: TemplateData = {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneRange: formatZoneRange(zoneData),
        zoneDescription: zone.description,
        checked: zone.id === DEFAULT_HR_CONFIG.targetZone
      };
      
      zoneOptionsHtml += await componentLoader.renderComponent('zone-option.template', templateData);
    }
    
    // Inject into zone selector
    const zoneSelector = document.getElementById('zoneSelector');
    if (zoneSelector) {
      zoneSelector.innerHTML = zoneOptionsHtml;
    }
  }

  /**
   * Initialize analytics panel with histogram bars
   */
  private async initializeAnalyticsPanel() {
    const hrZones = calculateHRZones(DEFAULT_HR_CONFIG.age, DEFAULT_HR_CONFIG.restingHR);
    
    // Generate histogram bars
    let histogramHtml = '';
    for (const zone of HR_ZONES) {
      const zoneData = hrZones.find(z => z.id === zone.id)!;
      const templateData: TemplateData = {
        zoneId: zone.id,
        zoneColor: zone.color,
        zoneRange: formatZoneRange(zoneData)
      };
      
      histogramHtml += await componentLoader.renderComponent('histogram-bar.template', templateData);
    }
    
    // Inject into histogram container
    const histogramContainer = document.getElementById('histogramContainer');
    if (histogramContainer) {
      histogramContainer.innerHTML = histogramHtml;
    }
  }

  /**
   * Load all icons in the document
   */
  private async loadIcons() {
    const iconContainers = document.querySelectorAll('[data-icon]');
    
    for (const container of iconContainers) {
      const iconName = container.getAttribute('data-icon');
      if (iconName) {
        try {
          const response = await fetch(`/src/icons/${iconName}.svg`);
          if (response.ok) {
            const svg = await response.text();
            container.innerHTML = svg;
          }
        } catch (error) {
          console.error(`Error loading icon ${iconName}:`, error);
        }
      }
    }
  }

  /**
   * Update HR zones when configuration changes
   */
  async updateHRZones(age: number, restingHR: number) {
    const hrZones = calculateHRZones(age, restingHR);
    
    // Update settings panel zone ranges
    for (const zone of HR_ZONES) {
      const zoneData = hrZones.find(z => z.id === zone.id)!;
      const rangeElement = document.getElementById(`zone${zone.id}Range`);
      if (rangeElement) {
        rangeElement.textContent = formatZoneRange(zoneData);
      }
    }
    
    // Update analytics panel zone ranges
    for (const zone of HR_ZONES) {
      const zoneData = hrZones.find(z => z.id === zone.id)!;
      const rangeElement = document.getElementById(`analyticsZone${zone.id}Range`);
      if (rangeElement) {
        rangeElement.textContent = formatZoneRange(zoneData);
      }
    }
  }
}

export const componentInitializer = new ComponentInitializer();