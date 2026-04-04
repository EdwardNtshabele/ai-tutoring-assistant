import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ChatComponent } from './chat/chat.component';
import { SubjectsComponent } from './subjects/subjects.component';
import { QuizComponent } from './quiz/quiz.component';
import { PerformanceComponent } from './performance/performance.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'subjects', component: SubjectsComponent },
  { path: 'quiz', component: QuizComponent },
  { path: 'performance', component: PerformanceComponent }
];