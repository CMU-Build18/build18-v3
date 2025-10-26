export async function fetchProjects() {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }
  
  export async function fetchProject(id) {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      return null;
    }
  }