import { CategoriesService } from '../../src/categories/categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'cat-1', ...data })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    service = new CategoriesService(mockRepo);
  });

  describe('create', () => {
    it('should create root category with path /<name>', async () => {
      const result = await service.create({ name: 'Science' });
      expect(result.path).toBe('/Science');
      expect(result.depth).toBe(0);
    });

    it('should create child category with parent path prefix', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'parent-1',
        path: '/Science',
        depth: 0,
      });
      const result = await service.create({
        name: 'Physics',
        parentId: 'parent-1',
      });
      expect(result.path).toBe('/Science/Physics');
      expect(result.depth).toBe(1);
    });

    it('should reject if parent category not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ name: 'Child', parentId: 'nonexistent' }),
      ).rejects.toThrow('Parent category not found');
    });

    it('should support deeply nested categories', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'p2',
        path: '/Science/Physics',
        depth: 1,
      });
      const result = await service.create({
        name: 'Quantum',
        parentId: 'p2',
      });
      expect(result.path).toBe('/Science/Physics/Quantum');
      expect(result.depth).toBe(2);
    });
  });

  describe('update', () => {
    it('should update category name and rebuild path', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'cat-1',
        name: 'OldName',
        path: '/Science/OldName',
        depth: 1,
      });
      const result = await service.update('cat-1', { name: 'NewName' });
      expect(result.name).toBe('NewName');
      expect(result.path).toBe('/Science/NewName');
    });

    it('should reject if category not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('nonexistent', { name: 'X' }),
      ).rejects.toThrow('Category not found');
    });
  });

  describe('findAll', () => {
    it('returns full category tree ordered by path when parentId is omitted', async () => {
      await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: ['children'],
        order: { path: 'ASC' },
      });
    });

    it('returns children of a parent ordered by name', async () => {
      await service.findAll('parent-1');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { parentId: 'parent-1' },
        relations: ['children'],
        order: { name: 'ASC' },
      });
    });
  });

  describe('delete', () => {
    it('should delete category with no children', async () => {
      mockRepo.count.mockResolvedValue(0);
      await expect(service.delete('cat-1')).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith('cat-1');
    });

    it('should reject deletion of category with children', async () => {
      mockRepo.count.mockResolvedValue(3);
      await expect(service.delete('cat-1')).rejects.toThrow(
        'Cannot delete category with child categories',
      );
    });
  });
});
