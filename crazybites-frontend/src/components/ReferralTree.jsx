import { useState } from "react";
import { ChevronDown, ChevronRight, User } from "lucide-react";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-ink-100 text-ink-500",
};

function TreeNode({ node, depth }) {
  const [open, setOpen] = useState(depth < 2); // open first 2 level 
  const hasChildren = node.children.length > 0;

  return (
    <li className="relative">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-card px-3 py-2 shadow-sm">
        <button
          type="button"
          onClick={() => hasChildren && setOpen(!open)}
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            hasChildren ? "bg-brand-50 text-brand-600" : "text-ink-300"
          }`}
        >
          {hasChildren ? (
            open ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <User size={14} />
          )}
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{node.name}</p>
          <p className="text-xs text-ink-500">{node.sponsor_id}</p>
        </div>

        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            STATUS_STYLES[node.status?.toLowerCase()] || STATUS_STYLES.inactive
          }`}
        >
          {node.status}
        </span>

        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {node.slot > 0 ? `Slot ${node.slot}` : "No slot"}
        </span>

        <span className="text-xs text-ink-500">{node.direct_count} direct</span>
      </div>

      {hasChildren && open && (
        <ul className="ml-5 mt-2 flex flex-col gap-2 border-l-2 border-brand-200 pl-4">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ReferralTree({ root }) {
  if (!root) return null;

  return (
    <ul>
      <TreeNode node={root} depth={0} />
    </ul>
  );
}