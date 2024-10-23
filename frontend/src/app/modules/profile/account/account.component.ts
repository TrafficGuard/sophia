import { TextFieldModule } from '@angular/cdk/text-field';
import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormGroup,
    FormControl,
    Validators,
    ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'settings-account',
    templateUrl: './account.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        ReactiveFormsModule,
    ],
})
export class SettingsAccountComponent implements OnInit {
    accountForm: FormGroup;

    /**
     * Constructor
     */
    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form using new FormGroup and new FormControl
        this.accountForm = new FormGroup({
            id: new FormControl({ value: '', disabled: true }),
            username: new FormControl(''),
            email: new FormControl('', [Validators.required, Validators.email]),
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

        // Load the user profile data
        this.loadUserProfile();
    }

    // Load user profile data
    private loadUserProfile(): void {
        this.http.get('/api/profile/view').subscribe(
            (response: any) => {
                console.log('User profile data:', response.data);
                this.accountForm.patchValue(response.data);
            },
            (error) => {
                this.snackBar.open('Failed to load user profile', 'Close', { duration: 3000 });
                console.error(error);
            }
        );
    }

    // Save user profile data
    onSave(): void {
        if (this.accountForm.invalid) {
            // Handle invalid form state
            return;
        }

        const formData = this.accountForm.getRawValue();

        this.http.post('/api/profile/update', { user: formData }).subscribe(
            () => {
                this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
            },
            (error) => {
                this.snackBar.open('Failed to save profile.', 'Close', { duration: 3000 });
                console.error(error);
            }
        );
    }

    // Optional: Implement a cancel method
    onCancel(): void {
        this.accountForm.reset();
        this.loadUserProfile();
    }
}
