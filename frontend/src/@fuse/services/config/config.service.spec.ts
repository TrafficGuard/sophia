import { TestBed } from '@angular/core/testing';
import { FuseConfigService } from './config.service';
import { LocalStorageService } from 'app/core/services/local-storage.service';
import { FUSE_CONFIG } from './config.constants';

describe('FuseConfigService', () => {
    let service: FuseConfigService;
    let localStorageService: LocalStorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                FuseConfigService,
                LocalStorageService,
                {
                    provide: FUSE_CONFIG,
                    useValue: {
                        scheme: 'light',
                        theme: 'default',
                        screens: {},
                        layout: 'modern'
                    }
                }
            ]
        });
        service = TestBed.inject(FuseConfigService);
        localStorageService = TestBed.inject(LocalStorageService);
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should initialize with stored scheme if exists', () => {
        localStorageService.setScheme('dark');
        service = TestBed.inject(FuseConfigService);
        
        service.config$.subscribe(config => {
            expect(config.scheme).toBe('dark');
        });
    });

    it('should use default scheme if no stored value exists', () => {
        service.config$.subscribe(config => {
            expect(config.scheme).toBe('light');
        });
    });
});
