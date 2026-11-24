import { uid, type Entity } from "./domain.ts";
export const editEntity = (
  e: Entity,
  payload: any,
  deleted = e.deleted,
): Entity => ({
  ...e,
  payload,
  deleted,
  dirty: true,
  mutationId: uid(),
  localSeq: e.localSeq + 1,
});
export function acknowledge(
  current: Entity,
  sent: Entity,
  remote: Entity,
): Entity {
  // A receipt can arrive after another tab has pulled a newer version. Neither
  // the document nor its tombstone may move backwards when that happens.
  if (
    current.id !== sent.id ||
    remote.id !== sent.id ||
    current.kind !== sent.kind ||
    remote.kind !== sent.kind ||
    remote.version < current.version ||
    remote.change_seq < current.change_seq ||
    remote.version <= sent.version
  )
    return current;
  const sameMutation =
    current.localSeq === sent.localSeq &&
    current.mutationId === sent.mutationId;
  if (!current.dirty && !sameMutation) return current;
  const conflict =
    current.conflict &&
    (current.conflict.version > remote.version ||
      current.conflict.change_seq > remote.change_seq)
      ? current.conflict
      : undefined;
  return sameMutation && !conflict
    ? {
        ...remote,
        dirty: false,
        localSeq: current.localSeq,
        mutationId: sent.mutationId,
        conflict: undefined,
      }
    : {
        ...current,
        version: remote.version,
        change_seq: remote.change_seq,
        dirty: true,
        conflict,
      };
}
export function mergeRemote(local: Entity | undefined, remote: Entity): Entity {
  if (!local)
    return { ...remote, dirty: false, localSeq: 0, mutationId: uid() };
  if (remote.version <= local.version) return local;
  if (local.dirty) return { ...local, conflict: remote };
  return {
    ...remote,
    dirty: false,
    localSeq: local.localSeq,
    mutationId: uid(),
  };
}
