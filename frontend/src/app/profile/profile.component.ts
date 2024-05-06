import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  constructor() {
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
      // Initialize form controls for githubConfig, and perplexityKey
    });
  }

  ngOnInit(): void {
  }

}
