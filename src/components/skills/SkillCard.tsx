"use client";

import { Trash2 } from 'lucide-react';

interface SkillMeta {
  name: string;
  description: string;
  immutable: boolean;
}

interface SkillCardProps {
  skill: SkillMeta;
  onSelect: (name: string) => void;
  onDelete?: (name: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  deleting?: string | null;
}

export default function SkillCard({
  skill,
  onSelect,
  onDelete,
  deleting = null,
}: SkillCardProps) {
  const isDeleting = deleting === skill.name;

  return (
    <div
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#1a1a1a';
        e.currentTarget.style.borderColor = '#383838';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#161616';
        e.currentTarget.style.borderColor = '#222';
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        background: '#161616',
        border: '1px solid #222',
        borderRadius: '8px',
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(skill.name)}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
        }}
      >
        <span style={{ color: '#ddd', fontSize: '13px', fontWeight: 500, display: 'block' }}>{skill.name}</span>
        <span
          style={{
            color: '#777',
            fontSize: '12px',
            lineHeight: '1.4',
            display: 'block',
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={skill.description}
        >
          {skill.description}
        </span>
      </button>
      {onDelete && !skill.immutable && (
        <button
          type="button"
          onClick={(e) => onDelete(skill.name, e)}
          disabled={isDeleting}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#555',
            cursor: isDeleting ? 'default' : 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: isDeleting ? 0.3 : 1,
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
