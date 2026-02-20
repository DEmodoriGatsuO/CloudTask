import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../../hooks/useAuth';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export function RegisterForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({ email, password, displayName });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-on-surface">アカウント作成</h2>

      {register.error && (
        <div className="bg-error-container text-error text-sm p-3 rounded-xl">
          {register.error.message}
        </div>
      )}

      <Input
        label="表示名"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        placeholder="Your name"
      />
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
        minLength={8}
        placeholder="8文字以上"
      />

      <Button type="submit" className="w-full" loading={register.isPending}>
        登録
      </Button>

      <p className="text-sm text-center text-on-surface-variant">
        アカウントをお持ちの方{' '}
        <Link to="/login" className="text-primary-600 hover:underline">ログイン</Link>
      </p>
    </form>
  );
}
