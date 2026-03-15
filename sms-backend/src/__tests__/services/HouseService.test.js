/**
 * HouseService unit tests
 *
 * Covers:
 *   - listHouses: returns all / active-only
 *   - createHouse: happy path, duplicate name (409)
 *   - updateHouse: happy path, not found (404), name conflict (409), unchanged name skips check
 *   - deleteHouse: happy path, not found (404), has pupils (409)
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations ────────────────────────────────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    house: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
  },
}));

// ── Module variables ──────────────────────────────────────────

let listHouses;
let createHouse;
let updateHouse;
let deleteHouse;
let prismaModule;

// ── Setup ─────────────────────────────────────────────────────

beforeAll(async () => {
  ({ listHouses, createHouse, updateHouse, deleteHouse } =
    await import('../../services/HouseService.js'));
  prismaModule = await import('../../lib/prisma.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────

const mockHouse = () => prismaModule.prisma.house;

// ── Tests ─────────────────────────────────────────────────────

describe('HouseService.listHouses', () => {
  test('returns all houses when activeOnly=false', async () => {
    const houses = [{ id: '1', name: 'Yellow-Lion', isActive: true }];
    mockHouse().findMany.mockResolvedValue(houses);

    const result = await listHouses({ activeOnly: false });

    expect(mockHouse().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
    expect(result).toEqual(houses);
  });

  test('filters to active only when activeOnly=true', async () => {
    mockHouse().findMany.mockResolvedValue([]);

    await listHouses({ activeOnly: true });

    expect(mockHouse().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  test('defaults to all houses when called with no args', async () => {
    mockHouse().findMany.mockResolvedValue([]);

    await listHouses();

    expect(mockHouse().findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});

describe('HouseService.createHouse', () => {
  test('creates a house successfully', async () => {
    mockHouse().findUnique.mockResolvedValue(null);
    const created = { id: 'abc', name: 'Red-Leopard', colourHex: '#EF4444', isActive: true };
    mockHouse().create.mockResolvedValue(created);

    const result = await createHouse({ name: 'Red-Leopard', colourHex: '#EF4444' });

    expect(mockHouse().create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Red-Leopard', colourHex: '#EF4444', isActive: true },
      }),
    );
    expect(result).toEqual(created);
  });

  test('throws 409 when name already exists', async () => {
    mockHouse().findUnique.mockResolvedValue({ id: 'existing', name: 'Red-Leopard' });

    await expect(createHouse({ name: 'Red-Leopard' }))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining('Red-Leopard') });

    expect(mockHouse().create).not.toHaveBeenCalled();
  });

  test('creates house with null colourHex when not provided', async () => {
    mockHouse().findUnique.mockResolvedValue(null);
    mockHouse().create.mockResolvedValue({ id: 'xyz', name: 'Green-Tiger', colourHex: null });

    await createHouse({ name: 'Green-Tiger' });

    expect(mockHouse().create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ colourHex: null }),
      }),
    );
  });
});

describe('HouseService.updateHouse', () => {
  const existing = { id: 'h1', name: 'Yellow-Lion', colourHex: '#F59E0B', isActive: true };

  test('updates name, colourHex, and isActive', async () => {
    mockHouse().findUnique
      .mockResolvedValueOnce(existing)  // existence check
      .mockResolvedValueOnce(null);     // name uniqueness — no conflict
    mockHouse().update.mockResolvedValue({ ...existing, name: 'Gold-Lion', isActive: false });

    const result = await updateHouse('h1', { name: 'Gold-Lion', isActive: false });

    expect(mockHouse().update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Gold-Lion', isActive: false }),
      }),
    );
    expect(result.name).toBe('Gold-Lion');
  });

  test('throws 404 when house not found', async () => {
    mockHouse().findUnique.mockResolvedValue(null);

    await expect(updateHouse('missing', { name: 'X' }))
      .rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 when new name conflicts with another house', async () => {
    mockHouse().findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ id: 'h2', name: 'Blue-Cheetah' });

    await expect(updateHouse('h1', { name: 'Blue-Cheetah' }))
      .rejects.toMatchObject({ status: 409 });
  });

  test('does not check name uniqueness when name is unchanged', async () => {
    mockHouse().findUnique.mockResolvedValueOnce(existing);
    mockHouse().update.mockResolvedValue({ ...existing, colourHex: '#000000' });

    await updateHouse('h1', { name: 'Yellow-Lion', colourHex: '#000000' });

    // findUnique called only once (existence check)
    expect(mockHouse().findUnique).toHaveBeenCalledTimes(1);
  });
});

describe('HouseService.deleteHouse', () => {
  test('deletes a house with no pupils assigned', async () => {
    mockHouse().findUnique.mockResolvedValue({ id: 'h1', name: 'Yellow-Lion', _count: { pupils: 0 } });
    mockHouse().delete.mockResolvedValue({});

    await deleteHouse('h1');

    expect(mockHouse().delete).toHaveBeenCalledWith({ where: { id: 'h1' } });
  });

  test('throws 404 when house not found', async () => {
    mockHouse().findUnique.mockResolvedValue(null);

    await expect(deleteHouse('missing'))
      .rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 and does not delete when house has pupils assigned', async () => {
    mockHouse().findUnique.mockResolvedValue({
      id: 'h1', name: 'Red-Leopard', _count: { pupils: 5 },
    });

    await expect(deleteHouse('h1'))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining('5 pupil(s)') });

    expect(mockHouse().delete).not.toHaveBeenCalled();
  });
});
