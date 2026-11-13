import type { Entity, Kind, Profile } from "./domain.ts";
import type { CleanupJob } from "./cleanup.ts";
export interface Model {
  docs: Entity[];
  profile: Profile;
  demo: boolean;
  singletonIds?: { profile: string; plan: string };
  cleanup?: {
    job: CleanupJob | null;
    start: (before: string, summaries: boolean) => Promise<void>;
    step: () => Promise<void>;
    cancel: () => Promise<void>;
    restore: () => Promise<void>;
  };
  save: (
    id: string,
    kind: Kind,
    payload: any,
    deleted?: boolean,
    expectedPayload?: string | null,
  ) => Promise<void>;
  saveBatch: (
    changes: { id: string; kind: Kind; payload: any; deleted?: boolean }[],
  ) => Promise<void>;
  importDocuments: (input: unknown) => Promise<void>;
  refresh: () => void;
}
