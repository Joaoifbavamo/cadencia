import { setIdentity } from "./domain.ts";

// Only for creation. Existing imported IDs and session snapshots stay unchanged.
// The existing version=0 CAS makes concurrent creations meet as a conflict.
export const singletonIdentity = (account: string, kind: "profile" | "plan") =>
  setIdentity(account, "cadencia-singleton-" + kind, 1);
