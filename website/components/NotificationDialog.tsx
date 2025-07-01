"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export function NotificationDialog({
  open,
  onOpenChange,
  onClose,
}: NotificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-800 border-zinc-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-white border-b border-zinc-600 pb-4">
            Important Notification
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-zinc-300">
          <p>
            When connecting to a real robot, we've switched from mirroring angle
            changes to directly mirroring angles for easier and more precise
            control.
          </p>
          <p className="text-red-400 font-semibold">
            This means if you are using an older version of so-arm100, you need
            to re-calibrate it following{" "}
            <Link
              href="https://huggingface.co/docs/lerobot/so101#calibrate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              this guide
            </Link>
            .
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            className="bg-zinc-700 hover:bg-zinc-600 text-white w-full"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
