import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatControlsComponent } from './chat-controls.component';

describe('ChatControlsComponent', () => {
  let component: ChatControlsComponent;
  let fixture: ComponentFixture<ChatControlsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatControlsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
