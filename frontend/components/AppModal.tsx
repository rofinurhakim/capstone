"use client";

import { useState } from "react";
import { Button, Input, Modal, useOverlayState } from "@heroui/react";

function Frame({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer: React.ReactNode }) {
  const state = useOverlayState({ isOpen: open, onOpenChange: (value) => !value && onClose() });
  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center">
          <Modal.Dialog>
            <Modal.Header><Modal.Heading>{title}</Modal.Heading></Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>{footer}</Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function FormModal({ open, title, formId, children, confirmLabel, onClose }: { open: boolean; title: string; formId: string; children: React.ReactNode; confirmLabel: string; onClose: () => void }) {
  return <Frame open={open} onClose={onClose} title={title} footer={<><Button variant="tertiary" onPress={onClose}>Cancel</Button><Button variant="primary" type="submit" form={formId}>{confirmLabel}</Button></>}>
    {children}
  </Frame>;
}

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({ open, title, message, confirmLabel, tone = "primary", onClose, onConfirm }: ConfirmModalProps) {
  return (
    <Frame open={open} onClose={onClose} title={title} footer={
      <>
          <Button variant="tertiary" onPress={onClose}>Cancel</Button>
          <Button variant={tone} onPress={onConfirm}>{confirmLabel}</Button>
      </>
    }><p>{message}</p></Frame>
  );
}

type InputModalProps = {
  open: boolean;
  title: string;
  message?: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

function InputModalContent({ title, message, label, initialValue = "", confirmLabel, onClose, onConfirm }: Omit<InputModalProps, "open">) {
  const [value, setValue] = useState(initialValue);
  return (
    <Frame open title={title} onClose={onClose} footer={
      <>
          <Button variant="tertiary" onPress={onClose}>Cancel</Button>
          <Button variant="primary" onPress={() => onConfirm(value)}>{confirmLabel}</Button>
      </>
    }>
          {message && <p className="mb-2 text-sm opacity-70">{message}</p>}
          <label className="grid gap-2 text-sm font-semibold"><span>{label}</span><Input autoFocus value={value} onChange={(event) => setValue(event.target.value)} /></label>
    </Frame>
  );
}

export function InputModal({ open, ...props }: InputModalProps) {
  return open ? <InputModalContent key={props.initialValue ?? ""} {...props} /> : null;
}