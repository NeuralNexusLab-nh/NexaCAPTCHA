(function () {
  "use strict";

  var parameters = new URLSearchParams(window.location.search);
  var widgetId = parameters.get("widgetId") || "standalone";
  var requestedParentOrigin = parameters.get("parentOrigin");
  var parentOrigin = null;
  try {
    var parsedParent = new URL(requestedParentOrigin || window.location.origin);
    if (parsedParent.protocol === "https:" || parsedParent.protocol === "http:") {
      parentOrigin = parsedParent.origin;
    }
  } catch (_) {
    parentOrigin = null;
  }

  var form = document.getElementById("captcha-form");
  var input = document.getElementById("captcha-answer");
  var verifyButton = document.getElementById("verify-button");
  var newButton = document.getElementById("new-button");
  var image = document.getElementById("verification-image");
  var placeholder = document.getElementById("stage-placeholder");
  var stage = document.getElementById("verification-stage");
  var message = document.getElementById("status-message");
  var pill = document.getElementById("status-pill");
  var currentVerificationId = null;
  var expiryTimer = null;
  var busy = false;
  var completed = false;

  function send(type, payload) {
    if (!parentOrigin || window.parent === window) return;
    window.parent.postMessage(
      Object.assign({ namespace: "NexaCAPTCHA", widgetId: widgetId, type: type }, payload),
      parentOrigin
    );
  }

  function sendResult(result) {
    send("result", { result: result });
  }

  function setPill(label, icon, kind) {
    pill.className = "status-pill" + (kind ? " " + kind : "");
    pill.replaceChildren();
    var iconElement = document.createElement("i");
    iconElement.className = "fa-solid " + icon;
    iconElement.setAttribute("aria-hidden", "true");
    pill.append(iconElement, document.createTextNode(label));
  }

  function setMessage(text, kind) {
    message.textContent = text;
    message.className = kind || "";
  }

  function setBusy(value) {
    busy = value;
    stage.setAttribute("aria-busy", String(value));
    verifyButton.disabled = value || completed || !currentVerificationId;
    input.disabled = value || completed || !currentVerificationId;
    newButton.disabled = value;
  }

  function showPlaceholder(text) {
    image.classList.remove("is-visible");
    image.removeAttribute("src");
    placeholder.hidden = false;
    placeholder.replaceChildren();
    var icon = document.createElement("i");
    icon.className = "fa-solid fa-circle-notch fa-spin";
    icon.setAttribute("aria-hidden", "true");
    placeholder.append(icon, document.createTextNode(text));
  }

  function armExpiry(expiresAt) {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    var delay = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    expiryTimer = window.setTimeout(function () {
      currentVerificationId = null;
      completed = false;
      setBusy(false);
      setPill("Expired", "fa-clock", "is-error");
      setMessage("This verification expired. Request a new one.", "is-error");
      sendResult({ success: false, verificationId: null, responseToken: null });
    }, delay);
  }

  async function createVerification() {
    completed = false;
    currentVerificationId = null;
    input.value = "";
    showPlaceholder("Preparing verification…");
    setPill("Loading", "fa-circle-notch fa-spin", "");
    setMessage("Loading a new verification…", "");
    setBusy(true);
    sendResult({ success: false, verificationId: null, responseToken: null });

    try {
      var response = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store"
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create verification.");

      currentVerificationId = result.verificationId;
      image.onload = function () {
        placeholder.hidden = true;
        image.classList.add("is-visible");
        setPill("Ready", "fa-eye", "");
        setMessage("Follow the reveal, then enter all four characters.", "");
        setBusy(false);
      };
      image.onerror = function () {
        currentVerificationId = null;
        setPill("Error", "fa-circle-exclamation", "is-error");
        setMessage("The verification animation could not be loaded. Try again.", "is-error");
        setBusy(false);
      };
      image.src = result.animationUrl;
      armExpiry(result.expiresAt);
    } catch (_) {
      currentVerificationId = null;
      setPill("Offline", "fa-triangle-exclamation", "is-error");
      setMessage("Unable to reach NexaCAPTCHA. Try again.", "is-error");
      setBusy(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (busy || completed || !currentVerificationId) return;
    var answer = input.value.trim().toUpperCase();
    input.value = answer;
    if (answer.length !== 4) {
      setMessage("Enter all four characters before verifying.", "is-error");
      input.focus();
      return;
    }

    setBusy(true);
    setPill("Checking", "fa-circle-notch fa-spin", "");
    setMessage("Checking your answer…", "");
    try {
      var response = await fetch(
        "/api/verifications/" + encodeURIComponent(currentVerificationId) + "/answer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: answer }),
          cache: "no-store"
        }
      );
      var result = await response.json();
      if (!response.ok) throw new Error(result.errorCode || "verification-error");

      if (result.success) {
        completed = true;
        if (expiryTimer) window.clearTimeout(expiryTimer);
        setPill("Complete", "fa-circle-check", "is-complete");
        setMessage("Verification complete.", "is-success");
        setBusy(false);
        sendResult({
          success: true,
          verificationId: result.verificationId,
          responseToken: result.responseToken
        });
        return;
      }

      input.value = "";
      if (result.status === "verification_failed") {
        if (expiryTimer) window.clearTimeout(expiryTimer);
        currentVerificationId = null;
        setPill("Failed", "fa-circle-exclamation", "is-error");
        setMessage("Verification failed. Request a new verification to try again.", "is-error");
      } else {
        setPill("Try again", "fa-circle-exclamation", "is-error");
        setMessage(
          "That was not correct. " + result.attemptsRemaining + " attempts remaining.",
          "is-error"
        );
      }
      setBusy(false);
      if (currentVerificationId) input.focus();
    } catch (error) {
      if (String(error.message).includes("verification-expired")) {
        currentVerificationId = null;
        setPill("Expired", "fa-clock", "is-error");
        setMessage("This verification expired. Request a new one.", "is-error");
      } else {
        setPill("Error", "fa-circle-exclamation", "is-error");
        setMessage("Verification could not be completed. Try again.", "is-error");
      }
      setBusy(false);
    }
  }

  input.addEventListener("input", function () {
    input.value = input.value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  });
  form.addEventListener("submit", submitAnswer);
  newButton.addEventListener("click", createVerification);
  window.addEventListener("message", function (event) {
    if (event.origin !== parentOrigin) return;
    var data = event.data;
    if (!data || data.namespace !== "NexaCAPTCHA" || data.widgetId !== widgetId) return;
    if (data.type === "reset") createVerification();
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      send("resize", { height: document.documentElement.scrollHeight + 12 });
    }).observe(document.body);
  }
  createVerification();
})();
