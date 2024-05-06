import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '@env/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    this.profileForm = new FormGroup({
      id: new FormControl(''),
      email: new FormControl(''),
      enabled: new FormControl(false),
      hilBudget: new FormControl(0),
      hilCount: new FormControl(0),
      llmConfig: new FormGroup({
        anthropicKey: new FormControl(''),
        openaiKey: new FormControl(''),
        groqKey: new FormControl(''),
        togetheraiKey: new FormControl('')
      }),
      gitlabConfig: new FormGroup({
        host: new FormControl(''),
        token: new FormControl(''),
        topLevelGroups: new FormControl('')
      }),
      jiraConfig: new FormGroup({
        baseUrl: new FormControl(''),
        email: new FormControl(''),
        token: new FormControl('')
      }),
      perplexityKey: new FormControl(''),
      // Initialize form controls for githubConfig
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }
      // ... (rest of the form initialization)
    });
  }

  // ... (rest of the component methods)

  onSave(): void {
    const updateUrl = `${environment.apiUrl}/profile/update`;
    this.http.post(updateUrl, { user: this.profileForm.value }).subscribe({
      next: () => {
        // ... (handle success)
        console.log('Profile updated successfully.');
        // Handle successful update, e.g., show a notification to the user
      },
      error: (error) => {
        this.snackBar.open('Failed to save profile.', 'Close', { duration: 3000 });
        // Handle error case, e.g., show an error notification to the user
      }
    });
  }

  // ... (rest of the component methods)
  private loadUserProfile(): void {
    const profileUrl = `${environment.apiUrl}/profile/view`;
    this.http.get(profileUrl).subscribe((user: any) => {
      this.profileForm.patchValue(user);
    }, error => {
      console.error('Failed to load user profile', error);
    });
  }

}
