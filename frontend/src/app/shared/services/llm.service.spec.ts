import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LlmService, LLM } from './llm.service';
import { environment } from '@env/environment';

describe('LlmService', () => {
  let service: LlmService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LlmService]
    });
    service = TestBed.inject(LlmService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch LLMs from the server', () => {
    const mockLlms: LLM[] = [
      { id: 'llm1', name: 'LLM 1', isConfigured: true },
      { id: 'llm2', name: 'LLM 2', isConfigured: false }
    ];

    service.getLlms().subscribe(llms => {
      expect(llms).toEqual(mockLlms);
    });

    const req = httpMock.expectOne(`${environment.serverUrl}/api/llms/list`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockLlms });
  });

  it('should cache LLMs after the first request', () => {
    const mockLlms: LLM[] = [
      { id: 'llm1', name: 'LLM 1', isConfigured: true }
    ];

    service.getLlms().subscribe();
    httpMock.expectOne(`${environment.serverUrl}/api/llms/list`).flush({ data: mockLlms });

    service.getLlms().subscribe(llms => {
      expect(llms).toEqual(mockLlms);
    });

    httpMock.expectNone(`${environment.serverUrl}/api/llms/list`);
  });

  it('should handle errors when fetching LLMs', () => {
    service.getLlms().subscribe({
      next: () => fail('should have failed with the 404 error'),
      error: (error) => {
        expect(error.message).toContain('Error Code: 404');
      }
    });

    const req = httpMock.expectOne(`${environment.serverUrl}/api/llms/list`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });
});
