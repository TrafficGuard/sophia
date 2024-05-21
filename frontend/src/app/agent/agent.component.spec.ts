
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentComponent } from './agent.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('AgentComponent', () => {
  let component: AgentComponent;
  let fixture: ComponentFixture<AgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AgentComponent ],
      imports: [HttpClientTestingModule, RouterTestingModule]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('extractFunctionCallHistory', () => {
    it('should extract function call history from user prompt text', () => {
      const userPromptText = 'Some text <function_call_history>Function call history content</function_call_history> more text';
      const extracted = component.extractFunctionCallHistory(userPromptText);
      expect(extracted).toBe('Function call history content');
    });

    it('should return null if no function call history is present', () => {
      const userPromptText = 'Some text without function call history';
      const extracted = component.extractFunctionCallHistory(userPromptText);
      expect(extracted).toBeNull();
    });

    it('should handle multiple function call history tags correctly', () => {
      const userPromptText = 'Text <function_call_history>First call</function_call_history> Text <function_call_history>Second call</function_call_history>';
      const extracted = component.extractFunctionCallHistory(userPromptText);
      expect(extracted).toBe('First call');
    });
  });
});
