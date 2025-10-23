import type { ReviewScore } from "@/types/score";

const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const scoreContainer = document.querySelector<HTMLDivElement>("#score")!;
const txResultEl = document.querySelector<HTMLDivElement>("#tx-result")!;
const demoButton = document.querySelector<HTMLButtonElement>("#demo-link");

if (demoButton) {
  demoButton.addEventListener("click", () => {
    const demoUrl = chrome.runtime.getURL("src/ui/sample-shop.html");
    void chrome.tabs.create({ url: demoUrl });
  });
}

const response = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
if (response?.ok) {
  const latestScore = response.latestScore as ReviewScore | undefined;
  if (latestScore) {
    renderScore(latestScore);
    statusEl.textContent = "Latest review score:";
  } else {
    statusEl.textContent = "No scoring events yet.";
  }

  const txHash = response.latestReward as string | undefined;
  if (txHash) {
    txResultEl.textContent = `Last reward: ${txHash}`;
  }
} else {
  statusEl.textContent = "No scoring events yet.";
}

function renderScore(score: ReviewScore): void {
  scoreContainer.innerHTML = "";
  const entries: Array<[string, number | string]> = [
    ["Quality", score.quality],
    ["Spam", score.spam],
    ["Sentiment", score.sentiment],
    ["Explanation", score.explanation]
  ];
  for (const [label, value] of entries) {
    const row = document.createElement("div");
    row.className = "score-item";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.textContent = String(value);
    row.append(labelEl, valueEl);
    scoreContainer.append(row);
  }
}
