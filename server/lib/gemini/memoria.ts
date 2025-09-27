const memoriaUsuarios: Record<string, any> = {};

export async function getUserMemory(userId: string | undefined | null) {
  if (!userId) return {};
  return memoriaUsuarios[userId] || {};
}

export async function updateUserMemory(userId: string | undefined | null, dados: any) {
  if (!userId) return;
  memoriaUsuarios[userId] = {
    ...memoriaUsuarios[userId],
    ...dados
  };
}