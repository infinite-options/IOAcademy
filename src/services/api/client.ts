/**
 * API client for communicating with Python backend
 */

import {
  StartInterviewRequest,
  StartInterviewResponse,
  QuestionResponse,
  SubmitAnswerRequest,
  EvaluationResponse,
  SessionStatusResponse,
  FeedbackResponse,
  ErrorResponse,
} from "../../types/interview";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail: string | undefined;
    try {
      const errorData: ErrorResponse = await response.json();
      errorDetail = errorData.detail || errorData.error;
    } catch {
      errorDetail = response.statusText;
    }
    throw new APIError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorDetail
    );
  }

  return response.json();
}

export const interviewAPI = {
  /**
   * Start a new interview session
   */
  async startInterview(
    request: StartInterviewRequest = {}
  ): Promise<StartInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    return handleResponse<StartInterviewResponse>(response);
  },

  /**
   * Get the next question for a session
   */
  async getQuestion(sessionId: string): Promise<QuestionResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/interview/${sessionId}/question`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return handleResponse<QuestionResponse>(response);
  },

  /**
   * Submit an answer and get evaluation
   */
  async submitAnswer(
    sessionId: string,
    request: SubmitAnswerRequest
  ): Promise<EvaluationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/interview/${sessionId}/answer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    return handleResponse<EvaluationResponse>(response);
  },

  /**
   * Get current session status
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/interview/${sessionId}/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return handleResponse<SessionStatusResponse>(response);
  },

  /**
   * Get final feedback for completed interview
   */
  async getFeedback(sessionId: string): Promise<FeedbackResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/interview/${sessionId}/feedback`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return handleResponse<FeedbackResponse>(response);
  },

  /**
   * Cancel an interview session
   */
  async cancelInterview(sessionId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/interview/${sessionId}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      await handleResponse(response);
    }
  },
};

export { APIError };

