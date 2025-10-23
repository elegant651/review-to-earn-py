import "@/content/content";

document.addEventListener("DOMContentLoaded", () => {
  const reviewTextarea = document.querySelector<HTMLTextAreaElement>("#sample-review-textarea");
  if (reviewTextarea) {
    reviewTextarea.focus();
  }
});
