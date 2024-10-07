import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RunAgentComponent } from './runAgent.component';
import { MaterialModule } from '@app/material.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('RunAgentComponent', () => {
  let component: RunAgentComponent;
  let fixture: ComponentFixture<RunAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RunAgentComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule, NoopAnimationsModule, MatSnackBarModule, MaterialModule],
    }).compileComponents();
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
      count: 5,
    });
    expect(component.runAgentForm.valid).toBeTruthy();
  });

  it('should have "codegen" as the default type', () => {
    expect(component.runAgentForm.get('type')?.value).toBe('codegen');
  });

  it('should allow changing the type to "xml"', () => {
    component.runAgentForm.patchValue({ type: 'xml' });
    expect(component.runAgentForm.get('type')?.value).toBe('xml');
  });
});
