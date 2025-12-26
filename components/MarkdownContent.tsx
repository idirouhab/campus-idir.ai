'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="markdown-content prose max-w-none">
      <style jsx global>{`
        .markdown-content {
          color: #374151;
        }

        .markdown-content h1 {
          color: #111827;
          font-size: 2.5rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          border-bottom: 2px solid #10b981;
          padding-bottom: 0.5rem;
        }

        .markdown-content h2 {
          color: #111827;
          font-size: 2rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }

        .markdown-content h3 {
          color: #111827;
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .markdown-content h4 {
          color: #111827;
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .markdown-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
          color: #374151;
        }

        .markdown-content a {
          color: #10b981;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }

        .markdown-content a:hover {
          color: #059669;
        }

        .markdown-content strong {
          color: #111827;
          font-weight: 700;
        }

        .markdown-content em {
          font-style: italic;
        }

        .markdown-content code {
          background-color: #f3f4f6;
          color: #10b981;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: monospace;
        }

        .markdown-content pre {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
          color: #374151;
        }

        .markdown-content blockquote {
          border-left: 4px solid #10b981;
          padding-left: 1rem;
          margin-left: 0;
          color: #6b7280;
          font-style: italic;
          margin: 1.5rem 0;
        }

        .markdown-content ul,
        .markdown-content ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }

        .markdown-content li {
          margin: 0.5rem 0;
          color: #374151;
        }

        .markdown-content ul li::marker {
          color: #10b981;
        }

        .markdown-content ol li::marker {
          color: #10b981;
          font-weight: 700;
        }

        .markdown-content hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2rem 0;
        }

        .markdown-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }

        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .markdown-content th,
        .markdown-content td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }

        .markdown-content th {
          background-color: #f9fafb;
          color: #10b981;
          font-weight: 700;
        }

        .markdown-content td {
          background-color: #ffffff;
        }
      `}</style>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
