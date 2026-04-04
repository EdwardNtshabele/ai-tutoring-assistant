import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

export interface TopicPerformance {
  topic: string;
  subject: string;
  quiz_count: number;
  avg_score: number;
  best_score: number;
  lowest_score: number;
  total_questions_answered: number;
  total_correct: number;
  last_attempted: string;
  understanding: string;
  understanding_level: number;
}

export interface ScoreTrend {
  pct: number;
  completed_at: string;
  topic: string;
}

export interface PerformanceData {
  success: boolean;
  subject: string;
  average_score: number;
  total_quizzes: number;
  topics_attempted: number;
  subjects_attempted: number;
  topics: TopicPerformance[];
  subjects: string[];
  score_trend: ScoreTrend[];
}

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private apiUrl = `${environment.apiUrl}/performance.php`;

  constructor(private http: HttpClient) {}

  getPerformance(userId: number = 1, subject?: string): Observable<PerformanceData> {
    let url = `${this.apiUrl}?user_id=${userId}`;
    if (subject) url += `&subject=${encodeURIComponent(subject)}`;
    return this.http.get<PerformanceData>(url);
  }
}