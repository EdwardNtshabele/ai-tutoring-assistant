import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private apiUrl       = 'http://localhost/ai-tutor-backend/api/quiz.php';
  private saveUrl      = 'http://localhost/ai-tutor-backend/api/save_result.php';

  constructor(private http: HttpClient) {}

  getSubtopics(subject: string): Observable<any> {
    return this.http.get(`${this.apiUrl}?action=get_topics&subject=${encodeURIComponent(subject)}`);
  }

  generateQuizFromSyllabus(subject: string, subtopic: string, num: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}?action=generate_from_syllabus`,
      { subject, topic: subtopic, num_questions: num }
    );
  }

  generateNotes(subject: string, topic: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}?action=generate_notes`,
      { subject, topic }
    );
  }

  // ✅ Call this after submitQuiz() to persist the score
  saveResult(subject: string, topic: string, score: number, totalQuestions: number): Observable<any> {
    return this.http.post(this.saveUrl, {
      user_id: 1,   // replace with real auth user id when ready
      subject,
      topic,
      score,
      total_questions: totalQuestions
    });
  }
}