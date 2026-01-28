/**
 * Projects Helper - Browser-compatible version
 * Fetches project data from the server's /editors/api/projects endpoint
 */

export class ProjectsHelper {
  static async getProjects() {
    try {
      const response = await fetch('/editors/api/projects');
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      const projects = await response.json();
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  /**
   * Get a project by its directory name
   */
  static async getProjectByDir(dirName) {
    const projects = await this.getProjects();
    return projects.find(p => p.dir === dirName);
  }

  /**
   * Get the URL for a project by its directory name
   */
  static async getProjectUrl(dirName) {
    const project = await this.getProjectByDir(dirName);
    return project ? `/editors/${project.url}/` : null;
  }

  /**
   * Get all visible projects (not hidden)
   */
  static async getVisibleProjects() {
    const projects = await this.getProjects();
    return projects.filter(p => !p.hide);
  }
}
