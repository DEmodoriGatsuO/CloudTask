import { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar } from './Avatar';

interface MentionCandidate {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

interface MentionTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  candidates: MentionCandidate[];
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MentionTextArea({ value, onChange, candidates, placeholder, className = '', rows = 3 }: MentionTextAreaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filtered = mentionQuery
    ? candidates.filter(c =>
        c.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : candidates.slice(0, 6);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    // Check if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex >= 0) {
      // Ensure @ is at start or preceded by whitespace
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
        const query = textBeforeCursor.slice(atIndex + 1);
        // Only show suggestions if query doesn't contain spaces (still typing mention)
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionStartPos(atIndex);
          setShowSuggestions(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setShowSuggestions(false);
    setMentionQuery('');
  }, [onChange]);

  const insertMention = useCallback((candidate: MentionCandidate) => {
    const before = value.slice(0, mentionStartPos);
    const afterCursor = textareaRef.current?.selectionStart || value.length;
    const after = value.slice(afterCursor);
    // Insert @displayName followed by a space
    const mention = `@${candidate.displayName} `;
    const newValue = before + mention + after;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');

    // Set cursor after mention
    requestAnimationFrame(() => {
      const pos = before.length + mention.length;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }, [value, mentionStartPos, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [showSuggestions, filtered, selectedIndex, insertMention]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border border-outline-variant rounded-xl px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${className}`}
      />

      {showSuggestions && filtered.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 mb-1 w-64 bg-surface border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50"
        >
          <div className="px-3 py-1.5 border-b border-outline-variant">
            <span className="text-xs text-on-surface-variant font-medium">メンバーを選択</span>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => insertMention(candidate)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                  index === selectedIndex ? 'bg-primary-50 text-primary-700' : 'text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <Avatar name={candidate.displayName} src={candidate.avatarUrl} size="sm" />
                <span className="text-sm font-medium truncate">{candidate.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
