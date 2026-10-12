/**
 * MANVIA Message Composer Component
 * ChatGPT-inspired, healthcare-grade message composer with:
 * - Bottom-anchored flex layout
 * - Multiline auto-expanding text field
 * - Enter to send, Shift+Enter for new line
 * - Character count limit (consistent with backend MAX_MESSAGE_CONTENT_LENGTH)
 * - Paperclip button for document attachments (.txt, .md, .csv, .json, .pdf)
 * - Backend attachment processing and text extraction
 * - Working microphone button using MediaRecorder & Groq Whisper STT
 * - Accessible recording state with timer, pulse indicator, cancel & stop
 * - Safe transcript insertion for user review before sending
 */

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/Button";
import { aiCompanionService } from "../api/aiCompanionService";
import { MAX_MESSAGE_CONTENT_LENGTH, type AttachedFile } from "../types";

export interface MessageComposerHandle {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  insertText: (text: string) => void;
  setContent: (text: string) => void;
}

export interface MessageComposerProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  initialValue?: string;
  onRecordingChange?: (isRecording: boolean) => void;
  onTranscribingChange?: (isTranscribing: boolean) => void;
  onRecordingSecondsChange?: (seconds: number) => void;
}

export const MessageComposer = forwardRef<
  MessageComposerHandle,
  MessageComposerProps
>(({
  onSendMessage,
  isLoading = false,
  disabled = false,
  initialValue = "",
  onRecordingChange,
  onTranscribingChange,
  onRecordingSecondsChange,
}, ref) => {
  const [content, setContent] = useState(initialValue);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    if (isPlusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPlusMenuOpen]);

  // Notify parent of recording and transcribing state changes
  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  useEffect(() => {
    onTranscribingChange?.(isTranscribing);
  }, [isTranscribing, onTranscribingChange]);

  useEffect(() => {
    onRecordingSecondsChange?.(recordingSeconds);
  }, [recordingSeconds, onRecordingSecondsChange]);

  useEffect(() => {
    if (initialValue && initialValue !== content) {
      setContent(initialValue);
    }
  }, [initialValue, content]);

  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    cancelRecording,
    insertText: (text: string) => {
      setContent((prev) => (prev ? `${prev} ${text}` : text));
    },
    setContent: (text: string) => setContent(text),
  }));

  // Cleanup media resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const trimmedContent = content.trim();
  const isOverLimit = content.length > MAX_MESSAGE_CONTENT_LENGTH;
  const isProcessingAttachments = attachments.some((a) => a.isProcessing);
  const canSend =
    (trimmedContent.length > 0 || attachments.some((a) => a.extractedText)) &&
    !isOverLimit &&
    !isLoading &&
    !disabled &&
    !isProcessingAttachments &&
    !isRecording &&
    !isTranscribing;

  const handleSubmit = (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!canSend) return;

    // Combine user prompt with extracted attachment context
    let fullMessage = trimmedContent;
    const readyAttachments = attachments.filter((a) => a.extractedText);
    if (readyAttachments.length > 0) {
      const docContexts = readyAttachments
        .map(
          (a) =>
            `\n\n--- [Attached Document: ${a.name}] ---\n${a.extractedText}\n--- [End of ${a.name}] ---`,
        )
        .join("");
      fullMessage = fullMessage ? `${fullMessage}${docContexts}` : docContexts.trim();
    }

    onSendMessage(fullMessage);
    setContent("");
    setAttachments([]);
    setAttachmentError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  // ==========================================
  // File Attachment Handling
  // ==========================================



  const processFile = async (file: File) => {
    setAttachmentError(null);

    // Extension check:
    const supportedExts = [".txt", ".md", ".csv", ".json", ".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!supportedExts.includes(ext)) {
      setAttachmentError("Unsupported file type. Please upload a .txt, .md, .csv, .json, or .pdf document.");
      return;
    }

    // Size check: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setAttachmentError(`File size exceeds the 5MB limit (${file.name}).`);
      return;
    }

    // Max 3 attachments
    if (attachments.length >= 3) {
      setAttachmentError("Maximum of 3 attachments allowed per message.");
      return;
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tempAttached: AttachedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      isProcessing: true,
    };

    setAttachments((prev) => [...prev, tempAttached]);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const clean = res.split(",")[1] || "";
          resolve(clean);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Submit to backend for secure parsing and text extraction
      const result = await aiCompanionService.processAttachment({
        fileName: file.name,
        mimeType: file.type || "text/plain",
        fileSizeBytes: file.size,
        contentBase64: base64,
      });

      setAttachments((prev) =>
        prev.map((a) =>
          a.id === fileId
            ? {
                ...a,
                isProcessing: false,
                extractedText: result.extractedText,
              }
            : a,
        ),
      );
    } catch (err: unknown) {
      let errMsg = "Failed to process document. Please ensure format is .txt, .md, .csv, .json, or .pdf.";
      if (err instanceof Error) {
        errMsg = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
        errMsg = String((err as { message: unknown }).message);
      }
      setAttachmentError(errMsg);
      setAttachments((prev) => prev.filter((a) => a.id !== fileId));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        processFile(file);
      }
    }

    // Reset input
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        processFile(file);
      }
    }
  };

  // ==========================================
  // Microphone / Speech-to-Text Handling
  // ==========================================

  const startRecording = async () => {
    setMicError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError("Microphone audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          // Limit recording duration to 60 seconds
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === "NotAllowedError" || errorObj?.name === "PermissionDeniedError") {
        setMicError("Microphone permission was denied. Please allow microphone access in your browser settings.");
      } else {
        setMicError(`Unable to start microphone recording: ${errorObj?.message || "Unknown error"}`);
      }
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const stopRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      return;
    }

    recorder.onstop = async () => {
      // Clean up stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      const mimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioBlob.size === 0) {
        setMicError("No audio was recorded. Please try again.");
        return;
      }

      // Convert audio blob to base64
      setIsTranscribing(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const clean = res.split(",")[1] || "";
            resolve(clean);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(audioBlob);
        });

        // Send to authenticated backend endpoint for Groq Whisper transcription
        const result = await aiCompanionService.transcribeAudio({
          audioBase64: base64,
          mimeType,
        });

        if (result.text && result.text.trim()) {
          setContent((prev) => {
            const spacer = prev && !prev.endsWith(" ") ? " " : "";
            return `${prev}${spacer}${result.text.trim()}`;
          });

          // Focus textarea
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error
            ? err.message
            : "Speech transcription failed. Please try speaking again.";
        setMicError(errMsg);
      } finally {
        setIsTranscribing(false);
      }
    };

    recorder.stop();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="manvia-composer-container"
      data-testid="message-composer"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        data-testid="file-upload-input"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        multiple
        accept=".txt,.md,.csv,.json,.pdf,image/png,image/jpeg,image/webp"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        type="file"
        ref={photoInputRef}
        data-testid="photo-upload-input"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        accept="image/png,image/jpeg,image/webp"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        type="file"
        ref={cameraInputRef}
        data-testid="camera-upload-input"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        accept="image/*"
        capture="environment"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Error Banners */}
      {(attachmentError || micError) && (
        <div
          role="alert"
          style={{
            marginBottom: "var(--space-2)",
            padding: "8px 12px",
            backgroundColor: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "8px",
            color: "#9f1239",
            fontSize: "var(--font-size-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {attachmentError || micError}</span>
          <button
            type="button"
            onClick={() => {
              setAttachmentError(null);
              setMicError(null);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9f1239",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Attachment Chips */}
      {attachments.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "6px",
            padding: "0 4px",
          }}
        >
          {attachments.map((file) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                backgroundColor: "#e2e8f0",
                borderRadius: "16px",
                fontSize: "0.75rem",
                color: "#1e293b",
                maxWidth: "240px",
              }}
            >
              <span>📄</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              {file.isProcessing ? (
                <span style={{ fontSize: "0.7rem", color: "var(--color-primary)" }}>
                  ⏳
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(file.id)}
                  title="Remove file"
                  aria-label={`Remove ${file.name}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "0.8rem",
                    color: "#64748b",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recording Bar (active during microphone capture) */}
      {isRecording && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "var(--radius-xl)",
            padding: "10px 16px",
            marginBottom: "8px",
          }}
          aria-live="polite"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.3)",
              }}
            />
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "#991b1b" }}>
              Recording ({formatSeconds(recordingSeconds)})
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelRecording}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={stopRecording}
              style={{ fontSize: "0.75rem", padding: "4px 12px", backgroundColor: "#dc2626" }}
            >
              ✓ Done
            </Button>
          </div>
        </div>
      )}

      {/* Transcribing Indicator */}
      {isTranscribing && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "var(--radius-md)",
            color: "#166534",
            fontSize: "var(--font-size-xs)",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🎙️</span>
          <span>Transcribing voice with Groq Whisper...</span>
        </div>
      )}

      {/* Main Composer Box */}
      <form
        onSubmit={handleSubmit}
        className="manvia-message-composer"
        data-testid="message-composer-form"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          backgroundColor: "#ffffff",
          border: "1px solid var(--color-border-subtle, #e2e8f0)",
          borderRadius: "28px",
          padding: "12px 16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Plus Attachment Button & Dropdown Menu */}
          <div style={{ position: "relative" }} ref={plusMenuRef}>
            <button
              type="button"
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              disabled={disabled || isLoading || isRecording}
              aria-label="Add attachment"
              title="Attach document (.txt, .md, .csv, .json, .pdf, photo)"
              data-testid="add-attachment-btn"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                backgroundColor: isPlusMenuOpen ? "#f1f5f9" : "#ffffff",
                cursor: disabled || isLoading ? "not-allowed" : "pointer",
                padding: 0,
                fontSize: "1.3rem",
                lineHeight: "1",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              +
            </button>

            {isPlusMenuOpen && (
              <div
                data-testid="attachment-plus-menu"
                style={{
                  position: "absolute",
                  bottom: "44px",
                  left: 0,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  minWidth: "185px",
                  zIndex: 50,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#1e293b",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📁</span>
                  <span>Upload from files</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    photoInputRef.current?.click();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#1e293b",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>🖼️</span>
                  <span>Choose a photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#1e293b",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📷</span>
                  <span>Take a photo</span>
                </button>
              </div>
            )}
          </div>

          {/* Multiline Text Area */}
          <div style={{ flex: 1, position: "relative" }}>
            <label htmlFor="ai-message-input" className="visually-hidden">
              Message MANVIA AI
            </label>
            <textarea
              ref={textareaRef}
              id="ai-message-input"
              rows={1}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isLoading || isRecording}
              placeholder="Ask MANVIA AI a wellness question or about your wellness..."
              style={{
                width: "100%",
                resize: "none",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: "var(--color-text-primary, #0f172a)",
                fontSize: "14px",
                lineHeight: 1.5,
                fontFamily: "inherit",
                padding: "6px 0",
                minHeight: "24px",
                maxHeight: "160px",
                overflowY: "auto",
                boxSizing: "border-box",
              }}
              data-testid="message-composer-input"
            />
          </div>

          {/* Microphone Button */}
          {!isRecording && (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || isLoading || isTranscribing}
              aria-label="Speak your message"
              title="Voice recording (Speech-to-Text)"
              style={{
                background: "none",
                border: "none",
                cursor: disabled || isLoading || isTranscribing ? "not-allowed" : "pointer",
                padding: "6px 8px",
                borderRadius: "50%",
                fontSize: "1.1rem",
                color: "var(--color-text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              🎙️
            </button>
          )}

          {/* Send Button */}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!canSend}
            isLoading={isLoading}
            data-testid="send-message-btn"
            aria-label="Send message"
            style={{
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              minWidth: "36px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {!isLoading && (
              <span style={{ fontSize: "0.95rem" }} aria-hidden="true">
                ➤
              </span>
            )}
          </Button>
        </div>

        {/* Bottom Helper & Counter */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.68rem",
            color: isOverLimit ? "var(--color-danger)" : "var(--color-text-muted)",
            padding: "2px 4px 0",
          }}
        >
          <span>Shift+Enter for newline • Drag & drop documents</span>
          <span data-testid="character-counter">
            {content.length} / {MAX_MESSAGE_CONTENT_LENGTH}
          </span>
        </div>
      </form>
    </div>
  );
});

MessageComposer.displayName = "MessageComposer";
