import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LlmService } from '../shared/services/llm.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  constructor(private http: HttpClient, private snackBar: MatSnackBar, private llmService: LlmService) {
    this.profileForm = this.createProfileForm();
  }

  private createProfileForm(): FormGroup {
    return new FormGroup({
      id: new FormControl({ value: '', disabled: true }),
      email: new FormControl(''),
      enabled: new FormControl(false),
      hilBudget: new FormControl(0),
      hilCount: new FormControl(0),
      llmConfig: new FormGroup({
        anthropicKey: new FormControl(''),
        openaiKey: new FormControl(''),
        groqKey: new FormControl(''),
        togetheraiKey: new FormControl(''),
        fireworksKey: new FormControl(''),
        deepseekKey: new FormControl(''),
      }),
      functionConfig: new FormGroup({
        GitHub: new FormGroup({
          token: new FormControl(''),
        }),
        GitLab: new FormGroup({
          host: new FormControl(''),
          token: new FormControl(''),
          topLevelGroups: new FormControl(''),
        }),
        Jira: new FormGroup({
          baseUrl: new FormControl(''),
          email: new FormControl(''),
          token: new FormControl(''),
        }),
        Slack: new FormGroup({
          token: new FormControl(''),
          userId: new FormControl(''),
          webhookUrl: new FormControl(''),
        }),
        Perplexity: new FormGroup({
          key: new FormControl(''),
        }),
      }),
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  onSave(): void {
    const updateUrl = `${environment.serverUrl}/profile/update`;
    const formValue = this.profileForm.getRawValue();
    this.http.post(updateUrl, { user: formValue }).subscribe({
      next: () => {
        this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
        this.llmService.clearCache();
        this.loadLlmList();
      },
      error: (error) => {
        this.snackBar.open('Failed to save profile.', 'Close', { duration: 3000 });
        console.log(error);
      },
    });
  }

  private loadUserProfile(): void {
    console.log('Loading user profile...');
    const profileUrl = `${environment.serverUrl}/profile/view`;
    this.http.get(profileUrl).subscribe(
      (response: any) => {
        console.log(response.data);
        this.profileForm.patchValue(response.data);
      },
      (error) => {
        console.log(error);
        this.snackBar.open('Failed to load user profile', 'Close', { duration: 3000 });
      }
    );
  }

  private loadLlmList(): void {
    this.llmService.getLlms().subscribe({
      next: (llms) => {
        console.log('LLM list loaded:', llms);
      },
      error: (error) => {
        console.error('Failed to load LLM list:', error);
        this.snackBar.open('Failed to load LLM list', 'Close', { duration: 3000 });
      },
    });
  }
}
