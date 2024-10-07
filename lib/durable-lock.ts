import { DurableObject } from "cloudflare:workers";

export type Lock = {
  lease: number;
  deadline: number;
};

export type Success = {
  success: true;
} & Lock;

export type Failed = {
  success: false;
  reason: "NO_LONGER_VALID" | "BORROWED";
};

export type Result = Success | Failed;

export class DurableLock extends DurableObject {
  async alarm() {
    await this.ctx.storage.deleteAll();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const ttl = url.searchParams.get("ttl");
    const lease = url.searchParams.get("lease");

    let res;

    switch (url.pathname) {
      case "/acquire":
        if (ttl === null) return new Response(null);
        res = await this.acquire(
          parseInt(ttl),
          lease ? parseInt(lease) : undefined
        );
        return new Response(JSON.stringify(res));

      case "/release":
        if (lease === null) return new Response(null);
        res = await this.release(parseInt(lease));
        return new Response(JSON.stringify(res));

      case "/isLocked":
        res = await this.isLocked();
        return new Response(JSON.stringify(res));

      default:
        throw new Error("Invalid pathname");
    }
  }

  async acquire(ttl: number, lease?: number): Promise<Result> {
    const lock = (await this.ctx.storage.get<Lock>("lock")) || {
      lease: 0,
      deadline: 0,
    };

    const deadline = Date.now() + ttl;

    // New request for acquiring lock
    if (!lease) {
      if (Date.now() < lock.deadline) {
        return { success: false, reason: "BORROWED" };
      }

      const lease = lock.lease + 1;

      await this.ctx.storage.put<Lock>("lock", { lease, deadline });
      await this.ctx.storage.setAlarm(this.hardDeadline());

      return { success: true, lease, deadline };
    }

    if (lease !== lock.lease) {
      return { success: false, reason: "NO_LONGER_VALID" };
    }

    await this.ctx.storage.put<Lock>("lock", { lease, deadline });
    return { success: true, lease, deadline };
  }

  async release(lease: number): Promise<Failed | true> {
    const lock = await this.ctx.storage.get<Lock>("lock");

    if (!lock || lease !== lock.lease || lock.deadline < Date.now()) {
      return { success: false, reason: "NO_LONGER_VALID" };
    }

    await this.ctx.storage.put<Lock>("lock", { lease, deadline: 0 });

    return true;
  }

  async isLocked() {
    const lock = await this.ctx.storage.get<Lock>("lock");
    return lock && lock.deadline > Date.now();
  }

  private hardDeadline() {
    // 1 day
    return new Date(Date.now() + 1000 * 86400);
  }
}

export function useDurableLock(
  namespace: DurableObjectNamespace<DurableLock>,
  id: string
) {
  const uniqueId = namespace.idFromName(id);
  const durableLock = namespace.get(uniqueId);

  async function acquire(ttl: number, lease?: number) {
    const res = await durableLock.fetch(
      `http://localhost/acquire?ttl=${ttl}&lease=${lease}`
    );
    return await res.json<Result>();
  }

  async function release(lease: number) {
    const res = await durableLock.fetch(
      `http://localhost/release?lease=${lease}`
    );
    return await res.json<Failed | true>();
  }

  async function isLocked() {
    const res = await durableLock.fetch(`http://localhost/isLocked`);
    return await res.json<boolean>();
  }

  return { acquire, release, isLocked };
}
