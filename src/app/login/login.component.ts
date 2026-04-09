import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  isLoading    = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    // Handle Google callback — Angular receives user data in URL params
    // after Google redirects back via google-callback.php
    this.route.queryParams.subscribe(params => {
      if (params['user_id'] && params['email']) {
        this.authService.handleGoogleCallback({
          user_id: params['user_id'],
          name:    params['name']   || '',
          email:   params['email'],
          avatar:  params['avatar'] || '',
        });
        this.router.navigate(['/subjects']);
      }
      if (params['error']) {
        const detail = params['detail'] ? ` (${params['detail']})` : '';
        this.errorMessage = `Sign-in failed: ${params['error']}${detail}`;
        this.isLoading = false;
      }
    });
  }
  onGoogleSignIn() {
    this.isLoading    = true;
    this.errorMessage = '';

    this.authService.getGoogleAuthUrl().subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: () => {
        this.isLoading    = false;
        this.errorMessage = 'Could not connect to Google. Make sure XAMPP is running.';
      }
    });
  }
}