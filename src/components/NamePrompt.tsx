import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useRef, FormEvent } from 'react';

type Props = {
  title: string;
  label: string;
  placeholder: string;
  onConfirm: (name: string) => void;
  onClose: (result: boolean) => void;
};

export default function NamePrompt({ title, label, placeholder, onConfirm, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value && e.currentTarget.checkValidity()) {
      onConfirm(value);
      inputRef.current!.value = '';
    } else {
      return;
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  return (
    <Dialog.Root open={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            <form onSubmit={handleConfirm} className="dialog-form">
                <fieldset className="dialog-fieldset">
                    <label className="dialog-label">{label}</label>
                    <input
                    ref={inputRef}
                    className="input"
                    required
                    minLength={1}
                    maxLength={255}
                    pattern="^[a-zA-Z0-9]+$"
                    title="Name must be alphanumeric"
                    placeholder={placeholder}
                    autoFocus
                        />
                    </fieldset>
                    <div className="dialog-buttons">
                            <button type="submit" className="create-button" aria-label="Confirm">
                                Confirm
                            </button>
                            <button onClick={handleClose} className="close-button" aria-label="Close">
                                <Cross2Icon />
                            </button>
                    </div>
            </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
