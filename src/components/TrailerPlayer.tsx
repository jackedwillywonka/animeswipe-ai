import React from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';

interface TrailerPlayerProps {
  videoId: string;
  height?: number;
  onError?: () => void;
}

export function TrailerPlayer({ videoId, height = 210, onError }: TrailerPlayerProps) {
  return <YoutubePlayer height={height} play videoId={videoId} onError={onError} />;
}
