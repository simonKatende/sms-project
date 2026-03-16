import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations (must precede all imports) ─────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    subject: {
      findUnique:  jest.fn(),
      findFirst:   jest.fn(),
      findMany:    jest.fn(),
      create:      jest.fn(),
      update:      jest.fn(),
      delete:      jest.fn(),
    },
    pupilScore: {
      count: jest.fn(),
    },
    class: {
      findFirst: jest.fn(),
    },
    term: {
      findUnique: jest.fn(),
    },
    classSubjectAssignment: {
      findUnique:  jest.fn(),
      findFirst:   jest.fn(),
      findMany:    jest.fn(),
      create:      jest.fn(),
      update:      jest.fn(),
      delete:      jest.fn(),
      deleteMany:  jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// ── Lazy imports ──────────────────────────────────────────────

let svc;
let prismaModule;

beforeAll(async () => {
  prismaModule = await import('../../lib/prisma.js');
  svc          = await import('../../services/SubjectService.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────

const SUBJECT = {
  id:       'sub-uuid',
  name:     'Mathematics',
  code:     'MAT',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CLASS = { id: 'class-uuid', name: 'P.3', isActive: true };
const TERM  = { id: 'term-uuid', termNumber: 1, termLabel: 'Term 1' };

const ASSIGNMENT = {
  id:           'assign-uuid',
  classId:      'class-uuid',
  subjectId:    'sub-uuid',
  termId:       'term-uuid',
  displayOrder: 1,
  maxScore:     100,
};

// ── listSubjects ──────────────────────────────────────────────

describe('listSubjects', () => {
  test('returns active subjects by default', async () => {
    prismaModule.prisma.subject.findMany.mockResolvedValue([SUBJECT]);

    const result = await svc.listSubjects();

    expect(result).toHaveLength(1);
    expect(prismaModule.prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  test('returns all subjects when includeInactive=true', async () => {
    prismaModule.prisma.subject.findMany.mockResolvedValue([SUBJECT]);

    await svc.listSubjects({ includeInactive: true });

    expect(prismaModule.prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

// ── createSubject ─────────────────────────────────────────────

describe('createSubject', () => {
  test('happy path — creates subject', async () => {
    prismaModule.prisma.subject.findUnique.mockResolvedValue(null); // no conflicts
    prismaModule.prisma.subject.create.mockResolvedValue(SUBJECT);

    const result = await svc.createSubject({ name: 'Mathematics', code: 'MAT' });

    expect(result).toEqual(SUBJECT);
    expect(prismaModule.prisma.subject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Mathematics', code: 'MAT', isActive: true }),
      }),
    );
  });

  test('throws 409 when name already exists', async () => {
    prismaModule.prisma.subject.findUnique.mockResolvedValueOnce(SUBJECT); // name conflict

    await expect(
      svc.createSubject({ name: 'Mathematics', code: 'MAT' }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Mathematics') });
  });

  test('throws 409 when code already exists', async () => {
    prismaModule.prisma.subject.findUnique
      .mockResolvedValueOnce(null)     // name is free
      .mockResolvedValueOnce(SUBJECT); // code conflict

    await expect(
      svc.createSubject({ name: 'NewSubject', code: 'MAT' }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('MAT') });
  });
});

// ── updateSubject ─────────────────────────────────────────────

describe('updateSubject', () => {
  test('happy path — updates subject fields', async () => {
    prismaModule.prisma.subject.findUnique
      .mockResolvedValueOnce(SUBJECT) // find the existing subject
      .mockResolvedValueOnce(null);   // no conflict for new name 'Maths'
    prismaModule.prisma.subject.update.mockResolvedValue({ ...SUBJECT, name: 'Maths' });

    const result = await svc.updateSubject('sub-uuid', { name: 'Maths' });

    expect(result.name).toBe('Maths');
  });

  test('throws 404 when subject not found', async () => {
    prismaModule.prisma.subject.findUnique.mockResolvedValue(null);

    await expect(svc.updateSubject('bad-id', { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });

  test('throws 409 on name conflict with another subject', async () => {
    const OTHER = { ...SUBJECT, id: 'other-uuid', name: 'Maths' };
    prismaModule.prisma.subject.findUnique
      .mockResolvedValueOnce(SUBJECT)   // found the subject to update
      .mockResolvedValueOnce(OTHER);    // name conflict

    await expect(
      svc.updateSubject('sub-uuid', { name: 'Maths' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── deleteSubject ─────────────────────────────────────────────

describe('deleteSubject', () => {
  test('happy path — deletes subject when no scores exist', async () => {
    prismaModule.prisma.subject.findUnique.mockResolvedValue(SUBJECT);
    prismaModule.prisma.pupilScore.count.mockResolvedValue(0);
    prismaModule.prisma.subject.delete.mockResolvedValue(SUBJECT);

    await svc.deleteSubject('sub-uuid');

    expect(prismaModule.prisma.subject.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-uuid' } }),
    );
  });

  test('throws 409 when score entries exist — cannot delete, must deactivate', async () => {
    prismaModule.prisma.subject.findUnique.mockResolvedValue(SUBJECT);
    prismaModule.prisma.pupilScore.count.mockResolvedValue(5); // scores exist

    await expect(svc.deleteSubject('sub-uuid')).rejects.toMatchObject({
      status:  409,
      message: expect.stringContaining('score entries exist'),
    });

    expect(prismaModule.prisma.subject.delete).not.toHaveBeenCalled();
  });

  test('throws 404 when subject not found', async () => {
    prismaModule.prisma.subject.findUnique.mockResolvedValue(null);

    await expect(svc.deleteSubject('missing-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ── listAssignments ───────────────────────────────────────────

describe('listAssignments', () => {
  test('returns assignments ordered by displayOrder', async () => {
    prismaModule.prisma.classSubjectAssignment.findMany.mockResolvedValue([ASSIGNMENT]);

    const result = await svc.listAssignments({ classId: 'class-uuid', termId: 'term-uuid' });

    expect(result).toHaveLength(1);
    expect(prismaModule.prisma.classSubjectAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   { classId: 'class-uuid', termId: 'term-uuid' },
        orderBy: { displayOrder: 'asc' },
      }),
    );
  });

  test('throws 400 when classId is missing', async () => {
    await expect(
      svc.listAssignments({ classId: undefined, termId: 'term-uuid' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── createAssignment ──────────────────────────────────────────

describe('createAssignment', () => {
  test('happy path — creates assignment with defaults', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(CLASS);
    prismaModule.prisma.subject.findFirst.mockResolvedValue(SUBJECT);
    prismaModule.prisma.term.findUnique.mockResolvedValue(TERM);
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(null);
    prismaModule.prisma.classSubjectAssignment.create.mockResolvedValue({
      ...ASSIGNMENT,
      subject: SUBJECT,
    });

    const result = await svc.createAssignment(
      { classId: 'class-uuid', subjectId: 'sub-uuid', termId: 'term-uuid' },
      'admin-uuid',
    );

    expect(result).toMatchObject({ id: 'assign-uuid' });
    expect(prismaModule.prisma.classSubjectAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayOrder: 1, maxScore: 100 }),
      }),
    );
  });

  test('throws 404 when class not active', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(null);

    await expect(
      svc.createAssignment({ classId: 'class-uuid', subjectId: 'sub-uuid', termId: 'term-uuid' }),
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('Class') });
  });

  test('throws 404 when subject not active', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(CLASS);
    prismaModule.prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      svc.createAssignment({ classId: 'class-uuid', subjectId: 'sub-uuid', termId: 'term-uuid' }),
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('Subject') });
  });

  test('throws 409 when assignment already exists', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(CLASS);
    prismaModule.prisma.subject.findFirst.mockResolvedValue(SUBJECT);
    prismaModule.prisma.term.findUnique.mockResolvedValue(TERM);
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(ASSIGNMENT); // conflict

    await expect(
      svc.createAssignment({ classId: 'class-uuid', subjectId: 'sub-uuid', termId: 'term-uuid' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── updateAssignment ──────────────────────────────────────────

describe('updateAssignment', () => {
  test('happy path — updates displayOrder and maxScore', async () => {
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(ASSIGNMENT);
    prismaModule.prisma.classSubjectAssignment.update.mockResolvedValue({
      ...ASSIGNMENT,
      displayOrder: 3,
      maxScore:     80,
      subject:      SUBJECT,
    });

    const result = await svc.updateAssignment('assign-uuid', { displayOrder: 3, maxScore: 80 });

    expect(result.displayOrder).toBe(3);
    expect(result.maxScore).toBe(80);
  });

  test('throws 404 when assignment not found', async () => {
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(null);

    await expect(
      svc.updateAssignment('missing-uuid', { displayOrder: 1 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── deleteAssignment ──────────────────────────────────────────

describe('deleteAssignment', () => {
  test('happy path — deletes assignment when no scores exist', async () => {
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(ASSIGNMENT);
    prismaModule.prisma.pupilScore.count.mockResolvedValue(0);
    prismaModule.prisma.classSubjectAssignment.delete.mockResolvedValue(ASSIGNMENT);

    await svc.deleteAssignment('assign-uuid');

    expect(prismaModule.prisma.classSubjectAssignment.delete).toHaveBeenCalled();
  });

  test('throws 409 when scores already exist for this subject+term', async () => {
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(ASSIGNMENT);
    prismaModule.prisma.pupilScore.count.mockResolvedValue(3); // scores present

    await expect(svc.deleteAssignment('assign-uuid')).rejects.toMatchObject({
      status:  409,
      message: expect.stringContaining('scores already entered'),
    });

    expect(prismaModule.prisma.classSubjectAssignment.delete).not.toHaveBeenCalled();
  });

  test('throws 404 when assignment not found', async () => {
    prismaModule.prisma.classSubjectAssignment.findUnique.mockResolvedValue(null);

    await expect(svc.deleteAssignment('missing-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ── bulkAssignSubjects ────────────────────────────────────────

describe('bulkAssignSubjects', () => {
  const SUBJECTS_INPUT = [
    { subjectId: 'sub-uuid-1', displayOrder: 1, maxScore: 100 },
    { subjectId: 'sub-uuid-2', displayOrder: 2, maxScore: 100 },
  ];

  test('happy path — replaces all previous assignments in a transaction', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(CLASS);
    prismaModule.prisma.term.findUnique.mockResolvedValue(TERM);
    // Both subjects are valid
    prismaModule.prisma.subject.findFirst
      .mockResolvedValueOnce({ ...SUBJECT, id: 'sub-uuid-1' })
      .mockResolvedValueOnce({ ...SUBJECT, id: 'sub-uuid-2' });
    // No existing assignments → no score check needed
    prismaModule.prisma.classSubjectAssignment.findMany.mockResolvedValue([]);

    const newA1 = { ...ASSIGNMENT, id: 'new-1', subjectId: 'sub-uuid-1' };
    const newA2 = { ...ASSIGNMENT, id: 'new-2', subjectId: 'sub-uuid-2' };
    // $transaction result: [deleteMany result, ...creates]
    prismaModule.prisma.$transaction.mockResolvedValue([{ count: 0 }, newA1, newA2]);

    const result = await svc.bulkAssignSubjects(
      { classId: 'class-uuid', termId: 'term-uuid', subjects: SUBJECTS_INPUT },
      'admin-uuid',
    );

    expect(prismaModule.prisma.$transaction).toHaveBeenCalled();
    // Returns everything except the deleteMany result
    expect(result).toEqual([newA1, newA2]);
  });

  test('throws 409 when existing assignments already have scores', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(CLASS);
    prismaModule.prisma.term.findUnique.mockResolvedValue(TERM);
    prismaModule.prisma.subject.findFirst
      .mockResolvedValueOnce({ ...SUBJECT, id: 'sub-uuid-1' })
      .mockResolvedValueOnce({ ...SUBJECT, id: 'sub-uuid-2' });
    // Existing assignments present
    prismaModule.prisma.classSubjectAssignment.findMany.mockResolvedValue([
      { subjectId: 'old-sub-uuid' },
    ]);
    // And they have scores
    prismaModule.prisma.pupilScore.count.mockResolvedValue(10);

    await expect(
      svc.bulkAssignSubjects(
        { classId: 'class-uuid', termId: 'term-uuid', subjects: SUBJECTS_INPUT },
        'admin-uuid',
      ),
    ).rejects.toMatchObject({
      status:  409,
      message: expect.stringContaining('scores have already been entered'),
    });

    expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled();
  });

  test('throws 404 when a subject in the list is not found or inactive', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(CLASS);
    prismaModule.prisma.term.findUnique.mockResolvedValue(TERM);
    prismaModule.prisma.subject.findFirst.mockResolvedValue(null); // subject missing

    await expect(
      svc.bulkAssignSubjects(
        { classId: 'class-uuid', termId: 'term-uuid', subjects: SUBJECTS_INPUT },
        'admin-uuid',
      ),
    ).rejects.toMatchObject({ status: 404 });

    expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled();
  });

  test('throws 404 when class not found', async () => {
    prismaModule.prisma.class.findFirst.mockResolvedValue(null);

    await expect(
      svc.bulkAssignSubjects(
        { classId: 'bad-uuid', termId: 'term-uuid', subjects: [] },
        'admin-uuid',
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
