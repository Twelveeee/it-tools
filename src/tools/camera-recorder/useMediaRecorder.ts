import { type Ref, computed, ref, shallowRef } from 'vue';

export { useMediaRecorder };

export type RecordingState = 'stopped' | 'recording' | 'paused' | 'stopping';

function useMediaRecorder({ stream }: { stream: Ref<MediaStream | undefined> }): {
  isRecordingSupported: Ref<boolean>
  recordingState: Ref<RecordingState>
  startRecording: () => void
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  disposeRecording: () => void
  onRecordAvailable: (cb: (url: string) => void) => void
} {
  const isRecordingSupported = computed(() => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm'));
  const mediaRecorder = shallowRef<MediaRecorder | null>(null);
  const recordedChunks = ref<Blob[]>([]);
  const recordAvailable = createEventHook();
  const recordingState = ref<RecordingState>('stopped');

  const createVideo = () => {
    const blob = new Blob(recordedChunks.value, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    recordedChunks.value = [];
    return url;
  };

  const finalizeRecorder = (recorder: MediaRecorder, publishRecording: boolean) => {
    if (mediaRecorder.value !== recorder) {
      return;
    }

    recorder.ondataavailable = null;
    recorder.onstop = null;
    recorder.onerror = null;
    mediaRecorder.value = null;
    recordingState.value = 'stopped';

    if (publishRecording) {
      recordAvailable.trigger(createVideo());
    }
    else {
      recordedChunks.value = [];
    }
  };

  const startRecording = () => {
    if (!isRecordingSupported.value) {
      return;
    }
    if (!stream.value) {
      return;
    }
    if (recordingState.value !== 'stopped') {
      return;
    }

    const recorder = new MediaRecorder(stream.value, { mimeType: 'video/webm' });
    mediaRecorder.value = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.value.push(e.data);
      }
    };

    recorder.onstop = () => {
      finalizeRecorder(recorder, true);
    };

    recorder.onerror = () => {
      finalizeRecorder(recorder, false);
    };

    if (recorder.state !== 'inactive') {
      mediaRecorder.value = null;
      return;
    }

    recorder.start();
    recordingState.value = 'recording';
  };

  const stopRecording = () => {
    if (!isRecordingSupported.value) {
      return;
    }
    if (!mediaRecorder.value) {
      return;
    }
    if (recordingState.value === 'stopped' || recordingState.value === 'stopping') {
      return;
    }

    if (mediaRecorder.value.state === 'inactive') {
      recordingState.value = 'stopping';
      return;
    }

    recordingState.value = 'stopping';
    mediaRecorder.value.stop();
  };

  const pauseRecording = () => {
    if (!isRecordingSupported.value) {
      return;
    }
    if (!mediaRecorder.value) {
      return;
    }
    if (recordingState.value !== 'recording') {
      return;
    }

    if (mediaRecorder.value.state !== 'recording') {
      if (mediaRecorder.value.state === 'inactive') {
        recordingState.value = 'stopping';
      }
      return;
    }

    mediaRecorder.value.pause();
    recordingState.value = 'paused';
  };

  const resumeRecording = () => {
    if (!isRecordingSupported.value) {
      return;
    }
    if (!mediaRecorder.value) {
      return;
    }

    if (recordingState.value !== 'paused') {
      return;
    }

    if (mediaRecorder.value.state !== 'paused') {
      if (mediaRecorder.value.state === 'inactive') {
        recordingState.value = 'stopping';
      }
      return;
    }

    mediaRecorder.value.resume();
    recordingState.value = 'recording';
  };

  const disposeRecording = () => {
    const recorder = mediaRecorder.value;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }
    mediaRecorder.value = null;
    recordedChunks.value = [];
    recordingState.value = 'stopped';
  };

  return {
    isRecordingSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    disposeRecording,
    recordingState,

    onRecordAvailable: recordAvailable.on,
  };
}
