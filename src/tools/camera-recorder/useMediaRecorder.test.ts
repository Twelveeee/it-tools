import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useMediaRecorder } from './useMediaRecorder';

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];

  static isTypeSupported() {
    return true;
  }

  state: MediaRecorder['state'] = 'inactive';
  ondataavailable: MediaRecorder['ondataavailable'] = null;
  onerror: MediaRecorder['onerror'] = null;
  onstop: MediaRecorder['onstop'] = null;

  start = vi.fn(() => {
    this.state = 'recording';
  });

  stop = vi.fn(() => {
    this.state = 'inactive';
  });

  pause = vi.fn(() => {
    this.state = 'paused';
  });

  resume = vi.fn(() => {
    this.state = 'recording';
  });

  constructor() {
    FakeMediaRecorder.instances.push(this);
  }

  finish() {
    this.state = 'inactive';
    this.onstop?.call(this as unknown as MediaRecorder, new Event('stop'));
  }

  fail() {
    this.state = 'inactive';
    this.onerror?.call(this as unknown as MediaRecorder, new ErrorEvent('error'));
  }
}

describe('useMediaRecorder', () => {
  beforeEach(() => {
    FakeMediaRecorder.instances = [];
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:recording'),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('synchronizes its state when the browser stops the recorder', () => {
    const recorder = useMediaRecorder({ stream: ref({} as MediaStream) });

    recorder.startRecording();
    const mediaRecorder = FakeMediaRecorder.instances[0];
    expect(recorder.recordingState.value).toBe('recording');

    mediaRecorder.finish();

    expect(recorder.recordingState.value).toBe('stopped');
    expect(() => recorder.pauseRecording()).not.toThrow();
    expect(() => recorder.stopRecording()).not.toThrow();
    expect(mediaRecorder.pause).not.toHaveBeenCalled();
    expect(mediaRecorder.stop).not.toHaveBeenCalled();
  });

  it('keeps controls locked until the stop event has finalized the recording', () => {
    const recorder = useMediaRecorder({ stream: ref({} as MediaStream) });

    recorder.startRecording();
    const mediaRecorder = FakeMediaRecorder.instances[0];
    recorder.stopRecording();

    expect(mediaRecorder.stop).toHaveBeenCalledOnce();
    expect(recorder.recordingState.value).toBe('stopping');

    recorder.startRecording();
    expect(FakeMediaRecorder.instances).toHaveLength(1);

    mediaRecorder.finish();
    expect(recorder.recordingState.value).toBe('stopped');
  });

  it('returns to the stopped state when the recorder fails', () => {
    const recorder = useMediaRecorder({ stream: ref({} as MediaStream) });

    recorder.startRecording();
    const mediaRecorder = FakeMediaRecorder.instances[0];
    mediaRecorder.fail();

    expect(recorder.recordingState.value).toBe('stopped');
    expect(() => recorder.startRecording()).not.toThrow();
    expect(FakeMediaRecorder.instances).toHaveLength(2);
  });
});
