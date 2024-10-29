import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
    let service: LocalStorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [LocalStorageService]
        });
        service = TestBed.inject(LocalStorageService);
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should store and retrieve scheme setting', () => {
        service.setScheme('dark');
        expect(service.getScheme()).toBe('dark');
    });

    it('should return null when no scheme is set', () => {
        expect(service.getScheme()).toBeNull();
    });

    it('should update existing scheme setting', () => {
        service.setScheme('dark');
        service.setScheme('light');
        expect(service.getScheme()).toBe('light');
    });
});
