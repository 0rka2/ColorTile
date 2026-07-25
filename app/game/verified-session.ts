type VerifiedGameContext = {
  gameSessionId: number;
  userId: string;
};

export function isVerifiedGameContextCurrent(
  expected: VerifiedGameContext,
  current: VerifiedGameContext,
) {
  return (
    expected.gameSessionId === current.gameSessionId &&
    expected.userId === current.userId
  );
}
