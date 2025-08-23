/**
 * Component loading and templating utility
 */

interface TemplateData {
  [key: string]: any;
}

interface IconManager {
  loadIcon(iconName: string): Promise<string>;
  injectIcons(container: HTMLElement): Promise<void>;
}

class ComponentLoader {
  private templateCache: Map<string, string> = new Map();
  private iconManager: IconManager;

  constructor() {
    this.iconManager = new IconManagerImpl();
  }

  /**
   * Load a component template from file
   */
  async loadTemplate(componentPath: string): Promise<string> {
    if (this.templateCache.has(componentPath)) {
      return this.templateCache.get(componentPath)!;
    }

    try {
      // Ensure .template extension if not provided
      const templatePath = componentPath.endsWith('.template') ? componentPath : `${componentPath.replace('.html', '')}.template`;
      const response = await fetch(`/src/components/${templatePath}`);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${templatePath}`);
      }
      
      const template = await response.text();
      this.templateCache.set(componentPath, template);
      return template;
    } catch (error) {
      console.error(`Error loading component ${componentPath}:`, error);
      return '';
    }
  }

  /**
   * Simple template replacement for {{key}} patterns
   */
  interpolateTemplate(template: string, data: TemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Handle conditional blocks {{#if condition}} ... {{/if}}
   */
  processConditionals(template: string, data: TemplateData): string {
    return template.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      return data[condition] ? content : '';
    });
  }

  /**
   * Render a component with data
   */
  async renderComponent(componentPath: string, data: TemplateData = {}): Promise<string> {
    let template = await this.loadTemplate(componentPath);
    
    // Process conditionals first
    template = this.processConditionals(template, data);
    
    // Then interpolate variables
    template = this.interpolateTemplate(template, data);
    
    return template;
  }

  /**
   * Load and inject a component into a container element
   */
  async loadIntoContainer(containerId: string, componentPath: string, data: TemplateData = {}): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element with id '${containerId}' not found`);
      return;
    }

    const html = await this.renderComponent(componentPath, data);
    container.innerHTML = html;
    
    // Inject icons after loading the component
    await this.iconManager.injectIcons(container);
  }

  /**
   * Append a component to a container element
   */
  async appendToContainer(containerId: string, componentPath: string, data: TemplateData = {}): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element with id '${containerId}' not found`);
      return;
    }

    const html = await this.renderComponent(componentPath, data);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Inject icons into the temporary container
    await this.iconManager.injectIcons(tempDiv);
    
    // Move all child nodes to the actual container
    while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild);
    }
  }
}

class IconManagerImpl implements IconManager {
  private iconCache: Map<string, string> = new Map();

  async loadIcon(iconName: string): Promise<string> {
    if (this.iconCache.has(iconName)) {
      return this.iconCache.get(iconName)!;
    }

    try {
      const response = await fetch(`/src/icons/${iconName}.svg`);
      if (!response.ok) {
        throw new Error(`Failed to load icon: ${iconName}`);
      }
      
      const svg = await response.text();
      this.iconCache.set(iconName, svg);
      return svg;
    } catch (error) {
      console.error(`Error loading icon ${iconName}:`, error);
      return '';
    }
  }

  async injectIcons(container: HTMLElement): Promise<void> {
    const iconContainers = container.querySelectorAll('[data-icon]');
    
    for (const iconContainer of iconContainers) {
      const iconName = iconContainer.getAttribute('data-icon');
      if (iconName) {
        const svg = await this.loadIcon(iconName);
        iconContainer.innerHTML = svg;
      }
    }
  }
}

export const componentLoader = new ComponentLoader();
export { ComponentLoader, type TemplateData };