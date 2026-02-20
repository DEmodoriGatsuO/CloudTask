import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { TextArea } from '../components/common/TextArea';
import { SkeletonCard, Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';

export function ProjectListPage() {
  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const projects = data?.data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({ name, description: description || undefined }, {
      onSuccess: () => { setShowCreate(false); setName(''); setDescription(''); },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="160px" height={28} />
          <Skeleton variant="rounded" width={120} height={36} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Project</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Project</Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects" description="Create your first project to get started" action={<Button onClick={() => setShowCreate(true)}>Create Project</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}/board`}
              className="bg-surface-container-low rounded-2xl border border-outline-variant p-5 hover:bg-surface-container-high transition-colors">
              <h3 className="font-semibold text-on-surface">{project.name}</h3>
              <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{project.description || 'No description'}</p>
              <div className="flex gap-4 mt-3 text-xs text-on-surface-variant">
                <span>{project.memberCount} Members</span>
                <span>{project.taskCount} Tasks</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate} loading={createProject.isPending}>Create</Button></>}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Project Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter project name" />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description (optional)" />
        </form>
      </Modal>
    </div>
  );
}
