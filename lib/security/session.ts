import {
  SessionStatus,
  UserSession,
} from "@/types/security";

export class SessionManager {
  private sessions: UserSession[] = [];

  create(session: UserSession) {
    this.sessions.push(session);
  }

  terminate(sessionId: string) {
    this.sessions = this.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: SessionStatus.TERMINATED,
          }
        : s
    );
  }

  activeSessions() {
    return this.sessions.filter(
      (s) => s.status === SessionStatus.ACTIVE
    );
  }

  getSessions() {
    return this.sessions;
  }
}

export const sessionManager =
  new SessionManager();