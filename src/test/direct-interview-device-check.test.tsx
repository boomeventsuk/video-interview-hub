import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventAssistantInterview from "@/pages/EventAssistantInterview";
import TSDPSessionLeaderInterview from "@/pages/TSDPSessionLeaderInterview";

const fakeStream = {
  getTracks: () => [{ stop: vi.fn() }],
} as unknown as MediaStream;

describe("direct interview device check", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: class MockMediaRecorder {
        static isTypeSupported = vi.fn().mockReturnValue(true);
      },
    });
  });

  it.each([
    ["TSDP", <TSDPSessionLeaderInterview />],
    ["Boombastic", <EventAssistantInterview />],
  ])("%s enables Begin questions after camera and microphone access succeeds", async (_label, page) => {
    render(page);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Candidate" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Check camera and microphone" }));

    const beginButton = await screen.findByRole("button", { name: "Begin questions" });
    await waitFor(() => expect(beginButton).toBeEnabled());
  });
});
