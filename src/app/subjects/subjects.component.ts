import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subjects.component.html',
  styleUrls: ['./subjects.component.css']
})
export class SubjectsComponent {
  isMenuOpen = false;
  
  subjects = [
    'Biology', 'Mathematics', 'Chemistry', 'Physics', 'English',
    'Setswana', 'History', 'Geography', 'Agriculture', 'Computer Studies'
  ];
  subjectService: any;

  constructor(private router: Router) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  navigateTo(page: string) {
    this.closeMenu();
    switch(page) {
      case 'home':
        this.router.navigate(['/chat']);
        break;
      case 'subjects':
        this.router.navigate(['/subjects']);
        break;
      case 'quiz':
        this.router.navigate(['/quiz']);
        break;
      case 'performance':
        this.router.navigate(['/performance']);
        break;
      case 'login':
        this.router.navigate(['/login']);
        break;
    }
  }

  selectSubject(subject: string) {
    this.closeMenu();
   
    // Navigate to chat with the selected subject as a parameter
    this.router.navigate(['/chat'], { queryParams: { subject: subject } });
     this.subjectService.setSubject(subject);
  }
  
}