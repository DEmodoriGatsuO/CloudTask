import { useState, useEffect } from 'react';
import { useAuthContext } from '../stores/auth-store';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { api } from '../api/client';

export function ProfileSettingsPage() {
  const { user } = useAuthContext();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/users/${user?.id}`, { displayName });
      setMessage('プロフィールを更新しました');
    } catch { setMessage('プロフィールの更新に失敗しました'); }
    setSaving(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-on-surface mb-6">プロフィール設定</h1>
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
        {message && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-xl">{message}</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="メールアドレス" value={user?.email || ''} disabled />
          <Input label="表示名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <Button type="submit" loading={saving}>保存</Button>
        </form>
      </div>
    </div>
  );
}
