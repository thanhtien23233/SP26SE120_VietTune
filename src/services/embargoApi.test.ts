import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/api')>();
  return {
    ...mod,
    apiFetch: {
      ...mod.apiFetch,
      GET: (...args: unknown[]) => getMock(...args),
      PUT: (...args: unknown[]) => putMock(...args),
      POST: (...args: unknown[]) => postMock(...args),
    },
  };
});

function envelope404(): {
  data: undefined;
  error: unknown;
  response: Response;
} {
  return {
    data: undefined,
    error: { message: 'Not found' },
    response: new Response(null, { status: 404 }),
  };
}

describe('embargoApi circuit breaker', () => {
  beforeEach(async () => {
    const { resetEmbargoUnavailableForTests } = await import('@/services/embargoApi');
    resetEmbargoUnavailableForTests();
    getMock.mockReset();
    putMock.mockReset();
    postMock.mockReset();
  });

  afterEach(async () => {
    const { resetEmbargoUnavailableForTests } = await import('@/services/embargoApi');
    resetEmbargoUnavailableForTests();
  });

  it('after 404 envelope, subsequent calls short-circuit without calling GET', async () => {
    getMock.mockResolvedValueOnce(envelope404());

    const { embargoApi } = await import('@/services/embargoApi');
    await expect(embargoApi.getByRecordingId('rec-1')).resolves.toBeNull();
    expect(getMock).toHaveBeenCalledTimes(1);

    await expect(embargoApi.getByRecordingId('rec-2')).resolves.toBeNull();
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('resetEmbargoUnavailableForTests allows API to be called again', async () => {
    getMock.mockResolvedValue(envelope404());

    const { embargoApi, resetEmbargoUnavailableForTests } = await import('@/services/embargoApi');
    await embargoApi.getByRecordingId('a');
    expect(getMock).toHaveBeenCalledTimes(1);

    resetEmbargoUnavailableForTests();
    await embargoApi.getByRecordingId('b');
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('list returns empty paged result when circuit is open without extra GET', async () => {
    getMock.mockResolvedValueOnce(envelope404());

    const { embargoApi } = await import('@/services/embargoApi');
    await embargoApi.getByRecordingId('x');

    const page = await embargoApi.list();
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
