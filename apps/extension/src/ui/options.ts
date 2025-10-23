const input = document.querySelector<HTMLInputElement>("#backend-url")!;
const statusLabel = document.querySelector<HTMLParagraphElement>("#status")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save")!;

const { backendUrl } = await chrome.storage.sync.get("backendUrl");
if (backendUrl) {
  input.value = backendUrl;
}

saveButton.addEventListener("click", async () => {
  const url = input.value.trim();
  await chrome.storage.sync.set({ backendUrl: url || "http://localhost:8787" });
  statusLabel.textContent = "Saved!";
});
