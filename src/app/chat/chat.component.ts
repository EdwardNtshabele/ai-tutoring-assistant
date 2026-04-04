import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ChatService } from '../services/chat.service';

interface ChatMessage {
  question: string;
  answer: string;
  inSyllabus: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  isMenuOpen = false;
  selectedSubject: string = 'Biology';
  userMessage: string = '';
  chatHistory: ChatMessage[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.selectedSubject = params['subject'] || 'Biology';
      console.log('Selected subject:', this.selectedSubject);
      
      // Add welcome message
      this.chatHistory.push({
        question: 'System',
        answer: `Welcome! You're now studying ${this.selectedSubject}. How can I help you?`,
        inSyllabus: true
      });
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  navigateTo(page: string) {
    this.closeMenu();
    this.router.navigate([`/${page}`], { 
      queryParams: { subject: this.selectedSubject } 
    });
  }

  sendMessage() {
    if (!this.userMessage.trim() || this.isLoading) return;

    const question = this.userMessage;
    this.userMessage = '';
    this.isLoading = true;

    // Add user message to chat immediately
    this.chatHistory.push({
      question,
      answer: '...',
      inSyllabus: true
    });

    console.log('Sending message:', {
      question,
      subject: this.selectedSubject,
      user_id: 1
    });

    this.chatService.sendMessage({
      question,
      subject: this.selectedSubject,
      user_id: 1
    }).subscribe({
      next: (response) => {
        // Update the last message with the answer
        const lastIndex = this.chatHistory.length - 1;
        this.chatHistory[lastIndex].answer = response.answer;
        this.chatHistory[lastIndex].inSyllabus = response.in_syllabus;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        const lastIndex = this.chatHistory.length - 1;
        this.chatHistory[lastIndex].answer = 'Sorry, there was an error connecting to the server. Make sure XAMPP is running.';
        this.chatHistory[lastIndex].inSyllabus = false;
        this.isLoading = false;
      }
    });
  }

  /**
   * Format answer text with proper HTML formatting
   */
  formatAnswer(text: string): string {
    if (!text) return '';
    
    // Handle different response formats
    if (text === '...' || text === 'Thinking...') {
      return text;
    }
    
    try {
      // Convert markdown-style formatting to HTML
      let formatted = text
        // Headers (h1, h2, h3)
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Bold text
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/__(.*?)__/gim, '<strong>$1</strong>')
        
        // Italic text
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/_(.*?)_/gim, '<em>$1</em>')
        
        // Code blocks
        .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        
        // Horizontal rule
        .replace(/^---$/gim, '<hr>')
        
        // Line breaks
        .replace(/\n/gim, '<br>');
      
      // Handle lists (numbered and bullet)
      const lines = formatted.split('<br>');
      let inList = false;
      let listType = '';
      let listHtml = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for numbered list (1. item)
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          if (!inList || listType !== 'ol') {
            if (inList) listHtml.push(`</${listType}>`);
            listHtml.push('<ol>');
            inList = true;
            listType = 'ol';
          }
          listHtml.push(`<li>${numberedMatch[2]}</li>`);
          continue;
        }
        
        // Check for bullet list (- item or * item)
        const bulletMatch = line.match(/^[-*]\s+(.*)/);
        if (bulletMatch) {
          if (!inList || listType !== 'ul') {
            if (inList) listHtml.push(`</${listType}>`);
            listHtml.push('<ul>');
            inList = true;
            listType = 'ul';
          }
          listHtml.push(`<li>${bulletMatch[1]}</li>`);
          continue;
        }
        
        // If we were in a list and this line isn't a list item, close the list
        if (inList) {
          listHtml.push(`</${listType}>`);
          inList = false;
        }
        
        listHtml.push(line);
      }
      
      // Close any open list
      if (inList) {
        listHtml.push(`</${listType}>`);
      }
      
      formatted = listHtml.join('');
      
      // Remove empty paragraphs
      formatted = formatted.replace(/<br><br>/g, '<br>');
      
      return formatted;
    } catch (e) {
      console.error('Error formatting answer:', e);
      return text; // Return original text if formatting fails
    }
  }
}