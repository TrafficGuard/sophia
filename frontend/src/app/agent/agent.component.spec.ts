import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentComponent } from './agent.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@app/material.module';
import { of, throwError } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('AgentComponent', () => {
  let component: AgentComponent;
  let fixture: ComponentFixture<AgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AgentComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule, MaterialModule, MatSnackBarModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save functions and update UI', () => {
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);
    httpClientSpy.post.and.returnValue(of({}));
    component.http = httpClientSpy as any;
    component.agentDetails = { functions: ['func1', 'func2', 'func3'] };
    component.agentId = 'test-agent-id';
    component.functionSelections = [true, false, true];
    component.editMode = true;

    component.saveFunctions();

    expect(httpClientSpy.post).toHaveBeenCalledWith(`${environment.serverUrl}/agent/v1/update-functions`, {
      agentId: 'test-agent-id',
      functions: ['func1', 'func3'],
    });
    expect(component.editMode).toBeFalse();
    expect(component.isSavingFunctions).toBeFalse();
  });

  it('should handle errors when saving functions', () => {
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);
    httpClientSpy.post.and.returnValue(throwError(() => new Error('Test error')));
    component.http = httpClientSpy as any;
    component.agentDetails = { functions: ['func1', 'func2'] };
    component.agentId = 'test-agent-id';
    component.functionSelections = [true, true];
    component.editMode = true;

    component.saveFunctions();

    expect(httpClientSpy.post).toHaveBeenCalled();
    expect(component.isSavingFunctions).toBeFalse();
    expect(component.editMode).toBeTrue();
  });

  it('should set isSavingFunctions to true when saving functions', () => {
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);
    httpClientSpy.post.and.returnValue(of({}));
    component.http = httpClientSpy as any;
    component.agentDetails = { functions: ['func1', 'func2'] };
    component.agentId = 'test-agent-id';
    component.functionSelections = [true, true];
    component.editMode = true;

    component.saveFunctions();

    expect(component.isSavingFunctions).toBeTrue();
  });

  describe('extractFunctionCallHistory', () => {
    it('should extract function call history from user prompt text', () => {
      const userPromptText =
        'Some text <function_call_history>Function call history content</function_call_history> more text';
      const extracted = component.extractFunctionCallHistory(userPromptText);
      expect(extracted).toBe('Function call history content');
    });

    it('should return null if no function call history is present', () => {
      const userPromptText = 'Some text without function call history';
      const extracted = component.extractFunctionCallHistory(userPromptText);
      expect(extracted).toBeNull();
    });

    it('should handle multiple function call history tags correctly', () => {
      const userPromptText =
        'Text <function_call_history>First call</function_call_history> Text <function_call_history>Second call</function_call_history>';
      const extracted = component.extractFunctionCallHistory(userPromptText);
      expect(extracted).toBe('First call');
    });
  });
});
