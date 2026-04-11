import { OfferingsService } from '../../src/offerings/offerings.service';

describe('OfferingsService - Validation', () => {
  let service: OfferingsService;
  let mockRepo: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'off-1', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    mockAuditService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };
    service = new OfferingsService(mockRepo, mockAuditService);
  });

  describe('seat capacity validation', () => {
    const validBase = {
      title: 'Test Offering',
      enrollmentWindowStart: new Date('2026-05-01'),
      enrollmentWindowEnd: new Date('2026-06-01'),
    };

    it('should reject seat capacity of 0', async () => {
      await expect(
        service.create({ ...validBase, seatCapacity: 0 }, 'user1'),
      ).rejects.toThrow('Seat capacity must be between 1 and 5000');
    });

    it('should accept seat capacity of 1', async () => {
      const result = await service.create(
        { ...validBase, seatCapacity: 1 },
        'user1',
      );
      expect(result.seatCapacity).toBe(1);
    });

    it('should accept seat capacity of 5000', async () => {
      const result = await service.create(
        { ...validBase, seatCapacity: 5000 },
        'user1',
      );
      expect(result.seatCapacity).toBe(5000);
    });

    it('should reject seat capacity of 5001', async () => {
      await expect(
        service.create({ ...validBase, seatCapacity: 5001 }, 'user1'),
      ).rejects.toThrow('Seat capacity must be between 1 and 5000');
    });

    it('should reject negative seat capacity', async () => {
      await expect(
        service.create({ ...validBase, seatCapacity: -1 }, 'user1'),
      ).rejects.toThrow('Seat capacity must be between 1 and 5000');
    });
  });

  describe('enrollment window validation', () => {
    it('should reject end before start', async () => {
      await expect(
        service.create(
          {
            title: 'Test',
            seatCapacity: 10,
            enrollmentWindowStart: new Date('2026-06-01'),
            enrollmentWindowEnd: new Date('2026-05-01'),
          },
          'user1',
        ),
      ).rejects.toThrow('Enrollment window end must be after start');
    });

    it('should reject equal start and end', async () => {
      const date = new Date('2026-06-01');
      await expect(
        service.create(
          {
            title: 'Test',
            seatCapacity: 10,
            enrollmentWindowStart: date,
            enrollmentWindowEnd: date,
          },
          'user1',
        ),
      ).rejects.toThrow('Enrollment window end must be after start');
    });

    it('should accept valid window', async () => {
      const result = await service.create(
        {
          title: 'Test',
          seatCapacity: 10,
          enrollmentWindowStart: new Date('2026-05-01'),
          enrollmentWindowEnd: new Date('2026-06-01'),
        },
        'user1',
      );
      expect(result.title).toBe('Test');
    });
  });

  describe('seats initialization', () => {
    it('should set seatsAvailable equal to seatCapacity on creation', async () => {
      const result = await service.create(
        {
          title: 'Test',
          seatCapacity: 100,
          enrollmentWindowStart: new Date('2026-05-01'),
          enrollmentWindowEnd: new Date('2026-06-01'),
        },
        'user1',
      );
      expect(result.seatsAvailable).toBe(100);
    });
  });

  describe('findAll query validation', () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockRepo.createQueryBuilder.mockReturnValue(qb);
    });

    it('rejects invalid status filter', async () => {
      await expect(
        service.findAll({ status: 'nope' }),
      ).rejects.toThrow('Invalid status filter');
    });

    it('accepts string page and pageSize from query params', async () => {
      await service.findAll({ page: '2', pageSize: '10' });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('rejects non-numeric page', async () => {
      await expect(service.findAll({ page: 'x' })).rejects.toThrow(
        'Invalid page or pageSize',
      );
    });
  });
});
