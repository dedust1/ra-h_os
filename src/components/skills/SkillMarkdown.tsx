"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SkillMarkdown({ content }: { content: string }) {
  return (
    <div className="skill-content" style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.6' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#eee', margin: '0 0 16px 0' }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#ddd', margin: '20px 0 8px 0' }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ccc', margin: '16px 0 6px 0' }}>{children}</h3>
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
                <code
                  style={{
                    background: '#1a1a1a',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#22c55e',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  display: 'block',
                  background: '#0d0d0d',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  margin: '0 0 12px 0',
                  color: '#aaa',
                  whiteSpace: 'pre-wrap',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre style={{ margin: '0 0 12px 0' }}>{children}</pre>
          ),
          strong: ({ children }) => (
            <strong style={{ color: '#eee', fontWeight: 600 }}>{children}</strong>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid #2a2a2a', margin: '16px 0' }} />
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '3px solid #333',
                paddingLeft: '12px',
                margin: '0 0 12px 0',
                color: '#999',
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
