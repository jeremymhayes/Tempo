import { getPrisma } from "@/lib/db";

type AdminUserQueryRow = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  _count: {
    games: number;
    sessions: number;
  };
};

export type AdminUserRow = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  gameCount: number;
  sessionCount: number;
};

export async function listUsers(): Promise<AdminUserRow[]> {
  const users: AdminUserQueryRow[] = await getPrisma().user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      createdAt: true,
      _count: { select: { games: true, sessions: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    gameCount: u._count.games,
    sessionCount: u._count.sessions,
  }));
}

type AdminUserDetailQueryRow = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    sessions: number;
  };
  games: Array<{
    id: string;
    whiteName: string | null;
    blackName: string | null;
    result: string | null;
    event: string | null;
    playedAt: Date | null;
    createdAt: Date;
    _count: {
      moves: number;
    };
  }>;
};

export type AdminUserGame = {
  id: string;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  playedAt: string | null;
  createdAt: string;
  moveCount: number;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  games: AdminUserGame[];
};

export async function getUserDetail(
  id: string,
): Promise<AdminUserDetail | null> {
  const user: AdminUserDetailQueryRow | null =
    await getPrisma().user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { sessions: true } },
        games: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            whiteName: true,
            blackName: true,
            result: true,
            event: true,
            playedAt: true,
            createdAt: true,
            _count: { select: { moves: true } },
          },
        },
      },
    });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    sessionCount: user._count.sessions,
    games: user.games.map((g) => ({
      id: g.id,
      whiteName: g.whiteName,
      blackName: g.blackName,
      result: g.result,
      event: g.event,
      playedAt: g.playedAt?.toISOString() ?? null,
      createdAt: g.createdAt.toISOString(),
      moveCount: g._count.moves,
    })),
  };
}
