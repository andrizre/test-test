import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './ui';

export function useConfirm() {
  const [state, setState] = useState<{ msg: string; title: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = (msg: string, title = 'Konfirmasi') =>
    new Promise<boolean>((resolve) => setState({ msg, title, resolve }));

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  const dialog = state ? (
    <Modal
      open
      onClose={() => close(false)}
      title={state.title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>Batal</Button>
          <Button variant="danger" onClick={() => close(true)}>Ya, Hapus</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{state.msg}</p>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
