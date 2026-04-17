import { FilesService } from '../../src/files/files.service';

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(() => {
    service = new FilesService(
      { fileStoragePath: '/tmp/meridian-files-test' } as any,
      {
        validateExtension: jest.fn(() => '.txt'),
        validateSize: jest.fn(),
        sanitizeFilename: jest.fn(() => 'safe.txt'),
        validateMagicBytes: jest.fn(),
        validateStructure: jest.fn().mockResolvedValue(undefined),
      } as any,
    );
  });

  it('getFileStream throws for missing file', () => {
    expect(() => service.getFileStream('missing/file.txt')).toThrow('File not found');
  });
});
