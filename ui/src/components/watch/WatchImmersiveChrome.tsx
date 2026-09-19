import { Minimize2 } from "lucide-react";
import { IconButton } from "../ui";
import "./WatchImmersiveChrome.css";

/**
 * The only chrome immersive mode keeps: the title of what is playing and a way
 * back out. It rides over the player so the page itself can stay empty.
 */
export default function WatchImmersiveChrome({
  title,
  channelTitle,
  visible,
  exitLabel,
  onExit,
  onHoldChange,
}: {
  title: string;
  channelTitle?: string | null;
  visible: boolean;
  exitLabel: string;
  onExit: () => void;
  onHoldChange: (held: boolean) => void;
}) {
  return (
    <div className="watch-immersive-chrome" data-visible={visible ? "true" : "false"} aria-hidden={!visible}>
      <div
        className="watch-immersive-bar"
        onPointerEnter={() => onHoldChange(true)}
        onPointerLeave={() => onHoldChange(false)}
        onFocus={() => onHoldChange(true)}
        onBlur={() => onHoldChange(false)}
      >
        <div className="watch-immersive-titles">
          <span className="watch-immersive-title">{title}</span>
          {channelTitle && <span className="watch-immersive-channel">{channelTitle}</span>}
        </div>
        <IconButton
          className="watch-immersive-exit"
          variant="secondary"
          size="sm"
          label={exitLabel}
          showTitle={false}
          icon={<Minimize2 />}
          tabIndex={visible ? undefined : -1}
          onClick={(event) => { onExit(); if (event.detail > 0) event.currentTarget.blur(); }}
        />
      </div>
    </div>
  );
}
