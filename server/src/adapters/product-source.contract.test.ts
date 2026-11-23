import { FAKE_BASE_URL, fakeStoreServer, readRawSnapshot, snapshotProducts } from '../test-support/fixtures.js';
import { FakeStoreProductSource } from './fakestore/fakestore-product-source.js';
import { InMemoryProductSource } from './in-memory/in-memory-product-source.js';
import { describeProductSourceContract } from './product-source.contract.js';

// The real adapter, over a fake Fake Store server that replays the recorded snapshot.
describeProductSourceContract('fakestore (fake fetch over the recorded snapshot)', () =>
  new FakeStoreProductSource({
    baseUrl: FAKE_BASE_URL,
    timeoutMs: 1_000,
    fetch: fakeStoreServer(readRawSnapshot()),
  }),
);

// The same behaviour from a source with no HTTP at all: the port does not depend on Fake Store.
describeProductSourceContract('in-memory (domain products)', () => new InMemoryProductSource(snapshotProducts()));
