import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PerformanceService, PerformanceData, TopicPerformance, ScoreTrend } from '../services/performance.service';
import { SubjectService } from '../services/subject.service';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './performance.component.html',
  styleUrls: ['./performance.component.css']
})
export class PerformanceComponent implements OnInit {

  isMenuOpen  = false;
  isLoading   = true;
  errorMessage = '';

  selectedSubject = '';
  expandedTopic: string | null = null;

  data: PerformanceData = {
    success: false,
    subject: '',
    average_score: 0,
    total_quizzes: 0,
    topics_attempted: 0,
    subjects_attempted: 0,
    topics: [],
    subjects: [],
    score_trend: []
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private performanceService: PerformanceService,
    private subjectService: SubjectService
  ) {}

  ngOnInit(): void {
    // Try SubjectService first, then query param
    this.selectedSubject = this.subjectService.getSubject();

    if (!this.selectedSubject) {
      this.selectedSubject = this.route.snapshot.queryParamMap.get('subject') || '';
    }

    this.loadPerformance();
  }

  loadPerformance(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    this.performanceService.getPerformance(1, this.selectedSubject).subscribe({
      next: (res) => {
        this.data      = res;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load performance data. Please try again.';
        this.isLoading    = false;
      }
    });
  }

  switchSubject(subject: string): void {
    this.selectedSubject = subject;
    this.expandedTopic   = null;
    this.loadPerformance();
  }

  clearFilter(): void {
    this.selectedSubject = '';
    this.expandedTopic   = null;
    this.loadPerformance();
  }

  toggleTopic(topic: string): void {
    this.expandedTopic = this.expandedTopic === topic ? null : topic;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  getScoreColor(score: number): string {
    if (score >= 80) return '#28a745';
    if (score >= 70) return '#ffc107';
    if (score >= 50) return '#fd7e14';
    return '#dc3545';
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-green';
    if (score >= 70) return 'score-yellow';
    if (score >= 50) return 'score-orange';
    return 'score-red';
  }

  getUnderstandingClass(level: number): string {
    switch (level) {
      case 4: return 'understanding-excellent';
      case 3: return 'understanding-good';
      case 2: return 'understanding-developing';
      default: return 'understanding-needs-work';
    }
  }

  // How many dots to fill for understanding (out of 4)
  getUnderstandingDots(level: number): number[] {
    return Array(4).fill(0).map((_, i) => i < level ? 1 : 0);
  }

  // Trend line: map scores to SVG y-coords (80px tall area)
  getTrendPoints(trend: { pct: number }[]): string {
    if (!trend || trend.length < 2) return '';
    const w = 200, h = 60, pad = 10;
    const xs = trend.map((_, i) => pad + (i / (trend.length - 1)) * (w - pad * 2));
    const ys = trend.map(t => h - pad - ((t.pct / 100) * (h - pad * 2)));
    return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  }

  toggleMenu()  { this.isMenuOpen = !this.isMenuOpen; }
  closeMenu()   { this.isMenuOpen = false; }

  navigateTo(page: string): void {
    this.closeMenu();
    switch (page) {
      case 'home':        this.router.navigate(['/chat']); break;
      case 'subjects':    this.router.navigate(['/subjects']); break;
      case 'quiz':        this.router.navigate(['/quiz']); break;
      case 'performance': this.router.navigate(['/performance']); break;
      case 'login':       this.router.navigate(['/login']); break;
    }
  }
}