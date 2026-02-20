import { useParams } from 'react-router-dom';
import { ProjectNav } from '../components/layout/ProjectNav';
import { WikiEditor } from '../components/wiki/WikiEditor';

export function WikiPageView() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div>
      <ProjectNav />
      {projectId && <WikiEditor projectId={projectId} />}
    </div>
  );
}
