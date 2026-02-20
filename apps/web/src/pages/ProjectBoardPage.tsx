import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { ProjectNav } from '../components/layout/ProjectNav';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { SkeletonKanban } from '../components/common/Skeleton';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useProject(projectId!);

  if (isLoading) return (
    <div>
      <ProjectNav />
      <div className="mb-4">
        <div className="h-7 w-48 bg-surface-container-highest rounded-lg animate-skeleton" />
      </div>
      <SkeletonKanban />
    </div>
  );

  return (
    <div>
      <ProjectNav />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-on-surface">{data?.data?.name}</h1>
      </div>
      <KanbanBoard projectId={projectId!} />
    </div>
  );
}
