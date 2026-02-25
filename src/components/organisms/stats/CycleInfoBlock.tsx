interface CycleInfoBlockProps {
  cycleConfigured: boolean;
}

export function CycleInfoBlock({ cycleConfigured }: CycleInfoBlockProps) {
  if (cycleConfigured) {
    return null;
  }

  return (
    <p className="window-status">
      Configure `cycleStartLabel` et `cycleEndLabel` pour activer le calcul du cycle réel.
    </p>
  );
}
