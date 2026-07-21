export async function requestMediaPermission({
  mediaDevices,
  constraints,
}: {
  mediaDevices: Pick<MediaDevices, 'getUserMedia'>
  constraints: MediaStreamConstraints
}) {
  const stream = await mediaDevices.getUserMedia(constraints);
  stream.getTracks().forEach(track => track.stop());
}
