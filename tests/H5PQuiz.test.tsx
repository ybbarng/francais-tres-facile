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

    it("should show score input by default", () => {
      render(<H5PQuiz {...defaultProps} />);

      expect(
        screen.getByText("Entrez votre score après avoir terminé le quiz (ex: 15/23)")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("15/23")).toBeInTheDocument();
    });
  });

  describe("score input", () => {
    it("should call onScoreReceived when valid score is submitted", () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "18/23" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      expect(onScoreReceived).toHaveBeenCalledWith({ score: 18, maxScore: 23 });
    });

    it("should handle score format with spaces", () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "15 / 20" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      expect(onScoreReceived).toHaveBeenCalledWith({ score: 15, maxScore: 20 });
    });

    it("should not call onScoreReceived for invalid score format", () => {
      const onScoreReceived = vi.fn();
      render(<H5PQuiz {...defaultProps} onScoreReceived={onScoreReceived} />);

      const input = screen.getByPlaceholderText("15/23");
      fireEvent.change(input, { target: { value: "invalid" } });
      fireEvent.click(screen.getByText("Enregistrer"));

      expect(onScoreReceived).not.toHaveBeenCalled();
    });

    it("should show confirmation message after submission", async () => {
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

  describe("H5P resize", () => {
    it("should adjust height when receiving resize message", async () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");

      const resizeEvent = new MessageEvent("message", {
        origin: "https://fle-rfi.h5p.com",
        data: { context: "h5p", action: "resize", scrollHeight: 1200 },
      });
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        expect(iframe?.style.height).toBe("1250px");
      });
    });

    it("should not adjust height below minimum", async () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");

      const resizeEvent = new MessageEvent("message", {
        origin: "https://fle-rfi.h5p.com",
        data: { context: "h5p", action: "resize", scrollHeight: 300 },
      });
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        expect(iframe?.style.height).toBe("800px");
      });
    });

    it("should ignore messages from non-h5p origins", async () => {
      render(<H5PQuiz {...defaultProps} />);

      const iframe = document.querySelector("iframe");

      const resizeEvent = new MessageEvent("message", {
        origin: "https://example.com",
        data: { context: "h5p", action: "resize", scrollHeight: 1500 },
      });
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        expect(iframe?.style.height).toBe("800px");
      });
    });
  });
});
