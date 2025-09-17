'use client';

import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import FaceMeshModule from '@mediapipe/face_mesh'; // <-- default import
import CameraUtils from '@mediapipe/camera_utils';

export default function WebcamAnalysis() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const faceMesh = new FaceMeshModule.FaceMesh({ // <-- use FaceMeshModule.FaceMesh
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    let camera = null;

    if (webcamRef.current && webcamRef.current.video) {
      camera = new CameraUtils.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => {
      if (camera) camera.stop();
    };
  }, []);

  const onResults = (results) => {
    if (!canvasRef.current || !webcamRef.current) return;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const ctx = canvasRef.current.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiFaceLandmarks) {
      // Draw or log face landmarks
      // console.log('Face detected!', results.multiFaceLandmarks);
    }

    ctx.restore();
  };

  const webcamStyle = {
    position: 'absolute',
    marginLeft: 'auto',
    marginRight: 'auto',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 9,
    width: 640,
    height: 480,
    borderRadius: '10px',
  };

  const canvasStyle = { ...webcamStyle };

  return (
    <div style={{ position: 'relative', width: '640px', height: '480px' }}>
      <Webcam ref={webcamRef} style={webcamStyle} mirrored={true} />
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  );
}
