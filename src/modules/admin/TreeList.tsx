import { formatDateTime } from "#shared/lib/date.js";
import type { TreeNode } from "./adminTree.js";

/** Recursive invite tree. */
export function TreeList({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="flex flex-col gap-1 border-l border-neutral-800 pl-3">
      {nodes.map((n) => (
        <li key={n.profile.id}>
          <p className="py-1">
            <span
              className={
                n.profile.disabled
                  ? "text-neutral-500 line-through"
                  : "font-medium"
              }
            >
              {n.profile.nick}
            </span>{" "}
            <span className="text-xs text-neutral-500">
              {formatDateTime(n.profile.created_at)}
            </span>
          </p>
          {n.children.length > 0 && <TreeList nodes={n.children} />}
        </li>
      ))}
    </ul>
  );
}
