import type { ReviewScore } from "@/types/score";

type ActiveReview = {
  element: HTMLTextAreaElement | HTMLInputElement;
  latestScore?: ReviewScore;
};

const SCORE_DEBOUNCE_MS = 800;
const STATUS_ID = "r2e-status-message";
// Update these URLs to your deployed services
const REWARD_PAGE_URL = "http://localhost:3000"; // Reward page URL
const BACKEND_URL = "http://localhost:8787"; // Backend API URL

function getStatusElement(): HTMLDivElement | undefined {
  return document.querySelector<HTMLDivElement>(`#${STATUS_ID}`) ?? undefined;
}

function createStatusElement(): HTMLDivElement {
  const status = document.createElement("div");
  status.id = STATUS_ID;
  status.style.marginTop = "8px";
  status.style.fontSize = "14px";
  status.style.fontWeight = "500";
  status.style.color = "#6b7280";
  return status;
}

function setStatus(message: string, tone: "info" | "success" | "error"): void {
  const status = getStatusElement();
  if (!status) {
    return;
  }
  status.textContent = message;
  switch (tone) {
    case "success":
      status.style.color = "#047857";
      break;
    case "error":
      status.style.color = "#b91c1c";
      break;
    default:
      status.style.color = "#6b7280";
  }
}

function clearStatus(): void {
  const status = getStatusElement();
  if (status) {
    status.textContent = "";
    status.style.color = "#6b7280";
  }
}

function extractErrorCode(rawError: unknown): string | undefined {
  if (typeof rawError === "string") {
    return rawError;
  }
  if (typeof rawError === "object" && rawError !== null && "error" in rawError) {
    const value = (rawError as Record<string, unknown>).error;
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

function getIneligibleMessage(rawError: unknown): string {
  const code = extractErrorCode(rawError);
  switch (code) {
    case "low_quality":
      return "Review needs more detail before it can earn.";
    case "high_spam":
      return "Review looks spammy; edit it to qualify.";
    default:
      return "Review not eligible yet. Keep editing!";
  }
}

const activeReview: ActiveReview = {
  element: findReviewInput()
};

let debounceHandle: number | undefined;

if (activeReview.element) {
  attachHandlers(activeReview.element);
} else {
  observeForReviewInputs();
}

function findReviewInput(): HTMLTextAreaElement | HTMLInputElement | undefined {
  const selectors = [
    "textarea[id*='review'][maxlength]",
    "textarea[aria-label*='review']",
    "textarea[name*='review']",
    "textarea[data-review-text='true']"
  ];
  for (const selector of selectors) {
    const element = document.querySelector<HTMLTextAreaElement>(selector);
    if (element) {
      return element;
    }
  }

  const inputSelector = "input[type='text'][name*='review']";
  return document.querySelector<HTMLInputElement>(inputSelector) ?? undefined;
}

function observeForReviewInputs(): void {
  const observer = new MutationObserver(() => {
    const element = findReviewInput();
    if (element) {
      activeReview.element = element;
      attachHandlers(element);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { subtree: true, childList: true });
}

function attachHandlers(element: HTMLTextAreaElement | HTMLInputElement): void {
  element.addEventListener("input", () => {
    clearStatus();
    if (debounceHandle) {
      window.clearTimeout(debounceHandle);
    }
    debounceHandle = window.setTimeout(scoreReview, SCORE_DEBOUNCE_MS);
  });

  injectEarnButton(element);
}

function injectEarnButton(element: HTMLTextAreaElement | HTMLInputElement): void {
  if (document.querySelector<HTMLButtonElement>("#r2e-earn-button")) {
    return;
  }
  const button = document.createElement("button");
  button.id = "r2e-earn-button";
  button.textContent = "Earn PYUSD";
  button.disabled = true;
  button.style.marginTop = "12px";
  button.style.padding = "8px 12px";
  button.style.backgroundColor = "#1f2937";
  button.style.color = "#ffffff";
  button.style.border = "none";
  button.style.borderRadius = "6px";
  button.style.cursor = "not-allowed";

  const status = createStatusElement();

  button.addEventListener("click", async () => {
    console.log('clicked')
    if (!activeReview.latestScore) {
      return;
    }

    // Generate secure token
    const token = crypto.randomUUID();

    try {
      // Send token and data to backend
      setStatus('Preparing reward claim...', 'info');
      const response = await fetch(`${BACKEND_URL}/token/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          review: element.value,
          score: activeReview.latestScore
        })
      });

      // if (!response.ok) {
      //   console.error('Failed to store token');
      //   setStatus('Failed to prepare reward claim. Please try again.', 'error');
      //   return;
      // }

      console.log('Token stored successfully:', token);

      // Open public reward claim page with secure token
      const rewardUrl = `${REWARD_PAGE_URL}/?token=${token}`;
      window.open(rewardUrl, "_blank");

      setStatus('Reward page opened. Complete the claim in the new tab.', 'success');
    } catch (error) {
      console.error('Error storing token:', error);
      setStatus('Failed to prepare reward claim. Please try again.', 'error');
    }
  });

  element.after(button, status);
}

async function scoreReview(): Promise<void> {
  const target = activeReview.element;
  if (!target || !target.value) {
    return;
  }
  const result = await chrome.runtime.sendMessage({
    type: "SCORE_REVIEW",
    payload: {
      text: target.value
    }
  });

  const button = document.querySelector<HTMLButtonElement>("#r2e-earn-button");
  if (!button) {
    return;
  }

  if (result?.ok) {
    activeReview.latestScore = result.score as ReviewScore;
    const eligible =
      activeReview.latestScore.quality >= 70 && activeReview.latestScore.spam <= 30;
    // const eligible = true;
    button.disabled = !eligible;
    button.style.cursor = eligible ? "pointer" : "not-allowed";
    button.textContent = eligible ? "Earn PYUSD" : "Keep editing…";
    if (eligible) {
      setStatus("Looks good—click Earn PYUSD when ready.", "info");
    } else {
      setStatus("Review not eligible yet. Keep editing!", "error");
    }
  } else {
    button.disabled = true;
    button.textContent = "Score unavailable";
    setStatus("Scoring unavailable right now. Try again shortly.", "error");
  }
}
