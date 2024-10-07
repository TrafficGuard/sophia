import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ChatControlsComponent } from './chat-controls.component';
import { ApiChatService } from '@app/chat/services/api/api-chat.service';
import { LlmService } from '@app/shared/services/llm.service';
import { of } from 'rxjs';
import { MaterialModule } from '@app/material.module';

describe.skip('ChatControlsComponent', () => {
  let component: ChatControlsComponent;
  let fixture: ComponentFixture<ChatControlsComponent>;
  let apiChatServiceSpy: jest.Mocked<ApiChatService>;
  let llmServiceSpy: jest.Mocked<LlmService>;

  beforeEach(async () => {
    apiChatServiceSpy = {
      sendMessage: jest.fn(),
    } as unknown as jest.Mocked<ApiChatService>;
    llmServiceSpy = {
      getLlms: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    await TestBed.configureTestingModule({
      declarations: [ChatControlsComponent],
      imports: [ReactiveFormsModule, MaterialModule],
      providers: [
        { provide: ApiChatService, useValue: apiChatServiceSpy },
        { provide: LlmService, useValue: llmServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatControlsComponent);
    component = fixture.componentInstance;

    // llmServiceSpy.getLlms.and.returnValue(of([{ id: 'llm1', name: 'LLM 1' }]));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call submit method when form is valid and submit button is clicked', () => {
    spyOn(component, 'submit');
    component.chatId = 'testChatId';
    component.chatForm.patchValue({
      message: 'Test message',
      selectedLlm: 'llm1',
    });
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[color="primary"]');
    submitButton.click();

    expect(component.submit).toHaveBeenCalled();
  });

  it('should call submit method when all fields are filled and submit button is clicked', () => {
    spyOn(component, 'submit');
    component.chatId = 'testChatId';
    component.chatForm.patchValue({
      message: 'Test message',
      selectedLlm: 'llm1',
    });
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[color="primary"]');
    submitButton.click();

    expect(component.submit).toHaveBeenCalled();
    expect(apiChatServiceSpy.sendMessage).toHaveBeenCalledWith('testChatId', 'Test message', 'llm1');
  });

  it('should send message when submit method is called with valid form', () => {
    component.chatId = 'testChatId';
    component.chatForm.patchValue({
      message: 'Test message',
      selectedLlm: 'llm1',
    });
    apiChatServiceSpy.sendMessage.mockReturnValue(of({ data: 'Response message' }));

    component.submit();

    expect(apiChatServiceSpy.sendMessage).toHaveBeenCalledWith('testChatId', 'Test message', 'llm1');
    expect(component.isSending).toBeFalsy();
  });

  it('should show alert when submit is called without chat ID', () => {
    spyOn(window, 'alert');
    component.chatId = '';
    component.chatForm.patchValue({
      message: 'Test message',
      selectedLlm: 'llm1',
    });

    component.submit();

    expect(window.alert).toHaveBeenCalledWith('Unable to send message. Please try again later.');
  });
});
