(function () {
  "use strict";

  var captchaResult = null;
  var form = document.getElementById("demo-form");
  var demoField = document.getElementById("demo-field");
  var submitButton = document.getElementById("submit-button");
  var resultBox = document.getElementById("result");
  var tokenPanel = document.getElementById("token-panel");
  var verificationIdValue = document.getElementById("verification-id-value");
  var responseTokenValue = document.getElementById("response-token-value");

  function clearProof() {
    captchaResult = null;
    tokenPanel.hidden = true;
    verificationIdValue.textContent = "";
    responseTokenValue.textContent = "";
  }

  function showResult(success, title, message) {
    resultBox.className = success ? "success" : "error";
    resultBox.replaceChildren();
    var titleElement = document.createElement("strong");
    titleElement.className = "result-title";
    titleElement.textContent = (success ? "✓ " : "✕ ") + title;
    resultBox.append(titleElement, document.createTextNode(message));
  }

  window.onNexaComplete = function (result) {
    if (!result || result.success !== true) {
      clearProof();
      return;
    }
    captchaResult = {
      verificationId: result.verificationId,
      responseToken: result.responseToken
    };
    verificationIdValue.textContent = captchaResult.verificationId;
    responseTokenValue.textContent = captchaResult.responseToken;
    tokenPanel.hidden = false;
    resultBox.className = "";
    resultBox.replaceChildren();
  };

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!captchaResult) {
      showResult(false, "NexaCAPTCHA not completed", "Complete Gravity before submitting the form.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Verifying…";
    try {
      var response = await fetch("/gravitydemo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: demoField.value,
          verificationId: captchaResult.verificationId,
          responseToken: captchaResult.responseToken
        }),
        cache: "no-store"
      });
      var result = await response.json();
      if (!response.ok || result.success !== true) {
        showResult(false, "Verification failed", result.message || result.errorCode || "The proof was rejected.");
        clearProof();
        return;
      }
      showResult(
        true,
        "Verified successfully",
        "The server accepted the one-time proof.\nField: " + (result.field || "(empty)") +
          "\nVerified at: " + (result.verifiedAt || "unknown")
      );
      captchaResult = null;
    } catch (_) {
      showResult(false, "Server error", "The demo server could not verify this submission.");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Submit to server';
    }
  });
})();
