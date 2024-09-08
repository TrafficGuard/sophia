import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-code-review-list',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  isLoading: boolean = true;

  constructor(private router: Router, private dialog: MatDialog) {}

  ngOnInit() {}
}
