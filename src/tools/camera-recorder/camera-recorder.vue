<script setup lang="ts">
import { useMediaRecorder } from './useMediaRecorder';
import { requestMediaPermission } from './media-permissions';

interface Media { type: 'image' | 'video'; value: string; createdAt: Date }

const video = ref<HTMLVideoElement>();
const medias = ref<Media[]>([]);
const devices = ref<MediaDeviceInfo[]>([]);
const cameras = computed(() => devices.value.filter(({ kind }) => kind === 'videoinput'));
const microphones = computed(() => devices.value.filter(({ kind }) => kind === 'audioinput'));
const currentCamera = ref(cameras.value[0]?.deviceId);
const currentMicrophone = ref(microphones.value[0]?.deviceId);
const cameraPermissionGranted = ref(false);
const microphonePermissionGranted = ref(false);
const cameraPermissionCannotBePrompted = ref(false);
const microphonePermissionCannotBePrompted = ref(false);
const includeMicrophone = ref(false);
const isSupported = useSupported(() => typeof navigator !== 'undefined' && 'mediaDevices' in navigator);

const {
  stream,
  start,
  stop,
  enabled: isMediaStreamAvailable,
} = useUserMedia({
  constraints: computed(() => ({
    video: currentCamera.value ? { deviceId: currentCamera.value } : true,
    audio: includeMicrophone.value && microphonePermissionGranted.value
      ? (currentMicrophone.value ? { deviceId: currentMicrophone.value } : true)
      : false,
  })),
  autoSwitch: true,
});

const {
  isRecordingSupported,
  onRecordAvailable,
  startRecording,
  stopRecording,
  pauseRecording,
  recordingState,
  resumeRecording,
  disposeRecording,
} = useMediaRecorder({
  stream,
});

onRecordAvailable((value) => {
  medias.value.unshift({ type: 'video', value, createdAt: new Date() });
});

function refreshCurrentDevices() {
  if (!currentCamera.value || !cameras.value.find(i => i.deviceId === currentCamera.value)) {
    currentCamera.value = cameras.value[0]?.deviceId;
  }

  if (!currentMicrophone.value || !microphones.value.find(i => i.deviceId === currentMicrophone.value)) {
    currentMicrophone.value = microphones.value[0]?.deviceId;
  }
}

async function refreshDevices() {
  if (!isSupported.value) {
    return;
  }

  devices.value = await navigator.mediaDevices.enumerateDevices();
  refreshCurrentDevices();
}

function takeScreenshot() {
  if (!video.value) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.value.videoWidth;
  canvas.height = video.value.videoHeight;
  canvas.getContext('2d')?.drawImage(video.value, 0, 0);
  const image = canvas.toDataURL('image/png');

  medias.value.unshift({ type: 'image', value: image, createdAt: new Date() });
}

watchEffect(() => {
  if (video.value && stream.value) {
    video.value.srcObject = stream.value;
  }
});

onMounted(refreshDevices);
useEventListener(
  () => typeof navigator === 'undefined' ? undefined : navigator.mediaDevices,
  'devicechange',
  refreshDevices,
);

onBeforeUnmount(() => {
  disposeRecording();
  stop();
  medias.value.forEach(({ type, value }) => {
    if (type === 'video') {
      URL.revokeObjectURL(value);
    }
  });
});

async function requestCameraPermission() {
  try {
    await requestMediaPermission({
      mediaDevices: navigator.mediaDevices,
      constraints: { video: true, audio: false },
    });
    cameraPermissionGranted.value = true;
    cameraPermissionCannotBePrompted.value = false;
    await refreshDevices();
  }
  catch {
    cameraPermissionCannotBePrompted.value = true;
  }
}

async function requestMicrophonePermission() {
  try {
    await requestMediaPermission({
      mediaDevices: navigator.mediaDevices,
      constraints: { video: false, audio: true },
    });
    microphonePermissionGranted.value = true;
    microphonePermissionCannotBePrompted.value = false;
    includeMicrophone.value = true;
    await refreshDevices();
  }
  catch {
    microphonePermissionCannotBePrompted.value = true;
  }
}

function downloadMedia({ type, value, createdAt }: Media) {
  const link = document.createElement('a');
  link.href = value;
  link.download = `${type}-${createdAt.getTime()}.${type === 'image' ? 'png' : 'webm'}`;
  link.click();
}

function removeMedia(index: number) {
  const media = medias.value[index];
  if (media?.type === 'video') {
    URL.revokeObjectURL(media.value);
  }
  medias.value.splice(index, 1);
}
</script>

<template>
  <div>
    <c-card v-if="!isSupported">
      Your browser does not support recording video from camera
    </c-card>

    <c-card v-else-if="!cameraPermissionGranted" text-center>
      Camera access is disabled until you explicitly grant permission.

      <c-alert v-if="cameraPermissionCannotBePrompted" mt-4 text-left>
        Your browser has blocked the camera permission request. You need to grant permission manually in
        your browser settings (usually the lock icon in the address bar).
      </c-alert>

      <div v-else mt-4 flex justify-center>
        <c-button @click="requestCameraPermission">
          Grant camera access
        </c-button>
      </div>
    </c-card>

    <c-card v-else>
      <div flex flex-col gap-2>
        <c-select
          v-model:value="currentCamera"
          :disabled="recordingState !== 'stopped'"
          label-position="left"
          label-width="60px"
          label="Video:"
          :options="cameras.map(({ deviceId, label }, index) => ({ value: deviceId, label: label || `Camera ${index + 1}` }))"
          placeholder="Select camera"
        />

        <div border="1px solid current" border-op-10 rounded p-3>
          <template v-if="!microphonePermissionGranted">
            <div text-sm op-70>
              Microphone access is optional and is requested separately.
            </div>
            <c-alert v-if="microphonePermissionCannotBePrompted" mt-2>
              Your browser blocked microphone access. Camera-only capture remains available.
            </c-alert>
            <c-button v-else mt-2 :disabled="recordingState !== 'stopped'" @click="requestMicrophonePermission">
              Enable microphone
            </c-button>
          </template>

          <template v-else>
            <n-checkbox
              v-model:checked="includeMicrophone"
              :disabled="recordingState !== 'stopped'"
              :aria-disabled="recordingState !== 'stopped'"
            >
              Include microphone audio in recordings
            </n-checkbox>
            <c-select
              v-if="includeMicrophone && microphones.length > 0"
              v-model:value="currentMicrophone"
              :disabled="recordingState !== 'stopped'"
              mt-2
              label="Audio:"
              label-position="left"
              label-width="60px"
              :options="microphones.map(({ deviceId, label }, index) => ({ value: deviceId, label: label || `Microphone ${index + 1}` }))"
              placeholder="Select microphone"
            />
          </template>
        </div>
      </div>

      <div v-if="!isMediaStreamAvailable" mt-3 flex justify-center>
        <c-button type="primary" @click="start">
          Start webcam
        </c-button>
      </div>

      <div v-else>
        <div my-2>
          <video ref="video" autoplay controls playsinline max-h-full w-full />
        </div>

        <div flex items-center justify-between gap-2>
          <c-button :disabled="!isMediaStreamAvailable" @click="takeScreenshot">
            <span mr-2> <icon-mdi-camera /></span>
            Take screenshot
          </c-button>

          <div v-if="isRecordingSupported" flex justify-center gap-2>
            <c-button v-if="recordingState === 'stopped'" @click="startRecording">
              <span mr-2> <icon-mdi-video /></span>
              Start recording
            </c-button>

            <c-button v-if="recordingState === 'recording'" @click="pauseRecording">
              <span mr-2> <icon-mdi-pause /></span>
              Pause
            </c-button>

            <c-button v-if="recordingState === 'paused'" @click="resumeRecording">
              <span mr-2> <icon-mdi-play /></span>
              Resume
            </c-button>

            <c-button
              v-if="recordingState !== 'stopped'"
              type="error"
              :disabled="recordingState === 'stopping'"
              @click="stopRecording"
            >
              <span mr-2> <icon-mdi-record /></span>
              {{ recordingState === 'stopping' ? 'Stopping…' : 'Stop' }}
            </c-button>
          </div>
          <div v-else italic op-60>
            Video recording is not supported in your browser
          </div>
        </div>
      </div>
    </c-card>

    <div grid grid-cols-2 mt-5 gap-2>
      <c-card v-for="({ type, value, createdAt }, index) in medias" :key="index">
        <img v-if="type === 'image'" :src="value" max-h-full w-full alt="screenshot">

        <video v-else :src="value" controls max-h-full w-full />

        <div flex items-center justify-between>
          <div font-bold>
            {{ type === 'image' ? 'Screenshot' : 'Video' }}
          </div>

          <div flex gap-2>
            <c-button :aria-label="`Download ${type}`" @click="downloadMedia({ type, value, createdAt })">
              <icon-mdi-download />
            </c-button>

            <c-button :aria-label="`Delete ${type}`" @click="removeMedia(index)">
              <icon-mdi-delete-outline />
            </c-button>
          </div>
        </div>
      </c-card>
    </div>
  </div>
</template>
