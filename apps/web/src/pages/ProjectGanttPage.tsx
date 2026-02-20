import { useParams } from 'react-router-dom';
import { ProjectNav } from '../components/layout/ProjectNav';
import { GanttChart } from '../components/gantt/GanttChart';
import { useProjectMembers } from '../hooks/useProjects';

export function ProjectGanttPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: membersData } = useProjectMembers(projectId!);
  const members = membersData?.data || [];

  return (
    <div>
      <ProjectNav />
      <h1 className="text-xl font-bold text-on-surface mb-4">Gantt Chart</h1>
      <GanttChart projectId={projectId!} members={members} />
    </div>
  );
}
