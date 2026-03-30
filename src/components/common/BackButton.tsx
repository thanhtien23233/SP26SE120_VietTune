import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  /** When set, navigate to this path instead of history back (keeps search filters when returning from detail) */
  to?: string;
}

export default function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to != null && to !== "" ? navigate(to) : navigate(-1))}
      className="inline-flex items-center justify-center gap-2 h-11 px-6 py-0 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
      title="Trở về"
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      <span>Trở về</span>
    </button>
  );
}