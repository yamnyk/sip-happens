import type { Profile } from "#contract/domain.js";

/** A profile with the profiles it invited. */
export interface TreeNode {
  profile: Profile;
  children: TreeNode[];
}

/** Builds the invite forest. Profiles whose inviter is missing become roots. */
export function buildTree(profiles: readonly Profile[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(
    profiles.map((p) => [p.id, { profile: p, children: [] }]),
  );
  const roots: TreeNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.profile.invited_by
      ? nodes.get(n.profile.invited_by)
      : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  return roots;
}
