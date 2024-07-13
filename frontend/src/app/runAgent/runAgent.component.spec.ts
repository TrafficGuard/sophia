import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunAgentComponent } from './runAgent.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@app/material.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// jest

describe('RunAgentComponent', () => {
  let component: RunAgentComponent;
  let fixture: ComponentFixture<RunAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        MaterialModule,
        NoopAnimationsModule,
      ],
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
