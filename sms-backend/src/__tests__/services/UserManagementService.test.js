import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations (must precede all imports) ─────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique:  jest.fn(),
      findFirst:   jest.fn(),
      findMany:    jest.fn(),
      count:       jest.fn(),
      create:      jest.fn(),
      update:      jest.fn(),
    },
    role: {
      findUnique:  jest.fn(),
    },
    session: {
      updateMany:  jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// bcrypt is used inside the service — mock it for speed
jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash:    jest.fn().mockResolvedValue('$hashed$'),
    compare: jest.fn(),
  },
}));

// ── Lazy imports ──────────────────────────────────────────────

let svc;
let prismaModule;

beforeAll(async () => {
  prismaModule = await import('../../lib/prisma.js');
  svc          = await import('../../services/UserManagementService.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────

const ROLE = { id: 'role-uuid', name: 'class_teacher', displayName: 'Class Teacher' };

const BASE_USER = {
  id:                'user-uuid',
  fullName:          'Alice Smith',
  username:          'alice',
  email:             'alice@school.ug',
  isActive:          true,
  mustChangePassword: false,
  lastLoginAt:       null,
  createdAt:         new Date(),
  updatedAt:         new Date(),
  role:              ROLE,
};

// ── listUsers ─────────────────────────────────────────────────

describe('listUsers', () => {
  test('returns paginated results with defaults', async () => {
    prismaModule.prisma.user.findMany.mockResolvedValue([BASE_USER]);
    prismaModule.prisma.user.count.mockResolvedValue(1);

    const result = await svc.listUsers();

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
    expect(prismaModule.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 }),
    );
  });

  test('applies roleId and isActive filters', async () => {
    prismaModule.prisma.user.findMany.mockResolvedValue([]);
    prismaModule.prisma.user.count.mockResolvedValue(0);

    await svc.listUsers({ roleId: 'role-uuid', isActive: false });

    expect(prismaModule.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ roleId: 'role-uuid', isActive: false }),
      }),
    );
  });

  test('applies OR search on fullName and username', async () => {
    prismaModule.prisma.user.findMany.mockResolvedValue([]);
    prismaModule.prisma.user.count.mockResolvedValue(0);

    await svc.listUsers({ search: 'alice' });

    const call = prismaModule.prisma.user.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { fullName: { contains: 'alice', mode: 'insensitive' } },
      { username: { contains: 'alice', mode: 'insensitive' } },
    ]);
  });
});

// ── createUser ────────────────────────────────────────────────

describe('createUser', () => {
  test('happy path — creates user, sets mustChangePassword=true, returns tempPassword', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null); // username free
    prismaModule.prisma.user.findFirst.mockResolvedValue(null);  // email free
    prismaModule.prisma.role.findUnique.mockResolvedValue(ROLE);
    prismaModule.prisma.user.create.mockResolvedValue({
      ...BASE_USER,
      mustChangePassword: true,
    });

    const result = await svc.createUser({
      fullName: 'Alice Smith',
      username: 'alice',
      email:    'alice@school.ug',
      roleId:   'role-uuid',
    });

    expect(result.tempPassword).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(result.user.mustChangePassword).toBe(true);

    // Confirm bcrypt.hash was called with the temp password
    const bcrypt = (await import('bcrypt')).default;
    expect(bcrypt.hash).toHaveBeenCalledWith(result.tempPassword, 12);

    // Confirm mustChangePassword set in create call
    expect(prismaModule.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: true }),
      }),
    );
  });

  test('throws 409 when username is already taken', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(BASE_USER); // conflict

    await expect(
      svc.createUser({ fullName: 'Bob', username: 'alice', email: null, roleId: 'role-uuid' }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Username') });
  });

  test('throws 409 when email is already in use', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null);    // username free
    prismaModule.prisma.user.findFirst.mockResolvedValue(BASE_USER); // email conflict

    await expect(
      svc.createUser({ fullName: 'Bob', username: 'bob', email: 'alice@school.ug', roleId: 'role-uuid' }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Email') });
  });

  test('throws 404 when roleId does not exist', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null);
    prismaModule.prisma.user.findFirst.mockResolvedValue(null);
    prismaModule.prisma.role.findUnique.mockResolvedValue(null); // role missing

    await expect(
      svc.createUser({ fullName: 'Bob', username: 'bob', email: null, roleId: 'bad-role' }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateUser ────────────────────────────────────────────────

describe('updateUser', () => {
  const ADMIN_CALLER = { requestingUserId: 'admin-uuid', requestingRoleName: 'system_admin' };

  test('updates user details successfully', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, id: 'user-uuid' });
    prismaModule.prisma.user.findFirst.mockResolvedValue(null);
    prismaModule.prisma.role.findUnique.mockResolvedValue(ROLE);
    prismaModule.prisma.user.update.mockResolvedValue({ ...BASE_USER, fullName: 'Alice Jones' });

    const result = await svc.updateUser(
      'user-uuid',
      { fullName: 'Alice Jones', email: 'new@school.ug', roleId: 'role-uuid' },
      ADMIN_CALLER,
    );

    expect(result.fullName).toBe('Alice Jones');
    expect(prismaModule.prisma.user.update).toHaveBeenCalled();
  });

  test('throws 400 when system_admin tries to change own roleId', async () => {
    const adminUser = { ...BASE_USER, id: 'admin-uuid', roleId: 'admin-role-id' };
    prismaModule.prisma.user.findUnique.mockResolvedValue(adminUser);

    await expect(
      svc.updateUser('admin-uuid', { roleId: 'other-role-id' }, ADMIN_CALLER),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('role') });
  });

  test('throws 404 when target user not found', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      svc.updateUser('missing-id', { fullName: 'X' }, ADMIN_CALLER),
    ).rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 when new email is taken by another user', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue({ ...BASE_USER, email: 'old@school.ug' });
    prismaModule.prisma.user.findFirst.mockResolvedValue(BASE_USER); // conflict

    await expect(
      svc.updateUser('user-uuid', { email: 'alice@school.ug' }, ADMIN_CALLER),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── deactivateUser ────────────────────────────────────────────

describe('deactivateUser', () => {
  test('happy path — deactivates user and revokes sessions', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(BASE_USER);

    const deactivatedUser = { ...BASE_USER, isActive: false };
    prismaModule.prisma.$transaction.mockResolvedValue([deactivatedUser, { count: 2 }]);

    const result = await svc.deactivateUser('user-uuid', 'admin-uuid');

    expect(result.isActive).toBe(false);
    expect(prismaModule.prisma.$transaction).toHaveBeenCalled();
  });

  test('throws 400 when trying to deactivate yourself', async () => {
    await expect(
      svc.deactivateUser('same-uuid', 'same-uuid'),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('own account') });

    // Should not even query DB
    expect(prismaModule.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('throws 404 when target user not found', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      svc.deactivateUser('missing-uuid', 'admin-uuid'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── reactivateUser ────────────────────────────────────────────

describe('reactivateUser', () => {
  test('happy path — sets isActive = true', async () => {
    const inactiveUser = { ...BASE_USER, isActive: false };
    prismaModule.prisma.user.findUnique.mockResolvedValue(inactiveUser);
    prismaModule.prisma.user.update.mockResolvedValue({ ...inactiveUser, isActive: true });

    const result = await svc.reactivateUser('user-uuid');

    expect(result.isActive).toBe(true);
    expect(prismaModule.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: true } }),
    );
  });

  test('throws 404 when user not found', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null);

    await expect(svc.reactivateUser('missing-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ── resetPassword ─────────────────────────────────────────────

describe('resetPassword', () => {
  test('generates new temp password and sets mustChangePassword = true', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(BASE_USER);

    const updatedUser = { ...BASE_USER, mustChangePassword: true };
    prismaModule.prisma.$transaction.mockResolvedValue([updatedUser, { count: 1 }]);

    const result = await svc.resetPassword('user-uuid');

    expect(result.tempPassword).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(result.user.mustChangePassword).toBe(true);

    // bcrypt should hash the new temp password
    const bcrypt = (await import('bcrypt')).default;
    expect(bcrypt.hash).toHaveBeenCalledWith(result.tempPassword, 12);
  });

  test('revokes all active sessions in the same transaction', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(BASE_USER);
    prismaModule.prisma.$transaction.mockResolvedValue([
      { ...BASE_USER, mustChangePassword: true },
      { count: 3 },
    ]);

    await svc.resetPassword('user-uuid');

    // $transaction was called (contains both update and updateMany)
    expect(prismaModule.prisma.$transaction).toHaveBeenCalled();
    const txArgs = prismaModule.prisma.$transaction.mock.calls[0][0];
    expect(Array.isArray(txArgs)).toBe(true);
    expect(txArgs).toHaveLength(2);
  });

  test('throws 404 when user not found', async () => {
    prismaModule.prisma.user.findUnique.mockResolvedValue(null);

    await expect(svc.resetPassword('missing-uuid')).rejects.toMatchObject({ status: 404 });
  });
});
