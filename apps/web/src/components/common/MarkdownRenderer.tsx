import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseInline(text: string): string {
  let result = escapeHtml(text);
  // Bold **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');
  // Strikethrough ~~text~~
  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Inline code `code`
  result = result.replace(/`([^`]+)`/g, '<code class="bg-surface-container-highest text-primary-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline hover:text-primary-700">$1</a>');
  // @mentions
  result = result.replace(/@(\w+)/g, '<span class="text-primary-600 font-medium">@$1</span>');
  return result;
}

function parseMarkdown(text: string): string {
  const lines = text.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  function flushList() {
    if (inList && listItems.length > 0) {
      html.push('<ul class="list-disc list-inside space-y-0.5 my-1">' + listItems.map(li => `<li>${parseInline(li)}</li>`).join('') + '</ul>');
      listItems = [];
      inList = false;
    }
  }

  for (const line of lines) {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push('<pre class="bg-surface-container-highest rounded-lg p-3 text-xs font-mono overflow-x-auto my-2"><code>' + escapeHtml(codeBlockContent.join('\n')) + '</code></pre>');
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) { flushList(); html.push(`<h3 class="text-sm font-semibold text-on-surface mt-3 mb-1">${parseInline(h3Match[1])}</h3>`); continue; }
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) { flushList(); html.push(`<h2 class="text-base font-semibold text-on-surface mt-3 mb-1">${parseInline(h2Match[1])}</h2>`); continue; }
    const h1Match = line.match(/^#\s+(.+)/);
    if (h1Match) { flushList(); html.push(`<h1 class="text-lg font-bold text-on-surface mt-3 mb-1">${parseInline(h1Match[1])}</h1>`); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { flushList(); html.push('<hr class="border-outline-variant my-2" />'); continue; }

    // Blockquote
    const quoteMatch = line.match(/^>\s?(.*)/);
    if (quoteMatch) { flushList(); html.push(`<blockquote class="border-l-2 border-outline-variant pl-3 text-on-surface-variant italic my-1">${parseInline(quoteMatch[1])}</blockquote>`); continue; }

    // Unordered list
    const listMatch = line.match(/^[-*]\s+(.+)/);
    if (listMatch) { inList = true; listItems.push(listMatch[1]); continue; }

    // If we were in a list and this line is not a list item, flush
    flushList();

    // Empty line
    if (line.trim() === '') { html.push('<br />'); continue; }

    // Regular paragraph
    html.push(`<p class="my-0.5">${parseInline(line)}</p>`);
  }

  // Close unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    html.push('<pre class="bg-surface-container-highest rounded-lg p-3 text-xs font-mono overflow-x-auto my-2"><code>' + escapeHtml(codeBlockContent.join('\n')) + '</code></pre>');
  }
  flushList();

  return html.join('');
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={`text-sm text-on-surface leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
