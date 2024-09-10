import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatHeaderComponent } from './chat-header.component';

describe('ChatHeaderComponent', () => {
  let component: ChatHeaderComponent;
  let fixture: ComponentFixture<ChatHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
