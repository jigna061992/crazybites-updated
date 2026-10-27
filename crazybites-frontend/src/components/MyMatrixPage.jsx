import { Link } from "react-router-dom";
import MatrixSlots from "./Matrixslots";

export default function MyMatrixPage() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-1 text-sm">
        <Link to="/dashboard" className="text-brand-600 hover:underline">
          Dashboard
        </Link>
        <span className="mx-2 text-ink-400">/</span>
        <span className="text-ink-500">My Matrix</span>
      </div>
      <h3 className="mb-4 text-2xl font-bold text-ink-900">My Slots &amp; Matrix</h3>

      <MatrixSlots />
    </div>
  );
}