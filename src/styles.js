/**
 * CSS Stylesheet for Google Calendar Card.
 * Adheres to Home Assistant design system and theme CSS variables.
 */

export const cardStyles = `
  :host {
    display: block;
    --gc-accent: var(--primary-color, #03a9f4);
    --gc-bg: var(--card-background-color, #ffffff);
    --gc-text: var(--primary-text-color, #212121);
    --gc-muted: var(--secondary-text-color, #727272);
    --gc-border: var(--divider-color, rgba(0, 0, 0, 0.12));
    --gc-radius: var(--ha-card-border-radius, 12px);
    font-family: var(--paper-font-body1_-_font-family, Roboto, "Segoe UI", sans-serif);
    color: var(--gc-text);
  }

  ha-card {
    background-color: var(--gc-bg);
    border-radius: var(--gc-radius);
    box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Header and Navigation */
  .gc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--gc-border);
    flex-wrap: wrap;
    gap: 8px;
  }

  .gc-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gc-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0;
  }

  .gc-nav-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .gc-btn {
    background: transparent;
    border: 1px solid var(--gc-border);
    color: var(--gc-text);
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, color 0.2s;
  }

  .gc-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .gc-btn-icon {
    padding: 5px 8px;
  }

  .gc-view-tabs {
    display: flex;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }

  .gc-tab-btn {
    border: none;
    background: transparent;
    color: var(--gc-muted);
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .gc-tab-btn.gc-tab-active {
    background-color: var(--gc-bg);
    color: var(--gc-accent);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  /* Content area */
  .gc-content {
    padding: 12px 16px;
    min-height: 250px;
    max-height: 650px;
    overflow-y: auto;
  }

  /* Empty state */
  .gc-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    color: var(--gc-muted);
    text-align: center;
    gap: 12px;
  }

  .gc-empty-state ha-icon {
    --mdc-icon-size: 48px;
    opacity: 0.6;
  }

  /* Loading and Error */
  .gc-loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .gc-error-box {
    background-color: rgba(211, 47, 47, 0.1);
    color: #d32f2f;
    border-left: 4px solid #d32f2f;
    padding: 12px;
    border-radius: 4px;
    margin: 12px;
    font-size: 0.9rem;
  }

  /* Agenda View Styles */
  .gc-agenda-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gc-agenda-day-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gc-day-header {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--gc-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .gc-day-events {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gc-event-item {
    background-color: rgba(0, 0, 0, 0.02);
    border: 1px solid var(--gc-border);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }

  .gc-event-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  .gc-event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .gc-event-time-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gc-color-pill {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .gc-event-time {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--gc-muted);
  }

  .gc-event-cal-name {
    font-size: 0.75rem;
    color: var(--gc-muted);
    opacity: 0.8;
  }

  .gc-relative-tag {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    background-color: rgba(0,0,0,0.06);
    color: var(--gc-text);
  }

  .gc-tag-now {
    background-color: #e53935;
    color: #ffffff;
    animation: gc-pulse 2s infinite;
  }

  @keyframes gc-pulse {
    0% { opacity: 1; }
    50% { opacity: 0.75; }
    100% { opacity: 1; }
  }

  .gc-event-title {
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.3;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-event-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--gc-muted);
    margin-top: 4px;
  }

  .gc-event-location ha-icon {
    --mdc-icon-size: 14px;
  }

  .gc-event-desc {
    font-size: 0.8rem;
    color: var(--gc-muted);
    margin-top: 6px;
    line-height: 1.4;
    white-space: pre-wrap;
    max-height: 4.2em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Month Grid View Styles */
  .gc-month-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-header-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gc-muted);
    padding: 4px 0;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-header-cell {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gc-month-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-cell {
    min-height: 70px;
    border: 1px solid var(--gc-border);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    background-color: var(--gc-bg);
    cursor: pointer;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gc-month-cell:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .gc-cell-other-month {
    opacity: 0.4;
  }

  .gc-cell-today {
    border: 2px solid var(--gc-accent);
  }

  .gc-cell-today .gc-day-number {
    background-color: var(--gc-accent);
    color: #ffffff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .gc-cell-top {
    font-size: 0.75rem;
    font-weight: 500;
    margin-bottom: 2px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .gc-cell-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow: hidden;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-event-chip {
    font-size: 0.68rem;
    font-weight: 500;
    padding: 2px 4px;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.25;
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-chip-time {
    font-weight: 600;
    white-space: nowrap;
    margin-right: 2px;
  }

  .gc-chip-summary {
    min-width: 0;
  }

  .gc-month-overflow-badge {
    font-size: 0.65rem;
    color: var(--gc-muted);
    font-weight: 600;
    margin-top: 1px;
    padding-left: 2px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Week View Styles */
  .gc-week-container {
    overflow-x: auto;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-week-columns {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
    min-width: 500px;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-week-col {
    border: 1px solid var(--gc-border);
    border-radius: 8px;
    padding: 6px;
    min-height: 260px;
    background-color: var(--gc-bg);
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gc-week-today {
    border-color: var(--gc-accent);
    background-color: rgba(3, 169, 244, 0.02);
  }

  .gc-week-col-header {
    text-align: center;
    border-bottom: 1px solid var(--gc-border);
    padding-bottom: 6px;
    margin-bottom: 8px;
    overflow: hidden;
  }

  .gc-week-day-name {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gc-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gc-week-day-num {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .gc-num-today {
    color: var(--gc-accent);
  }

  .gc-week-col-events {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }

  .gc-week-event-card {
    border-radius: 6px;
    padding: 4px 6px;
    font-size: 0.72rem;
    cursor: pointer;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gc-week-event-time {
    font-weight: 600;
    opacity: 0.85;
    margin-bottom: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gc-week-event-summary {
    font-weight: 500;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  /* Day View Styles */
  .gc-day-view-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gc-day-view-header {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gc-text);
    border-bottom: 1px solid var(--gc-border);
    padding-bottom: 8px;
  }

  .gc-day-allday-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    min-width: 0;
    overflow: hidden;
  }

  .gc-day-allday-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gc-muted);
    min-width: 50px;
    flex-shrink: 0;
  }

  .gc-day-allday-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .gc-day-allday-chip {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 12px;
    cursor: pointer;
    max-width: 100%;
    box-sizing: border-box;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-timeline-container {
    position: relative;
    height: 1200px; /* 24 hours * 50px */
    border-top: 1px solid var(--gc-border);
  }

  .gc-timeline-hour-row {
    position: relative;
    height: 50px;
    display: flex;
    align-items: flex-start;
  }

  .gc-timeline-time-label {
    width: 60px;
    font-size: 0.75rem;
    color: var(--gc-muted);
    transform: translateY(-8px);
    text-align: right;
    padding-right: 8px;
    flex-shrink: 0;
  }

  .gc-timeline-line {
    flex: 1;
    border-top: 1px dashed var(--gc-border);
  }

  .gc-now-line {
    position: absolute;
    left: 60px;
    right: 0;
    height: 2px;
    background-color: #e53935;
    z-index: 5;
  }

  .gc-now-bullet {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #e53935;
    position: absolute;
    left: -4px;
    top: -3px;
  }

  .gc-day-timed-event {
    position: absolute;
    left: 70px;
    right: 12px;
    border-radius: 6px;
    padding: 4px 8px;
    z-index: 2;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    box-sizing: border-box;
  }

  .gc-timed-event-summary {
    font-size: 0.85rem;
    font-weight: 600;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-timed-event-time {
    font-size: 0.75rem;
    opacity: 0.9;
  }

  /* Modal Details */
  .gc-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }

  .gc-modal-box {
    background-color: var(--gc-bg);
    color: var(--gc-text);
    border-radius: 12px;
    width: 90%;
    max-width: 440px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    overflow: hidden;
    animation: gc-modal-appear 0.15s ease-out;
  }

  @keyframes gc-modal-appear {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .gc-modal-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .gc-modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .gc-modal-close-btn {
    border: none;
    background: transparent;
    color: var(--gc-muted);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px;
    display: flex;
    align-items: center;
  }

  .gc-modal-body {
    padding: 0 20px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gc-modal-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.9rem;
  }

  .gc-modal-row ha-icon {
    --mdc-icon-size: 18px;
    color: var(--gc-muted);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .gc-modal-link {
    color: var(--gc-accent);
    text-decoration: none;
    font-weight: 500;
  }

  .gc-modal-link:hover {
    text-decoration: underline;
  }
`;
