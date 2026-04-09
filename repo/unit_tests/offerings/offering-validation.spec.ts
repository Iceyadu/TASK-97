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
});
