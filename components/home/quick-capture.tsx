import styles from "./quick-capture.module.css";

export function QuickCapture() {
  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        type="text"
        placeholder="Ask anything…"
        aria-label="Quick capture (not connected yet)"
      />

      <div className={styles.modes} aria-label="Mode (visual only)">
        <div>
          <input
            className={styles.modeInput}
            type="radio"
            name="quick_capture_mode"
            id="quick_capture_mode_journal"
            defaultChecked
          />
          <label
            className={styles.modeLabel}
            htmlFor="quick_capture_mode_journal"
            title="Journal"
            aria-label="Journal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
          </label>
        </div>

        <div>
          <input
            className={styles.modeInput}
            type="radio"
            name="quick_capture_mode"
            id="quick_capture_mode_prediction"
          />
          <label
            className={styles.modeLabel}
            htmlFor="quick_capture_mode_prediction"
            title="Prediction"
            aria-label="Prediction"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M7 14l3-3 4 4 6-7" />
            </svg>
          </label>
        </div>
      </div>

      <button
        type="button"
        className={styles.submit}
        aria-label="Send (visual only)"
        title="Send (visual only)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 7-7 7 7" />
          <path d="M12 19V5" />
        </svg>
      </button>
    </div>
  );
}

