import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import "../src/index";

async function request(
  method: "acquire" | "release",
  id: string,
  { ttl, lease }: { ttl?: number; lease?: number }
) {
  const url = new URL(`http://self/${method}/${id}`);
  if (ttl) url.searchParams.set("ttl", ttl.toString());
  if (lease) url.searchParams.set("lease", lease.toString());
  const res = await SELF.fetch(url);
  return await res.json();
}

describe("Worker", () => {
  it("gurantees lock consitency within the deadline", async () => {
    const res1 = await request("acquire", "1", { ttl: 100 });
    const res2 = await request("acquire", "1", { ttl: 100 });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const res3 = await request("acquire", "1", { ttl: 100 });

    expect(res1).property("lease").equal(1);
    expect(res2).property("reason").equal("BORROWED");
    expect(res3).property("lease").equal(2);
  });

  it("renews lock", async () => {
    const res1 = await request("acquire", "1", { ttl: 100000 });
    const res2 = await request("acquire", "1", { ttl: 100, lease: 1 });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const res3 = await request("acquire", "1", { ttl: 100 });

    expect(res1).property("lease").equal(1);
    expect(res2).property("lease").equal(1);
    expect(res3).property("lease").equal(2);
  });

  it("releases", async () => {
    const res1 = await request("acquire", "1", { ttl: 100000 });
    await request("release", "1", { lease: 1 });
    const res3 = await request("acquire", "1", { ttl: 1000 });

    expect(res1).property("lease").equal(1);
    expect(res3).property("lease").equal(2);
  });

  it("misreleases", async () => {
    const res1 = await request("acquire", "1", { ttl: 100000 });
    const res2 = await request("release", "1", { lease: 2 });
    const res3 = await request("acquire", "1", { ttl: 1000 });

    expect(res1).property("lease").equal(1);
    expect(res2).property("reason").equal("NO_LONGER_VALID");
    expect(res3).property("reason").equal("BORROWED");
  });

  it("requests a lot at once", async () => {
    let lockCount = 0;

    await Promise.all(
      Array(100)
        .fill(null)
        .map(async () => {
          const res = await request("acquire", "1", { ttl: 100000 });

          if (
            typeof res === "object" &&
            res !== null &&
            res.hasOwnProperty("lease")
          ) {
            expect(res).property("lease").equal(1);
            lockCount += 1;
          }
        })
    );

    expect(lockCount).toBe(1);
  });

  it("returns independant lease depending on the ID", async () => {
    const res1 = await request("acquire", "1", { ttl: 10000 });

    const res2 = await request("acquire", "2", { ttl: 10000 });

    const res3 = await request("acquire", "3", { ttl: 10000 });

    expect(res1).property("lease").equal(1);
    expect(res2).property("lease").equal(1);
    expect(res3).property("lease").equal(1);
  });
});
