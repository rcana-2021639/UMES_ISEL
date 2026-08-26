import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/** `const { confirm, dialog } = useConfirm();` — `await confirm({...})` resolves true/false; render `{dialog}` once per component. */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setPending({ ...options, resolve }));
  }

  function handleConfirm() {
    pending?.resolve(true);
    setPending(null);
  }
  function handleCancel() {
    pending?.resolve(false);
    setPending(null);
  }

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title={pending?.title ?? ""}
      message={pending?.message ?? ""}
      confirmLabel={pending?.confirmLabel}
      danger={pending?.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
