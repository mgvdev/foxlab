interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <p className="p-3 text-sm text-zinc-400">{message}</p>;
}
