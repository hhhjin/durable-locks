import { DurableLock, useDurableLock } from "../lib/durable-lock";

export interface Env {
  DURABLE_LOCK: DurableObjectNamespace<DurableLock>;
}

export { DurableLock };

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const ttl = Number(url.searchParams.get("ttl"));
    const lease = Number(url.searchParams.get("lease"));

    const durableLock = useDurableLock(
      env.DURABLE_LOCK,
      url.pathname.split("/")[2]
    );

    if (url.pathname.startsWith("/acquire")) {
      return new Response(
        JSON.stringify(await durableLock.acquire(ttl, lease))
      );
    } else if (url.pathname.startsWith("/release")) {
      return new Response(JSON.stringify(await durableLock.release(lease)));
    } else if (url.pathname.startsWith("/isLocked")) {
      return new Response(JSON.stringify(await durableLock.isLocked()));
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
