import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  /** When set, navigate to this path instead of history back (keeps search filters when returning from detail) */
  to?: string;
  /** Fallback route when there is no browser history. Defaults to '/' */
  fallback?: string;
}

export default function BackButton({ to, fallback = '/' }: BackButtonProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (to != null && to !== '') {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center justify-center gap-2 h-11 px-6 py-0 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
      title="Trở về"
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      <span>Trở về</span>
    </button>
  );
}
