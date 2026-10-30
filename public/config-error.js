const errorElement = document.querySelector("#config-error");
const fileElement = document.querySelector("#config-file");
const retryButton = document.querySelector("#retry-button");

async function validate() {
  retryButton.disabled = true;
  errorElement.textContent = "Checking configuration …";
  try {
    const response = await fetch("/api/config/validation", { cache: "no-store" });
    const result = await response.json();
    if (result.valid) {
      window.location.replace("/");
      return;
    }
    errorElement.textContent = result.error || "Unknown inventory error";
    fileElement.textContent = result.file || "";
  } catch (error) {
    errorElement.textContent = `Validation endpoint unavailable: ${error.message}`;
  } finally {
    retryButton.disabled = false;
  }
}

retryButton.addEventListener("click", validate);
await validate();
