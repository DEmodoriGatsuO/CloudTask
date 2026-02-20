import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@example.com', password: 'password123', role: '管理者' },
  { label: 'Alice', email: 'member1@example.com', password: 'password123', role: 'メンバー' },
  { label: 'Bob', email: 'member2@example.com', password: 'password123', role: 'メンバー' },
];

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  const handleDemoLogin = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    login.mutate({ email: account.email, password: account.password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-on-surface">ログイン</h2>

      {login.error && (
        <div className="bg-error-container text-error text-sm p-3 rounded-xl">
          {login.error.message}
        </div>
      )}

      <Input
        label="メールアドレス"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="example@email.com"
      />
      <Input
        label="パスワード"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="パスワードを入力"
      />

      <Button type="submit" className="w-full" loading={login.isPending}>
        ログイン
      </Button>

      {/* デモアカウント */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface-container-low px-2 text-on-surface-variant">デモアカウント</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => handleDemoLogin(account)}
            disabled={login.isPending}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-outline-variant px-2 py-2.5 text-xs hover:bg-surface-container-highest hover:border-primary-300 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-on-surface">{account.label}</span>
            <span className="text-on-surface-variant">{account.role}</span>
          </button>
        ))}
      </div>

      <p className="text-sm text-center text-on-surface-variant">
        アカウントをお持ちでない方{' '}
        <Link to="/register" className="text-primary-600 hover:underline">新規登録</Link>
      </p>
    </form>
  );
}
