import { useEffect, useState } from 'react';
import { getToken } from '../api/client';

/**
 * Authorization ヘッダー付きで URL を fetch し、Blob URL に変換して返すフック。
 * <img src> / <iframe src> は Bearer トークンを送れないため、
 * 認証が必要なエンドポイントから画像・PDF を取得してプレビューする際に使用する。
 *
 * @param url  取得対象のURL（null のときは何もしない）
 * @returns    Blob URL（準備中は null）
 */
export function useAuthenticatedBlobUrl(url: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
      // 古い Blob URL を解放してメモリリークを防ぐ
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return blobUrl;
}
