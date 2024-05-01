import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunAgentComponent } from './runAgent.component';

// jest

describe('RunAgentComponent', () => {
  let component: RunAgentComponent;
  let fixture: ComponentFixture<RunAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RunAgentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RunAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    // expect(component).to.exist();
  });
});
