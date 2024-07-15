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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RunAgentComponent } from './runAgent.component';

describe('RunAgentComponent', () => {
  let component: RunAgentComponent;
  let fixture: ComponentFixture<RunAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RunAgentComponent ],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatSnackBarModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RunAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a type field in the form with default value "xml"', () => {
    expect(component.runAgentForm.get('type')).toBeTruthy();
    expect(component.runAgentForm.get('type').value).toBe('xml');
  });

  it('should allow changing the type field value', () => {
    const typeControl = component.runAgentForm.get('type');
    typeControl.setValue('python');
    expect(typeControl.value).toBe('python');
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RunAgentComponent } from './runAgent.component';
import { MaterialModule } from '@app/material.module';

describe('RunAgentComponent', () => {
  let component: RunAgentComponent;
  let fixture: ComponentFixture<RunAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RunAgentComponent ],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatSnackBarModule,
        MaterialModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RunAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a valid form when all fields are filled', () => {
    component.runAgentForm.patchValue({
      name: 'Test Agent',
      userPrompt: 'Test prompt',
      type: 'xml',
      llmEasy: 'test-llm',
      llmMedium: 'test-llm',
      llmHard: 'test-llm',
      budget: 10,
      count: 5
    });
    expect(component.runAgentForm.valid).toBeTruthy();
  });

  it('should have "xml" as the default type', () => {
    expect(component.runAgentForm.get('type')?.value).toBe('xml');
  });

  it('should allow changing the type to "python"', () => {
    component.runAgentForm.patchValue({ type: 'python' });
    expect(component.runAgentForm.get('type')?.value).toBe('python');
  });
});
