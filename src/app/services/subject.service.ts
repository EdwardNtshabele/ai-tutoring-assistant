import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private selectedSubject = '';

  setSubject(subject: string) {
    this.selectedSubject = subject;
  }

  getSubject() {
    return this.selectedSubject;
  }
}
