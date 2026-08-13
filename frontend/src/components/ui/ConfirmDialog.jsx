import { AlertTriangle, HelpCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <Modal open onClose={onCancel} size="sm">
      <div className="flex flex-col items-center text-center">
        <span
          className={
            'mb-4 flex h-14 w-14 items-center justify-center rounded-full ' +
            (danger ? 'bg-danger-100 text-danger-600' : 'bg-info-100 text-info-600')
          }
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="text-lg font-bold text-coffee-900">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-coffee-500">{message}</p>
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
