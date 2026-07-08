import React from 'react';
import { View } from 'react-native';

interface TrailerPlayerProps {
  videoId: string;
  height?: number;
  onError?: () => void;
}

export function TrailerPlayer({ videoId, height = 210 }: TrailerPlayerProps) {
  return (
    <View style={{ height, width: '100%' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </View>
  );
}
