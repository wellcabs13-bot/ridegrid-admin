import {
  SessionStatus,
  UserSession,
} from "@/types/security";

import {
  prisma,
} from "@/lib/prisma";

export class SessionManager {
  private sessions =
    new Map<string, UserSession>();

  async create(
    session: UserSession
  ): Promise<UserSession> {
    this.sessions.set(
      session.id,
      session
    );

    await prisma.loginHistory.create({
      data: {
        userId: session.userId,
        ipAddress:
          session.ipAddress,
        device:
          session.device,
        browser:
          session.browser,
        loginTime:
          session.loginAt,
      },
    });

    return session;
  }

  async terminate(
    sessionId: string
  ): Promise<boolean> {
    const session =
      this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    this.sessions.set(
      sessionId,
      {
        ...session,
        status:
          SessionStatus.TERMINATED,
      }
    );

    return true;
  }

  activeSessions(): UserSession[] {
    return Array.from(
      this.sessions.values()
    ).filter(
      (session) =>
        session.status ===
        SessionStatus.ACTIVE
    );
  }

  getSessions(): UserSession[] {
    return Array.from(
      this.sessions.values()
    );
  }

  getSession(
    sessionId: string
  ): UserSession | null {
    return (
      this.sessions.get(
        sessionId
      ) ?? null
    );
  }

  getUserSessions(
    userId: string
  ): UserSession[] {
    return Array.from(
      this.sessions.values()
    ).filter(
      (session) =>
        session.userId === userId
    );
  }

  terminateUserSessions(
    userId: string
  ): number {
    let count = 0;

    for (const [
      id,
      session,
    ] of this.sessions.entries()) {
      if (
        session.userId === userId &&
        session.status ===
          SessionStatus.ACTIVE
      ) {
        this.sessions.set(id, {
          ...session,
          status:
            SessionStatus.TERMINATED,
        });

        count += 1;
      }
    }

    return count;
  }

  clear(): void {
    this.sessions.clear();
  }
}

export const sessionManager =
  new SessionManager();