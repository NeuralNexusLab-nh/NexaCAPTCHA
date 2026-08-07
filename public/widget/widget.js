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
  var image = document.getElementById("challenge-image");
  var placeholder = document.getElementById("stage-placeholder");
  var stage = document.getElementById("challenge-stage");
  var message = document.getElementById("status-message");
  var pill = document.getElementById("status-pill");
  var currentChallengeId = null;
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
    verifyButton.disabled = value || completed || !currentChallengeId;
    input.disabled = value || completed || !currentChallengeId;
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
      currentChallengeId = null;
      completed = false;
      setBusy(false);
      setPill("Expired", "fa-clock", "is-error");
      setMessage("This challenge expired. Request a new one.", "is-error");
      sendResult({ success: false, challengeId: null, responseToken: null });
    }, delay);
  }

  async function createChallenge() {
    completed = false;
    currentChallengeId = null;
    input.value = "";
    showPlaceholder("Preparing challenge…");
    setPill("Loading", "fa-circle-notch fa-spin", "");
    setMessage("Loading a new challenge…", "");
    setBusy(true);
    sendResult({ success: false, challengeId: null, responseToken: null });

    try {
      var response = await fetch("/api/v1/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store"
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create challenge.");

      currentChallengeId = result.challengeId;
      image.onload = function () {
        placeholder.hidden = true;
        image.classList.add("is-visible");
        setPill("Ready", "fa-eye", "");
        setMessage("Follow the reveal, then enter all four characters.", "");
        setBusy(false);
      };
      image.onerror = function () {
        currentChallengeId = null;
        setPill("Error", "fa-circle-exclamation", "is-error");
        setMessage("The challenge image could not be loaded. Try again.", "is-error");
        setBusy(false);
      };
      image.src = result.animationUrl;
      armExpiry(result.expiresAt);
    } catch (_) {
      currentChallengeId = null;
      setPill("Offline", "fa-triangle-exclamation", "is-error");
      setMessage("Unable to reach NexaCAPTCHA. Try again.", "is-error");
      setBusy(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (busy || completed || !currentChallengeId) return;
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
        "/api/v1/challenges/" + encodeURIComponent(currentChallengeId) + "/answer",
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
          challengeId: result.challengeId,
          responseToken: result.responseToken
        });
        return;
      }

      input.value = "";
      if (result.status === "challenge_failed") {
        if (expiryTimer) window.clearTimeout(expiryTimer);
        currentChallengeId = null;
        setPill("Failed", "fa-circle-exclamation", "is-error");
        setMessage("Verification failed. Request a new challenge to try again.", "is-error");
      } else {
        setPill("Try again", "fa-circle-exclamation", "is-error");
        setMessage(
          "That was not correct. " + result.attemptsRemaining + " attempts remaining.",
          "is-error"
        );
      }
      setBusy(false);
      if (currentChallengeId) input.focus();
    } catch (error) {
      if (String(error.message).includes("challenge-expired")) {
        currentChallengeId = null;
        setPill("Expired", "fa-clock", "is-error");
        setMessage("This challenge expired. Request a new one.", "is-error");
      } else {
        setPill("Error", "fa-circle-exclamation", "is-error");
        setMessage("Verification could not be completed. Try again.", "is-error");
      }
      setBusy(false);
    }
  }

  input.addEventListener("input", function () {
    input.value = input.value.replace(/[^a-z]/gi, "").toUpperCase();
  });
  form.addEventListener("submit", submitAnswer);
  newButton.addEventListener("click", createChallenge);
  window.addEventListener("message", function (event) {
    if (event.origin !== parentOrigin) return;
    var data = event.data;
    if (!data || data.namespace !== "NexaCAPTCHA" || data.widgetId !== widgetId) return;
    if (data.type === "reset") createChallenge();
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      send("resize", { height: document.documentElement.scrollHeight + 12 });
    }).observe(document.body);
  }
  createChallenge();
})();
