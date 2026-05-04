import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { clsx } from 'clsx';
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { useEffect } from 'react';

export interface KBRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  id?: string;
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'rounded-lg p-1.5 text-neutral-700 transition-colors',
        active ? 'bg-secondary-200/80 text-primary-800' : 'hover:bg-neutral-200/80',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );
}

export default function KBRichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết…',
  disabled = false,
  error,
  label,
  id,
}: KBRichTextEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          link: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'text-primary-600 underline' },
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: value || '',
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    },
    [disabled],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL liên kết', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-0.5 block text-xs font-medium text-neutral-700">
          {label}
        </label>
      )}
      <div
        className={clsx(
          'overflow-hidden rounded-2xl border bg-surface-panel shadow-sm transition-shadow',
          error ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200/70',
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-secondary-200/60 bg-cream-100/80 px-2 py-1.5">
          <select
            aria-label="Định dạng tiêu đề"
            disabled={disabled || !editor}
            className="mr-1 max-w-[8.5rem] rounded-lg border border-neutral-300/80 bg-surface-panel px-2 py-1 text-xs text-neutral-800"
            value={
              !editor
                ? 'p'
                : editor.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor.isActive('heading', { level: 3 })
                    ? 'h3'
                    : editor.isActive('heading', { level: 4 })
                      ? 'h4'
                      : 'p'
            }
            onChange={(e) => {
              if (!editor) return;
              const v = e.target.value;
              if (v === 'p') editor.chain().focus().setParagraph().run();
              if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
              if (v === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
              if (v === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
            }}
          >
            <option value="p">Đoạn văn</option>
            <option value="h2">Tiêu đề 2</option>
            <option value="h3">Tiêu đề 3</option>
            <option value="h4">Tiêu đề 4</option>
          </select>
          <ToolbarButton
            title="Đậm"
            disabled={disabled || !editor}
            active={editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Nghiêng"
            disabled={disabled || !editor}
            active={editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Gạch chân"
            disabled={disabled || !editor}
            active={editor?.isActive('underline')}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Gạch ngang"
            disabled={disabled || !editor}
            active={editor?.isActive('strike')}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Liên kết"
            disabled={disabled || !editor}
            active={editor?.isActive('link')}
            onClick={setLink}
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Danh sách bullet"
            disabled={disabled || !editor}
            active={editor?.isActive('bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Danh sách số"
            disabled={disabled || !editor}
            active={editor?.isActive('orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Trích dẫn"
            disabled={disabled || !editor}
            active={editor?.isActive('blockquote')}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Mã inline"
            disabled={disabled || !editor}
            active={editor?.isActive('code')}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Đường kẻ ngang"
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Hoàn tác"
            disabled={disabled || !editor || !editor.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Làm lại"
            disabled={disabled || !editor || !editor.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
          <span className="ml-auto hidden text-[10px] text-neutral-500 sm:inline">
            <Heading2 className="mr-0.5 inline h-3 w-3" />
            H2–H4
          </span>
        </div>
        <EditorContent
          editor={editor}
          id={id}
          className={clsx(
            '[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:px-4 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-neutral-900 [&_.ProseMirror]:outline-none',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-neutral-400',
            '[&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-neutral-900',
            '[&_.ProseMirror_h3]:mt-2 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-bold',
            '[&_.ProseMirror_h4]:mt-2 [&_.ProseMirror_h4]:text-sm [&_.ProseMirror_h4]:font-semibold',
            '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5',
            '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5',
            '[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-secondary-400 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic',
            '[&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-neutral-800 [&_.ProseMirror_pre]:p-2 [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:text-neutral-100',
            disabled && 'pointer-events-none opacity-60',
          )}
        />
      </div>
      {error && <p className="mt-0.5 text-xs text-primary-600">{error}</p>}
    </div>
  );
}
