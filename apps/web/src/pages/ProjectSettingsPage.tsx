import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useDeleteProject, useProjectMembers, useRemoveMember } from '../hooks/useProjects';
import { ProjectNav } from '../components/layout/ProjectNav';
import { Input } from '../components/common/Input';
import { TextArea } from '../components/common/TextArea';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Skeleton } from '../components/common/Skeleton';
import { WorkflowEditor } from '../components/workflow/WorkflowEditor';
import { AutomationRuleForm } from '../components/automation/AutomationRuleForm';
import { CustomFieldManager } from '../components/custom-fields/CustomFieldManager';

type Tab = 'general' | 'workflows' | 'automations' | 'custom-fields';

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: projectData, isLoading } = useProject(projectId!);
  const { data: membersData } = useProjectMembers(projectId!);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const removeMember = useRemoveMember();
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const project = projectData?.data;
  const members = membersData?.data || [];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Initialize form when data loads
  if (project && !name) { setName(project.name); setDescription(project.description || ''); }

  if (isLoading) return (
    <>
      <ProjectNav />
      <div className="max-w-2xl space-y-6">
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6 space-y-4">
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="rounded" width="100%" height={40} />
          <Skeleton variant="rounded" width="100%" height={80} />
          <Skeleton variant="rounded" width={100} height={36} />
        </div>
      </div>
    </>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: '一般' },
    { id: 'workflows', label: 'ワークフロー' },
    { id: 'automations', label: '自動化' },
    { id: 'custom-fields', label: 'カスタムフィールド' },
  ];

  return (
    <div>
      <ProjectNav />

      {/* Tabs */}
      <div className="border-b border-outline-variant mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="max-w-2xl space-y-8">
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
            <h2 className="text-lg font-semibold text-on-surface mb-4">一般</h2>
            <div className="space-y-4">
              <Input label="プロジェクト名" value={name} onChange={(e) => setName(e.target.value)} />
              <TextArea label="説明" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button onClick={() => updateProject.mutate({ id: projectId!, data: { name, description } })} loading={updateProject.isPending}>保存</Button>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
            <h2 className="text-lg font-semibold text-on-surface mb-4">メンバー</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.displayName} size="sm" />
                    <div><p className="text-sm font-medium text-on-surface">{m.user.displayName}</p><p className="text-xs text-on-surface-variant">{m.user.email}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge text={m.role} color="#6b7280" />
                    {m.role !== 'project_admin' && (
                      <Button variant="ghost" size="sm" onClick={() => removeMember.mutate({ projectId: projectId!, userId: m.userId })}>削除</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-2xl border border-error p-6">
            <h2 className="text-lg font-semibold text-error mb-2">Danger Zone</h2>
            <p className="text-sm text-on-surface-variant mb-4">Archive this project. This can be undone later.</p>
            <Button variant="danger" onClick={() => setShowDelete(true)}>プロジェクトをアーカイブ</Button>
          </div>
        </div>
      )}

      {activeTab === 'workflows' && projectId && (
        <WorkflowEditor projectId={projectId} />
      )}

      {activeTab === 'automations' && projectId && (
        <AutomationRuleForm projectId={projectId} />
      )}

      {activeTab === 'custom-fields' && projectId && (
        <CustomFieldManager projectId={projectId} />
      )}

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} title="Archive Project" message="Are you sure you want to archive this project?"
        confirmText="Archive" onConfirm={() => deleteProject.mutate(projectId!, { onSuccess: () => navigate('/projects') })} />
    </div>
  );
}
