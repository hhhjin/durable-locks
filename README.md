# DurableLock - Cloudflare Durable Objects Lock Library

## Credits

This project is based on the [dlock](https://github.com/losfair/dlock) code by [losfair](https://github.com/losfair), which provides a similar distributed locking mechanism.

## Overview

`DurableLock` is a lightweight TypeScript library designed to manage locking mechanisms using [Cloudflare Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/). This library allows multiple processes or users to safely acquire and release locks, ensuring consistent and synchronized access to shared resources.

## Features

- **Distributed Locking:** Safely acquire and release locks across distributed systems using Cloudflare Durable Objects.
- **Lease-Based Locking:** Support for time-to-live (TTL) based locking to avoid stale locks.
- **Alarm System:** Automatically clean up expired locks after a set period.
- **Simple API:** Easy-to-use functions to acquire and release locks using fetch-based requests.

## Installation

To use the `DurableLock` class in your Cloudflare Workers project, simply copy the provided code into your project, or install the package if available on npm.

```bash
npm install durable-locks
```

### Prerequisites

- Cloudflare Workers environment
- Durable Objects enabled on your Cloudflare account

## Usage

### 1. Define the Durable Object

In your `wrangler.toml` file, you need to define the `DurableLock` as a durable object:

```toml
[[durable_objects]]
name = "DURABLE_LOCK"
class_name = "DurableLock"
```

### 2. Create a Durable Object Class

```ts
import { DurableLock, useDurableLock } from "durable-locks";
```

### 3. Use the Lock

You can use the `useDurableLock` function to interact with the `DurableLock` object and perform locking operations.

```ts
const { acquire, release } = useDurableLock(DURABLE_LOCK, "lock-id");

// Acquiring a lock with a TTL of 5 seconds
const result = await acquire(5000);
if (result.success) {
  console.log(`Lock acquired with lease ${result.lease}`);
} else {
  console.error(`Failed to acquire lock: ${result.reason}`);
}

// Releasing the lock
const releaseResult = await release(result.lease);
if (releaseResult === true) {
  console.log("Lock released successfully");
} else {
  console.error("Failed to release the lock");
}
```

### API

#### `acquire(ttl: number, lease?: number): Promise<Result>`

Attempts to acquire a lock for the specified `ttl` (time-to-live). If a `lease` is provided, it tries to renew the existing lock; otherwise, it acquires a new lock.

- `ttl` (number): The duration in milliseconds for which the lock should be held.
- `lease` (number, optional): The current lease of the lock, if renewing.

Returns:

- `Success`: Lock was successfully acquired.
- `Failed`: Lock acquisition failed due to one of the reasons:
  - `BORROWED`: Lock is already acquired by another process.
  - `NO_LONGER_VALID`: The lease provided is no longer valid.

#### `release(lease: number): Promise<Failed | true>`

Releases the lock associated with the provided lease.

- `lease` (number): The lease of the lock to be released.

Returns:

- `true`: Lock successfully released.
- `Failed`: Lock release failed due to one of the reasons:
  - `NO_LONGER_VALID`: The lease is no longer valid or the lock has already expired.

## Alarm System

The `DurableLock` class implements an alarm system to automatically clean up expired locks after a hard deadline of 1 day.

```ts
async alarm() {
  await this.ctx.storage.deleteAll();
}
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
