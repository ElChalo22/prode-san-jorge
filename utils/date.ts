export function formatCountdown(date: string): string {
  const now = new Date();
  const closesAt = new Date(date);

  const diff = closesAt.getTime() - now.getTime();

  if (diff <= 0) {
    return "Cerrado";
  }

  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  return `${minutes}m`;
}