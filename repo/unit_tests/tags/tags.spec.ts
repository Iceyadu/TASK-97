import { TagsService } from '../../src/tags/tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let mockRepo: any;
  let qb: any;

  beforeEach(() => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'tag-1', ...data })),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    service = new TagsService(mockRepo);
  });

  describe('create', () => {
    it('should create a new tag', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.create('new-tag');
      expect(result.name).toBe('new-tag');
    });

    it('should reject duplicate tag names', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'existing', name: 'dupe' });
      await expect(service.create('dupe')).rejects.toThrow(
        'Tag already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const result = await service.findAll({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(qb.orderBy).toHaveBeenCalledWith('t.name', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should cap pageSize at 100', async () => {
      const result = await service.findAll({ pageSize: 200 });
      expect(result.pageSize).toBeLessThanOrEqual(100);
      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('applies search filter to query builder', async () => {
      await service.findAll({ search: 'data' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.name ILIKE :s', {
        s: '%data%',
      });
    });
  });

  describe('delete', () => {
    it('passes id through to repository delete', async () => {
      await service.delete('tag-123');
      expect(mockRepo.delete).toHaveBeenCalledWith('tag-123');
    });
  });
});
