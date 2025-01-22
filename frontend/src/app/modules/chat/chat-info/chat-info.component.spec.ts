/*
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatInfoComponent } from './chat-info.component';
import { UserService } from 'app/core/user/user.service';
import { BehaviorSubject, of } from 'rxjs';
import { User } from 'app/core/user/user.types';
import { MatDrawer } from '@angular/material/sidenav';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSliderHarness } from '@angular/material/slider/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ChatInfoComponent', () => {
    let component: ChatInfoComponent;
    let fixture: ComponentFixture<ChatInfoComponent>;
    let loader: HarnessLoader;
    let mockUserService: jasmine.SpyObj<UserService>;
    let mockUser$: BehaviorSubject<User>;

    beforeEach(async () => {
        // Create mock user with default chat settings
        const mockUser: User = {
            id: '1',
            name: 'Test User',
            email: 'test@test.com',
            chat: {
                temperature: 0.7,
                enabledLLMs: {},
                defaultLLM: 'test-llm'
            }
        };

        // Setup mock user service
        mockUser$ = new BehaviorSubject<User>(mockUser);
        mockUserService = jasmine.createSpyObj('UserService', ['update']);
        mockUserService.user$ = mockUser$.asObservable();
        mockUserService.update.and.returnValue(of(mockUser));

        await TestBed.configureTestingModule({
            imports: [
                ChatInfoComponent,
                NoopAnimationsModule
            ],
            providers: [
                { provide: UserService, useValue: mockUserService },
                { provide: MatDrawer, useValue: { close: () => {} } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ChatInfoComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load initial settings from user service', async () => {
        // Get all slider harnesses
        const sliders = await loader.getAllHarnesses(MatSliderHarness);
        
        // Verify initial values match mock user settings
        expect(await (await sliders[0].getEndThumb()).getValue()).toBe(0.7); // temperature
        expect(await (await sliders[1].getEndThumb()).getValue()).toBe(0.9); // topP
        expect(await (await sliders[2].getEndThumb()).getValue()).toBe(0.5); // presencePenalty
        expect(await (await sliders[3].getEndThumb()).getValue()).toBe(0.5); // frequencyPenalty
    });

    it('should update settings when sliders change', async () => {
        // Get temperature slider and change its value
        const temperatureSlider = await loader.getHarness(MatSliderHarness);
        await (await temperatureSlider.getEndThumb()).setValue(1.5);
        
        // Verify component state was updated
        expect(component.settings.temperature).toBe(1.5);
    });

    it('should save settings on component destroy', () => {
        // Modify settings
        component.settings.temperature = 1.5;
        
        // Trigger component destruction
        component.ngOnDestroy();
        
        // Verify settings were saved
        expect(mockUserService.update).toHaveBeenCalledWith({
            chat: jasmine.objectContaining({
                temperature: 1.5
            })
        });
    });
});
*/