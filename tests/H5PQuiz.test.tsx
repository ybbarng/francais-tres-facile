/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import H5PQuiz from "@/components/H5PQuiz";

describe("H5PQuiz", () => {
  const defaultProps = {
    h5pUrl: "https://fle-rfi.h5p.com/content/12345/embed",
    exerciseId: "test-exercise-1",
  };

  beforeEach(() => {
    // Clean up any existing H5P resizer script
    const existingScript = document.getElementById("h5p-resizer-script");
    if (existingScript) {
      existingScript.remove();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render iframe with correct src", () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toBe(defaultProps.h5pUrl);
    });

    it("should show manual score input by default", () => {
      render(<H5PQuiz {...defaultProps} />);

      expect(
        screen.getByText("Entrez votre score après avoir terminé le quiz (ex: 15/23)")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("15/23")).toBeInTheDocument();
    });
  });

  describe("manual score input", () => {
    it("should call onScoreReceived when valid score is submitted", async () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "18/23" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      expect(onScoreReceived).toHaveBeenCalledWith({ score: 18, maxScore: 23 });
    });

    it("should handle score format with spaces", async () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "15 / 20" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      expect(onScoreReceived).toHaveBeenCalledWith({ score: 15, maxScore: 20 });
    });

    it("should not call onScoreReceived for invalid score format", async () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "invalid" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      expect(onScoreReceived).not.toHaveBeenCalled();
    });

    it("should show score registered message after manual submission", async () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "18/23" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      await waitFor(() => {
        expect(screen.getByText(/Score enregistré/)).toBeInTheDocument();
      });
    });
  });

  describe("H5P resize messages", () => {
    it("should adjust height when receiving resize message", async () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");

      // Simulate H5P resize message
      const resizeEvent = new MessageEvent("message", {
        origin: "https://fle-rfi.h5p.com",
        data: { context: "h5p", action: "resize", scrollHeight: 1200 },
      });
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        const newHeight = iframe?.style.height;
        expect(newHeight).toBe("1250px"); // 1200 + 50 padding
      });
    });

    it("should not adjust height below minimum", async () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");

      // Simulate H5P resize message with small height
      const resizeEvent = new MessageEvent("message", {
        origin: "https://fle-rfi.h5p.com",
        data: { context: "h5p", action: "resize", scrollHeight: 300 },
      });
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        // Should remain at default height (800px) since 300 < MIN_HEIGHT (600)
        expect(iframe?.style.height).toBe("800px");
      });
    });

    it("should ignore messages from non-h5p origins", async () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");

      // Simulate message from different origin
      const resizeEvent = new MessageEvent("message", {
        origin: "https://example.com",
        data: { context: "h5p", action: "resize", scrollHeight: 1500 },
      });
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        // Height should remain unchanged
        expect(iframe?.style.height).toBe("800px");
      });
    });
  });

  describe("xAPI score detection", () => {
    it("should detect and report xAPI score", async () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      // Simulate xAPI completed event
      const xapiEvent = new MessageEvent("message", {
        origin: "https://fle-rfi.h5p.com",
        data: {
          statement: {
            result: {
              score: { raw: 20, max: 25 },
            },
          },
        },
      });
      window.dispatchEvent(xapiEvent);

      await waitFor(() => {
        expect(onScoreReceived).toHaveBeenCalledWith({ score: 20, maxScore: 25 });
      });
    });

    it("should show score registered message after xAPI detection", async () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      // Simulate xAPI completed event
      const xapiEvent = new MessageEvent("message", {
        origin: "https://fle-rfi.h5p.com",
        data: {
          statement: {
            result: {
              score: { raw: 20, max: 25 },
            },
          },
        },
      });
      window.dispatchEvent(xapiEvent);

      await waitFor(() => {
        expect(screen.getByText(/Score enregistré/)).toBeInTheDocument();
      });
    });
  });
});
