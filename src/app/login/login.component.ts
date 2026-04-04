import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  rememberMe: boolean = false;

  constructor(private router: Router) {}

  onSignIn() {
    console.log('Logging in with:', {
      username: this.username,
      password: this.password,
      rememberMe: this.rememberMe
    });
    
    // Navigate to subjects page
    this.router.navigate(['/subjects']);
  }
}