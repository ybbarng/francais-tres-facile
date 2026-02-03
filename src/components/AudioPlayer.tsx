"use client";

import { Card, CardContent } from "@/components/ui/card";
import Player from "./Player";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  onPlayCountUpdate?: () => void;
}

export default function AudioPlayer({ audioUrl, title, onPlayCountUpdate }: AudioPlayerProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Player
          audioUrl={audioUrl}
          title={title}
          playlistLength={1}
          onPlayCountUpdate={onPlayCountUpdate}
        />
      </CardContent>
    </Card>
  );
}
