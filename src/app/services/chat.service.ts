import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

export interface ChatMessage {
  question: string;
  subject: string;
  user_id: number;
}

export interface ChatResponse {
  answer: string;
  in_syllabus: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat.php`;

  constructor(private http: HttpClient) {}

  sendMessage(payload: ChatMessage): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, payload);
  }
}