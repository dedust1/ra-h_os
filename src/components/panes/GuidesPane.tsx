"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PaneHeader from './PaneHeader';
import type { BasePaneProps } from './types';

interface GuideMeta {
  name: string;
  description: string;
  immutable: boolean;
}

interface Guide extends GuideMeta {
  content: string;
}

export default function GuidesPane({
  slot,
  isActive,
  onPaneAction,
  onCollapse,
  onSwapPanes,
  tabBar,
}: BasePaneProps) {
  const [guides, setGuides] = useState<GuideMeta[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchGuides();

    const handleGuideUpdated = () => { fetchGuides(); };
    window.addEventListener('guides:updated', handleGuideUpdated);
    return () => window.removeEventListener('guides:updated', handleGuideUpdated);
  }, []);

  const fetchGuides = async () => {
    try {
      const res = await fetch('/api/guides');
      const data = await res.json();
      if (data.success) {
        setGuides(data.data);
      }
    } catch (err) {
      console.error('[GuidesPane] Failed to fetch guides:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuide = async (name: string) => {
    try {
      const res = await fetch(`/api/guides/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedGuide(data.data);
      }
    } catch (err) {
      console.error('[GuidesPane] Failed to fetch guide:', err);
    }
  };

  const handleDeleteGuide = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete guide "${name}"?`)) return;

    setDeleting(name);
    try {
      const res = await fetch(`/api/guides/${encodeURIComponent(name)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchGuides();
        if (selectedGuide?.name === name) {
          setSelectedGuide(null);
        }
      }
    } catch (err) {
      console.error('[GuidesPane] Failed to delete guide:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleBack = () => {
    setSelectedGuide(null);
  };

  const systemGuides = guides.filter(g => g.immutable);
  const userGuides = guides.filter(g => !g.immutable);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      <PaneHeader slot={slot} onCollapse={onCollapse} onSwapPanes={onSwapPanes} tabBar={tabBar}>
        {selectedGuide ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--rah-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--rah-text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--rah-text-muted)'; }}
            >
              <ArrowLeft size={16} />
            </button>
            <span style={{ color: 'var(--rah-text-secondary)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {selectedGuide.immutable && <Lock size={12} style={{ color: '#22c55e' }} />}
              {selectedGuide.name}
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--rah-text-muted)', fontSize: '11px' }}>
            {userGuides.length} of 10 custom guides
          </span>
        )}
      </PaneHeader>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px' }}>
        {loading ? (
          <div style={{ color: 'var(--rah-text-muted)', fontSize: '13px', textAlign: 'center', paddingTop: '24px' }}>
            Loading...
          </div>
        ) : selectedGuide ? (
          <div className="guide-content" style={{ color: 'var(--rah-text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--rah-text-base)', margin: '0 0 16px 0' }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--rah-text-base)', margin: '20px 0 8px 0' }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--rah-text-secondary)', margin: '16px 0 6px 0' }}>{children}</h3>
                ),
                p: ({ children }) => (
                  <p style={{ margin: '0 0 12px 0' }}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ margin: '0 0 4px 0' }}>{children}</li>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code style={{
                        background: 'var(--rah-bg-active)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#22c55e',
                      }} {...props}>{children}</code>
                    );
                  }
                  return (
                    <code style={{
                      display: 'block',
                      background: 'var(--rah-bg-surface)',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflowX: 'auto',
                      margin: '0 0 12px 0',
                      color: 'var(--rah-text-muted)',
                      whiteSpace: 'pre-wrap',
                    }} {...props}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre style={{ margin: '0 0 12px 0' }}>{children}</pre>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: 'var(--rah-text-base)', fontWeight: 600 }}>{children}</strong>
                ),
                hr: () => (
                  <hr style={{ border: 'none', borderTop: '1px solid var(--rah-border-strong)', margin: '16px 0' }} />
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: '1px solid var(--rah-border-stronger)',
                    paddingLeft: '12px',
                    margin: '0 0 12px 0',
                    color: 'var(--rah-text-muted)',
                  }}>{children}</blockquote>
                ),
              }}
            >
              {selectedGuide.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {guides.length === 0 ? (
              <div style={{ color: 'var(--rah-text-muted)', fontSize: '13px', textAlign: 'center', paddingTop: '24px' }}>
                No guides found
              </div>
            ) : (
              <>
                {systemGuides.length > 0 && (
                  <div style={{ color: 'var(--rah-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>
                    System Guides
                  </div>
                )}
                {systemGuides.map((guide) => (
                  <GuideCard
                    key={guide.name}
                    guide={guide}
                    onSelect={handleSelectGuide}
                    onDelete={handleDeleteGuide}
                    deleting={deleting}
                  />
                ))}
                {userGuides.length > 0 && (
                  <div style={{ color: 'var(--rah-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 0 4px 0' }}>
                    Custom Guides
                  </div>
                )}
                {userGuides.map((guide) => (
                  <GuideCard
                    key={guide.name}
                    guide={guide}
                    onSelect={handleSelectGuide}
                    onDelete={handleDeleteGuide}
                    deleting={deleting}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideCard({
  guide,
  onSelect,
  onDelete,
  deleting,
}: {
  guide: GuideMeta;
  onSelect: (name: string) => void;
  onDelete: (name: string, e: React.MouseEvent) => void;
  deleting: string | null;
}) {
  return (
    <button
      onClick={() => onSelect(guide.name)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        background: 'var(--rah-bg-elevated)',
        border: '1px solid var(--rah-bg-active)',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--rah-bg-active)';
        e.currentTarget.style.borderColor = 'var(--rah-border-stronger)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--rah-bg-elevated)';
        e.currentTarget.style.borderColor = 'var(--rah-bg-active)';
      }}
    >
      {guide.immutable && (
        <Lock size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: 'var(--rah-text-base)', fontSize: '13px', fontWeight: 500 }}>
          {guide.name}
        </span>
        <span style={{ color: 'var(--rah-text-muted)', fontSize: '12px', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
          {guide.description}
        </span>
      </div>
      {!guide.immutable && (
        <button
          onClick={(e) => onDelete(guide.name, e)}
          disabled={deleting === guide.name}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--rah-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            opacity: deleting === guide.name ? 0.3 : 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--rah-text-muted)'; }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </button>
  );
}
