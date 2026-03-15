/**
 * ClassHierarchyService unit tests
 *
 * Covers:
 *   buildClassHierarchy  — returns the correct nested group → subGroup → class structure
 *   createClassGroup     — happy path; 409 on duplicate name
 *   updateClassGroup     — 404 when not found; 409 on name conflict
 *   deleteClassGroup     — happy path; 404 when not found; 409 when has sub-groups
 *   createClassSubGroup  — happy path; 404 when parent group missing; 409 on duplicate
 *   updateClassSubGroup  — 404 when not found; 409 on name conflict
 *   deleteClassSubGroup  — happy path; 404 when not found; 409 when has classes
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations ────────────────────────────────────────

jest.unstable_mockModule('../../repositories/ClassHierarchyRepository.js', () => ({
  findAllClassGroups:              jest.fn(),
  findClassGroupById:              jest.fn(),
  findClassGroupByName:            jest.fn(),
  createClassGroup:                jest.fn(),
  updateClassGroup:                jest.fn(),
  deleteClassGroup:                jest.fn(),
  findClassSubGroups:              jest.fn(),
  findClassSubGroupById:           jest.fn(),
  findClassSubGroupByGroupAndName: jest.fn(),
  createClassSubGroup:             jest.fn(),
  updateClassSubGroup:             jest.fn(),
  deleteClassSubGroup:             jest.fn(),
  findHierarchyTree:               jest.fn(),
}));

// ── Module variables ──────────────────────────────────────────

let service;
let Repo;

beforeAll(async () => {
  service = await import('../../services/ClassHierarchyService.js');
  Repo    = await import('../../repositories/ClassHierarchyRepository.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────

const mockGroup = (overrides = {}) => ({
  id:           'group-1',
  name:         'Primary',
  displayOrder: 1,
  isActive:     true,
  _count:       { classSubGroups: 0 },
  ...overrides,
});

const mockSubGroup = (overrides = {}) => ({
  id:           'sg-1',
  classGroupId: 'group-1',
  name:         'LowerPrimary',
  displayOrder: 1,
  isActive:     true,
  classGroup:   { id: 'group-1', name: 'Primary' },
  _count:       { classes: 0 },
  ...overrides,
});

const mockClass = () => ({
  id:           'class-1',
  name:         'P.1',
  levelOrder:   4,
  isActive:     true,
  schoolSection: { id: 'sec-1', name: 'Lower Primary', code: 'LOWER', rankingMethod: 'average' },
});

// ══════════════════════════════════════════════════════════════
// buildClassHierarchy
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.buildClassHierarchy', () => {
  test('returns the correct nested group → subGroup → class structure', async () => {
    const rawTree = [
      {
        id:           'group-1',
        name:         'Primary',
        displayOrder: 1,
        classSubGroups: [
          {
            id:           'sg-1',
            name:         'LowerPrimary',
            displayOrder: 1,
            classes: [mockClass()],
          },
          {
            id:           'sg-2',
            name:         'UpperPrimary',
            displayOrder: 2,
            classes: [],
          },
        ],
      },
    ];
    Repo.findHierarchyTree.mockResolvedValue(rawTree);

    const result = await service.buildClassHierarchy();

    expect(result).toHaveLength(1);
    expect(result[0].group).toEqual({ id: 'group-1', name: 'Primary', displayOrder: 1 });
    expect(result[0].subGroups).toHaveLength(2);

    const lower = result[0].subGroups[0];
    expect(lower.subGroup).toEqual({ id: 'sg-1', name: 'LowerPrimary', displayOrder: 1 });
    expect(lower.classes).toHaveLength(1);
    expect(lower.classes[0]).toMatchObject({ id: 'class-1', name: 'P.1', levelOrder: 4 });
    expect(lower.classes[0].schoolSection.code).toBe('LOWER');

    const upper = result[0].subGroups[1];
    expect(upper.subGroup.name).toBe('UpperPrimary');
    expect(upper.classes).toHaveLength(0);
  });

  test('returns an empty array when no active groups exist', async () => {
    Repo.findHierarchyTree.mockResolvedValue([]);

    const result = await service.buildClassHierarchy();

    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// createClassGroup
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.createClassGroup', () => {
  test('creates a class group successfully', async () => {
    Repo.findClassGroupByName.mockResolvedValue(null);
    const created = mockGroup();
    Repo.createClassGroup.mockResolvedValue(created);

    const result = await service.createClassGroup({ name: 'Primary', displayOrder: 1 });

    expect(Repo.createClassGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Primary', displayOrder: 1, isActive: true }),
    );
    expect(result).toEqual(created);
  });

  test('throws 409 when name already exists', async () => {
    Repo.findClassGroupByName.mockResolvedValue(mockGroup());

    await expect(service.createClassGroup({ name: 'Primary', displayOrder: 1 }))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining('Primary') });

    expect(Repo.createClassGroup).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// updateClassGroup
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.updateClassGroup', () => {
  test('updates name and displayOrder successfully', async () => {
    Repo.findClassGroupById.mockResolvedValue(mockGroup());
    Repo.findClassGroupByName.mockResolvedValue(null);
    const updated = mockGroup({ name: 'Secondary' });
    Repo.updateClassGroup.mockResolvedValue(updated);

    await service.updateClassGroup('group-1', { name: 'Secondary', displayOrder: 2 });

    expect(Repo.updateClassGroup).toHaveBeenCalledWith(
      'group-1',
      expect.objectContaining({ name: 'Secondary', displayOrder: 2 }),
    );
  });

  test('throws 404 when group not found', async () => {
    Repo.findClassGroupById.mockResolvedValue(null);

    await expect(service.updateClassGroup('missing', { name: 'X' }))
      .rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 when new name conflicts with another group', async () => {
    Repo.findClassGroupById.mockResolvedValue(mockGroup({ name: 'Primary' }));
    Repo.findClassGroupByName.mockResolvedValue(mockGroup({ id: 'group-2', name: 'Kindergarten' }));

    await expect(service.updateClassGroup('group-1', { name: 'Kindergarten' }))
      .rejects.toMatchObject({ status: 409 });
  });
});

// ══════════════════════════════════════════════════════════════
// deleteClassGroup
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.deleteClassGroup', () => {
  test('deletes a group that has no sub-groups', async () => {
    Repo.findClassGroupById.mockResolvedValue(mockGroup({ _count: { classSubGroups: 0 } }));
    Repo.deleteClassGroup.mockResolvedValue({});

    await service.deleteClassGroup('group-1');

    expect(Repo.deleteClassGroup).toHaveBeenCalledWith('group-1');
  });

  test('throws 404 when group not found', async () => {
    Repo.findClassGroupById.mockResolvedValue(null);

    await expect(service.deleteClassGroup('missing'))
      .rejects.toMatchObject({ status: 404 });

    expect(Repo.deleteClassGroup).not.toHaveBeenCalled();
  });

  test('throws 409 when group has sub-groups linked', async () => {
    Repo.findClassGroupById.mockResolvedValue(mockGroup({ _count: { classSubGroups: 3 } }));

    await expect(service.deleteClassGroup('group-1'))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining('3 sub-group(s)') });

    expect(Repo.deleteClassGroup).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// createClassSubGroup
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.createClassSubGroup', () => {
  test('creates a sub-group successfully', async () => {
    Repo.findClassGroupById.mockResolvedValue(mockGroup());
    Repo.findClassSubGroupByGroupAndName.mockResolvedValue(null);
    const created = mockSubGroup();
    Repo.createClassSubGroup.mockResolvedValue(created);

    const result = await service.createClassSubGroup({
      classGroupId: 'group-1',
      name:         'LowerPrimary',
      displayOrder: 1,
    });

    expect(Repo.createClassSubGroup).toHaveBeenCalledWith(
      expect.objectContaining({ classGroupId: 'group-1', name: 'LowerPrimary' }),
    );
    expect(result).toEqual(created);
  });

  test('throws 404 when parent class group does not exist', async () => {
    Repo.findClassGroupById.mockResolvedValue(null);

    await expect(
      service.createClassSubGroup({ classGroupId: 'bad', name: 'X', displayOrder: 1 }),
    ).rejects.toMatchObject({ status: 404 });

    expect(Repo.createClassSubGroup).not.toHaveBeenCalled();
  });

  test('throws 409 when name already exists in the same group', async () => {
    Repo.findClassGroupById.mockResolvedValue(mockGroup());
    Repo.findClassSubGroupByGroupAndName.mockResolvedValue(mockSubGroup());

    await expect(
      service.createClassSubGroup({ classGroupId: 'group-1', name: 'LowerPrimary', displayOrder: 1 }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('LowerPrimary') });

    expect(Repo.createClassSubGroup).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// updateClassSubGroup
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.updateClassSubGroup', () => {
  test('throws 404 when sub-group not found', async () => {
    Repo.findClassSubGroupById.mockResolvedValue(null);

    await expect(service.updateClassSubGroup('missing', { name: 'X' }))
      .rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 when new name conflicts within the same group', async () => {
    Repo.findClassSubGroupById.mockResolvedValue(mockSubGroup({ name: 'LowerPrimary' }));
    Repo.findClassSubGroupByGroupAndName.mockResolvedValue(mockSubGroup({ id: 'sg-2', name: 'UpperPrimary' }));

    await expect(service.updateClassSubGroup('sg-1', { name: 'UpperPrimary' }))
      .rejects.toMatchObject({ status: 409 });
  });
});

// ══════════════════════════════════════════════════════════════
// deleteClassSubGroup
// ══════════════════════════════════════════════════════════════

describe('ClassHierarchyService.deleteClassSubGroup', () => {
  test('deletes a sub-group that has no classes', async () => {
    Repo.findClassSubGroupById.mockResolvedValue(mockSubGroup({ _count: { classes: 0 } }));
    Repo.deleteClassSubGroup.mockResolvedValue({});

    await service.deleteClassSubGroup('sg-1');

    expect(Repo.deleteClassSubGroup).toHaveBeenCalledWith('sg-1');
  });

  test('throws 404 when sub-group not found', async () => {
    Repo.findClassSubGroupById.mockResolvedValue(null);

    await expect(service.deleteClassSubGroup('missing'))
      .rejects.toMatchObject({ status: 404 });

    expect(Repo.deleteClassSubGroup).not.toHaveBeenCalled();
  });

  test('throws 409 when sub-group has classes linked', async () => {
    Repo.findClassSubGroupById.mockResolvedValue(mockSubGroup({ _count: { classes: 11 } }));

    await expect(service.deleteClassSubGroup('sg-1'))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining('11 class(es)') });

    expect(Repo.deleteClassSubGroup).not.toHaveBeenCalled();
  });
});
