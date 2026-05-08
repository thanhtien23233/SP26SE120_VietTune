import { useState } from 'react';

type Props = {
  children: React.ReactNode;
};

export default function MetadataDrawer({ children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-secondary-200 bg-white">
      <button
        type="button"
        className="w-full px-4 py-2 text-left text-sm font-semibold text-primary-800"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide metadata panels' : 'Show metadata panels'}
      </button>
      {open && <div className="border-t border-secondary-100 p-3">{children}</div>}
    </div>
  );
}

