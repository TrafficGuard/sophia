import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MatChipsModule, MatChipInputEvent, MatChipInput } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CodeReviewEditComponent } from './code-review-edit.component';
import { CodeReviewService } from './code-review.service';

describe('CodeReviewEditComponent', () => {
  let component: CodeReviewEditComponent;
  let fixture: ComponentFixture<CodeReviewEditComponent>;
  let mockCodeReviewService: jest.Mocked<CodeReviewService>;

  beforeEach(async () => {
    mockCodeReviewService = {
      getCodeReviewConfig: jest.fn(),
      updateCodeReviewConfig: jest.fn(),
      createCodeReviewConfig: jest.fn(),
    } as unknown as jest.Mocked<CodeReviewService>;

    await TestBed.configureTestingModule({
      declarations: [CodeReviewEditComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule,
      ],
      providers: [{ provide: CodeReviewService, useValue: mockCodeReviewService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CodeReviewEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with empty values', () => {
    expect(component.editForm.get('description')?.value).toBe('');
    expect(component.editForm.get('file_extensions.include')?.value).toEqual([]);
    expect(component.editForm.get('requires.text')?.value).toEqual([]);
    expect(component.editForm.get('examples')?.value).toEqual([]);
  });

  it('should validate required fields', () => {
    const form = component.editForm;
    expect(form.valid).toBeFalsy();

    form.patchValue({
      description: 'Test description',
      file_extensions: { include: ['js'] },
      requires: { text: ['TODO'] },
    });
    component.addExample();
    const exampleGroup = (component.editForm.get('examples') as any).controls[0];
    exampleGroup.patchValue({
      code: 'console.log("Hello");',
      review_comment: 'Use proper logging',
    });

    expect(form.valid).toBeTruthy();
  });

  it('should validate arrayNotEmpty for file extensions', () => {
    const fileExtensions = component.editForm.get('file_extensions.include');
    expect(fileExtensions?.valid).toBeFalsy();

    fileExtensions?.setValue(['js']);
    expect(fileExtensions?.valid).toBeTruthy();

    fileExtensions?.setValue([]);
    expect(fileExtensions?.valid).toBeFalsy();
  });

  it('should validate arrayNotEmpty for required text', () => {
    const requiredText = component.editForm.get('requires.text');
    expect(requiredText?.valid).toBeFalsy();

    requiredText?.setValue(['TODO']);
    expect(requiredText?.valid).toBeTruthy();

    requiredText?.setValue([]);
    expect(requiredText?.valid).toBeFalsy();
  });

  it('should validate arrayNotEmpty for examples', () => {
    const examples = component.editForm.get('examples');
    expect(examples?.valid).toBeFalsy();

    component.addExample();
    const exampleGroup = (component.editForm.get('examples') as any).controls[0];
    exampleGroup.patchValue({
      code: 'console.log("Hello");',
      review_comment: 'Use proper logging',
    });
    expect(examples?.valid).toBeTruthy();

    component.removeExample(0);
    expect(examples?.valid).toBeFalsy();
  });

  it('should add and remove file extensions', () => {
    const fileExtensions = component.editForm.get('file_extensions.include');
    const mockInput = document.createElement('input');
    const mockEvent: MatChipInputEvent = {
      value: 'js',
      input: mockInput,
      chipInput: { clear: jest.fn() } as unknown as MatChipInput,
    };
    component.addExtension(mockEvent);
    expect(fileExtensions?.value).toEqual(['js']);

    component.removeExtension('js');
    expect(fileExtensions?.value).toEqual([]);
  });

  it('should add and remove required text', () => {
    const requiredText = component.editForm.get('requires.text');
    const mockInput = document.createElement('input');
    const mockEvent: MatChipInputEvent = {
      value: 'TODO',
      input: mockInput,
      chipInput: { clear: jest.fn() } as unknown as MatChipInput,
    };
    component.addRequiredText(mockEvent);
    expect(requiredText?.value).toEqual(['TODO']);

    component.removeRequiredText('TODO');
    expect(requiredText?.value).toEqual([]);
  });

  it('should initialize the form correctly', () => {
    expect(component.editForm.get('file_extensions.include')?.value).toEqual([]);
    expect(component.editForm.get('requires.text')?.value).toEqual([]);
  });

  it('should add and remove examples', () => {
    component.addExample();
    expect(component.examples.length).toBe(1);

    component.removeExample(0);
    expect(component.examples.length).toBe(0);
  });
});
