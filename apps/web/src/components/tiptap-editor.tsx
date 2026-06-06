'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tiptap rich-text editor. Emits HTML via onChange. */
export function TiptapEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none min-h-[280px] px-4 py-3 focus:outline-none prose-headings:font-display',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync when the value changes externally (e.g. loading an existing job or AI-filled draft),
  // so HTML renders in the editor instead of being lost/shown stale.
  useEffect(() => {
    if (!editor) return;
    const next = value || '<p></p>';
    if (next !== editor.getHTML()) editor.commands.setContent(next, false);
  }, [value, editor]);

  if (!editor) return <div className="h-80 rounded-lg border bg-navy-50" />;

  const Btn = ({ on, active, children, label }: { on: () => void; active?: boolean; children: React.ReactNode; label: string }) => (
    <button
      type="button"
      title={label}
      onClick={on}
      className={cn('flex h-8 w-8 items-center justify-center rounded hover:bg-navy-100', active && 'bg-teal-100 text-teal-700')}
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-navy-50 p-1.5">
        <Btn label="Bold" on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="h-4 w-4" /></Btn>
        <Btn label="Italic" on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="h-4 w-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-navy-200" />
        <Btn label="Heading 2" on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="h-4 w-4" /></Btn>
        <Btn label="Heading 3" on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="h-4 w-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-navy-200" />
        <Btn label="Bullet list" on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="h-4 w-4" /></Btn>
        <Btn label="Numbered list" on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></Btn>
        <Btn label="Quote" on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="h-4 w-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-navy-200" />
        <Btn label="Undo" on={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Btn>
        <Btn label="Redo" on={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
