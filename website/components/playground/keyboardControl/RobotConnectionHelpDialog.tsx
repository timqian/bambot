import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RobotConnectionHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="text-white bg-zinc-700 hover:bg-zinc-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
          title="Help"
        >
          ?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-800 border-zinc-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-white border-b border-zinc-600 pb-4">
            Connecting to Follower Robot
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* <div>
            <div className="font-semibold mb-2">Before connecting:</div>
            <ul className="list-disc list-inside space-y-1 text-zinc-300">
              <li className="text-red-400 font-semibold">
                Ensure your physical robot's position matches the virtual
                robot's position
              </li>
              <li>Power on your robot</li>
              <li>Select the correct serial device when prompted</li>
            </ul>
          </div> */}
                    <div>
            <div className="font-semibold mb-2">How it works:</div>
            <ul className="list-disc list-inside space-y-1 text-zinc-300">
              {/* <li>The joints of the follower robot will mirror the positions of the virtual robot</li> */}
              <li>Servo positions are mirrored in real-time</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2 text-yellow-400">
              Safety tips:
            </div>
            <ul className="list-disc list-inside space-y-1 text-zinc-300">
              <li>Keep hands clear of moving parts</li>
              <li>Use slower speeds when first connecting</li>
              <li>Disconnect immediately if unexpected behavior occurs</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="bg-zinc-700 hover:bg-zinc-600 text-white"
            >
              Got it
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
