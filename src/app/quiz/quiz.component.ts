import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizService } from '../services/quiz.service';
import { SubjectService } from '../services/subject.service';

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
    private subjectService: SubjectService
  ) {}

  ngOnInit(): void {
    this.subject = this.subjectService.getSubject();

    if (!this.subject) {
      const paramSubject = this.route.snapshot.queryParamMap.get('subject');
      if (paramSubject) this.subject = paramSubject;
    }

    if (!this.subject) {
      console.warn('No subject selected, defaulting to Biology');
      this.subject = 'Biology';
    }

    this.loadSubtopics();
  }

  toggleMenu() { this.isMenuOpen = !this.isMenuOpen; }
  closeMenu() { this.isMenuOpen = false; }

  navigateTo(page: string) {
    this.closeMenu();
    switch (page) {
      case 'home':        this.router.navigate(['/chat']); break;
      case 'subjects':    this.router.navigate(['/subjects']); break;
      case 'quiz':        this.router.navigate(['/quiz']); break;
      case 'performance': this.router.navigate(['/performance']); break;
      case 'login':       this.router.navigate(['/login']); break;
    }
  }

  loadSubtopics() {
    this.quizService.getSubtopics(this.subject).subscribe({
      next: (res: any) => {
        this.topics = res?.topics || res?.data || res || [];
      },
      error: () => {
        this.errorMessage = 'Failed to load subtopics. Please try again.';
      }
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
      next: (res: any) => {
        this.generatedNotes = res?.notes || 'No notes generated.';
        this.notesLoading = false;
      },
      error: () => {
        this.generatedNotes = 'Failed to load notes. Please try again.';
        this.notesLoading = false;
      }
    });
  }

  closeNotesModal() {
    this.notesModalOpen = false;
    this.generatedNotes = '';
  }

  startQuiz() {
    if (!this.selectedTopic) return;

    this.quizLoading = true;
    this.errorMessage = '';
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.selectedAnswers = {};
    this.quizCompleted = false;
    this.quizResult = null;

    this.quizService.generateQuizFromSyllabus(this.subject, this.selectedTopic, 5)
      .subscribe({
        next: (res: any) => {
          this.questions = res?.questions || res?.data || res || [];
          this.quizLoading = false;

          if (!this.questions || this.questions.length === 0) {
            this.errorMessage = 'No questions were generated. Please try again.';
          }
        },
        error: () => {
          this.quizLoading = false;
          this.errorMessage = 'Quiz generation failed. Please check your connection and try again.';
        }
      });
  }

  selectAnswer(index: number, answer: string) {
    this.selectedAnswers[index] = answer;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  areAllQuestionsAnswered(): boolean {
    return Object.keys(this.selectedAnswers).length === this.questions.length;
  }

  // =============================================
  // ✅ THE SCORING FIX
  // Gemini is inconsistent — correct_answer might
  // be "A" while options are "A. Paris", or the
  // full text. We normalize both before comparing.
  // =============================================

  private normalizeAnswer(answer: string): string {
    if (!answer) return '';
    // Lowercase + trim
    let s = answer.trim().toLowerCase();
    // Strip leading "A. " / "A) " / "a. " prefix if present
    s = s.replace(/^[a-d][\.\)]\s*/i, '');
    return s;
  }

  private isCorrect(correctAnswer: string, selectedAnswer: string): boolean {
    if (!correctAnswer || !selectedAnswer) return false;

    const ca = correctAnswer.trim();
    const sa = selectedAnswer.trim();

    // Case 1: exact match (covers identical strings)
    if (ca === sa) return true;

    // Case 2: correct_answer is a bare letter e.g. "A"
    // Check if selected option STARTS with that letter
    if (/^[A-Da-d]$/.test(ca)) {
      return sa.toLowerCase().startsWith(ca.toLowerCase());
    }

    // Case 3: selected is a bare letter (shouldn't happen but guard anyway)
    if (/^[A-Da-d]$/.test(sa)) {
      return ca.toLowerCase().startsWith(sa.toLowerCase());
    }

    // Case 4: normalize both (strip "A. " prefix) and compare text
    return this.normalizeAnswer(ca) === this.normalizeAnswer(sa);
  }

  submitQuiz() {
    let score = 0;

    const results = this.questions.map((q, i) => {
      const selected = this.selectedAnswers[i];
      const correct = this.isCorrect(q.correct_answer, selected);
      if (correct) score++;

      return {
        question:       q.question,
        selected_answer: selected,
        correct_answer:  q.correct_answer,
        correct,
        explanation:    q.explanation
      };
    });

    this.quizResult = {
      score,
      total:      this.questions.length,
      percentage: (score / this.questions.length) * 100,
      results
    };

    this.quizCompleted = true;

    // Keep this log so you can verify what Gemini returns
    console.table(results.map(r => ({
      correct_answer:  r.correct_answer,
      selected_answer: r.selected_answer,
      scored:          r.correct
    })));
  }

  resetQuiz() {
    this.selectedTopic      = '';
    this.questions          = [];
    this.currentQuestionIndex = 0;
    this.selectedAnswers    = {};
    this.quizCompleted      = false;
    this.quizResult         = null;
    this.quizLoading        = false;
    this.errorMessage       = '';
    this.notesModalOpen     = false;
    this.generatedNotes     = '';
    this.notesLoading       = false;
  }
}