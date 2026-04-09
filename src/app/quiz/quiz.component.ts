import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizService } from '../services/quiz.service';
import { SubjectService } from '../services/subject.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit {

  isMenuOpen = false;
  subject = '';
  topics: string[] = [];
  selectedTopic = '';
  questions: any[] = [];
  currentQuestionIndex = 0;
  selectedAnswers: { [key: number]: string } = {};
  quizCompleted = false;
  quizResult: any = null;
  quizLoading = false;
  errorMessage = '';
  notesModalOpen = false;
  generatedNotes = '';
  notesLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private quizService: QuizService,
    private subjectService: SubjectService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subject = this.subjectService.getSubject();
    if (!this.subject) {
      const p = this.route.snapshot.queryParamMap.get('subject');
      if (p) this.subject = p;
    }
    if (!this.subject) this.subject = 'Biology';
    this.loadSubtopics();
  }

  toggleMenu() { this.isMenuOpen = !this.isMenuOpen; }
  closeMenu()  { this.isMenuOpen = false; }

  navigateTo(page: string) {
    this.closeMenu();
    switch (page) {
      case 'home':        this.router.navigate(['/chat']); break;
      case 'subjects':    this.router.navigate(['/subjects']); break;
      case 'quiz':        this.router.navigate(['/quiz']); break;
      case 'performance': this.router.navigate(['/performance']); break;
      case 'login':       this.authService.logout(); break;
    }
  }

  loadSubtopics() {
    this.quizService.getSubtopics(this.subject).subscribe({
      next: (res: any) => { this.topics = res?.topics || res?.data || res || []; },
      error: () => { this.errorMessage = 'Failed to load subtopics.'; }
    });
  }

  selectTopic(topic: string) {
    this.selectedTopic = topic;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.selectedAnswers = {};
    this.quizCompleted = false;
    this.quizResult = null;
    this.errorMessage = '';
  }

  fetchNotes(topic: string) {
    this.notesModalOpen = true;
    this.notesLoading = true;
    this.generatedNotes = '';
    this.quizService.generateNotes(this.subject, topic).subscribe({
      next: (res: any) => { this.generatedNotes = res?.notes || 'No notes generated.'; this.notesLoading = false; },
      error: () => { this.generatedNotes = 'Failed to load notes.'; this.notesLoading = false; }
    });
  }

  closeNotesModal() { this.notesModalOpen = false; this.generatedNotes = ''; }

  startQuiz() {
    if (!this.selectedTopic) return;
    this.quizLoading = true;
    this.errorMessage = '';
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.selectedAnswers = {};
    this.quizCompleted = false;
    this.quizResult = null;

    this.quizService.generateQuizFromSyllabus(this.subject, this.selectedTopic, 5).subscribe({
      next: (res: any) => {
        this.questions = res?.questions || res?.data || res || [];
        this.quizLoading = false;
        if (!this.questions.length) this.errorMessage = 'No questions generated. Try again.';
      },
      error: () => { this.quizLoading = false; this.errorMessage = 'Quiz generation failed.'; }
    });
  }

  selectAnswer(index: number, answer: string) { this.selectedAnswers[index] = answer; }
  nextQuestion() { if (this.currentQuestionIndex < this.questions.length - 1) this.currentQuestionIndex++; }
  previousQuestion() { if (this.currentQuestionIndex > 0) this.currentQuestionIndex--; }
  areAllQuestionsAnswered(): boolean { return Object.keys(this.selectedAnswers).length === this.questions.length; }

  private normalizeAnswer(a: string): string {
    return a?.trim().toLowerCase().replace(/^[a-d][\.\)]\s*/i, '') ?? '';
  }

  private isCorrect(ca: string, sa: string): boolean {
    if (!ca || !sa) return false;
    if (ca.trim() === sa.trim()) return true;
    if (/^[A-Da-d]$/.test(ca.trim())) return sa.trim().toLowerCase().startsWith(ca.trim().toLowerCase());
    if (/^[A-Da-d]$/.test(sa.trim())) return ca.trim().toLowerCase().startsWith(sa.trim().toLowerCase());
    return this.normalizeAnswer(ca) === this.normalizeAnswer(sa);
  }

  submitQuiz() {
    console.log('Saving with user_id:', this.authService.userId);
    let score = 0;
    const results = this.questions.map((q, i) => {
      const selected = this.selectedAnswers[i];
      const correct  = this.isCorrect(q.correct_answer, selected);
      if (correct) score++;
      return { question: q.question, selected_answer: selected, correct_answer: q.correct_answer, correct, explanation: q.explanation };
    });

    this.quizResult   = { score, total: this.questions.length, percentage: (score / this.questions.length) * 100, results };
    this.quizCompleted = true;

    //Save with real logged-in user_id from AuthService
    this.quizService.saveResult(this.subject, this.selectedTopic, score, this.questions.length)
      .subscribe({
        next: () => console.log('Result saved for user_id:', this.authService.userId),
        error: (e: any) => console.error('Save failed:', e)
      });
  }

  resetQuiz() {
    this.selectedTopic = ''; this.questions = []; this.currentQuestionIndex = 0;
    this.selectedAnswers = {}; this.quizCompleted = false; this.quizResult = null;
    this.quizLoading = false; this.errorMessage = ''; this.notesModalOpen = false;
    this.generatedNotes = ''; this.notesLoading = false;
  }
}