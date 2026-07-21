import { describe, expect, it, vi } from 'vitest';
import { requestMediaPermission } from './media-permissions';

function createMediaDevices() {
  const stop = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop }],
  });

  return { getUserMedia, stop };
}

describe('requestMediaPermission', () => {
  it('does not request camera access until explicitly invoked', async () => {
    const { getUserMedia, stop } = createMediaDevices();

    expect(getUserMedia).not.toHaveBeenCalled();

    await requestMediaPermission({
      mediaDevices: { getUserMedia },
      constraints: { video: true, audio: false },
    });

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
    expect(stop).toHaveBeenCalledOnce();
  });

  it('requests microphone access independently from camera access', async () => {
    const { getUserMedia, stop } = createMediaDevices();

    await requestMediaPermission({
      mediaDevices: { getUserMedia },
      constraints: { video: false, audio: true },
    });

    expect(getUserMedia).toHaveBeenCalledWith({ video: false, audio: true });
    expect(stop).toHaveBeenCalledOnce();
  });
});
