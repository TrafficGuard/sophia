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
      // Initialize form controls for llmConfig, gitlabConfig, githubConfig, jiraConfig, and perplexityKey
    });
  }

  ngOnInit(): void {
  }

}
