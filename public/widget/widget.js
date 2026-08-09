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
  var speedButton = document.getElementById("speed-button");
  var image = document.getElementById("verification-image");
  var placeholder = document.getElementById("stage-placeholder");
  var stage = document.getElementById("verification-stage");
  var message = document.getElementById("status-message");
  var pill = document.getElementById("status-pill");
  var progressPercent = document.getElementById("progress-percent");
  var progressTrack = document.getElementById("progress-track");
  var progressMarker = document.getElementById("progress-marker");
  var playbackSpeeds = [1, 0.75, 0.5, 0.25, 1.25, 1.5, 2];
  var playbackSpeedIndex = 0;
  var originalGifBytes = null;
  var currentObjectUrl = null;
  var playbackDurationMs = 0;
  var playbackStartedAt = 0;
  var progressTimer = null;
  var currentVerificationId = null;
  var expiryTimer = null;
  var cooldownTimer = null;
  var busy = false;
  var coolingDown = false;
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
    if (icon) {
      var iconElement = document.createElement("i");
      iconElement.className = "fa-solid " + icon;
      iconElement.setAttribute("aria-hidden", "true");
      pill.append(iconElement);
    }
    pill.append(document.createTextNode(label));
  }

  function setMessage(text, kind) {
    message.textContent = text;
    message.className = kind || "";
  }

  function updateControls() {
    stage.setAttribute("aria-busy", String(busy));
    var unavailable = busy || coolingDown || completed || !currentVerificationId;
    verifyButton.disabled = unavailable;
    input.disabled = unavailable;
    newButton.disabled = busy;
    speedButton.disabled = busy || !originalGifBytes;
  }

  function clearTimers() {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    if (cooldownTimer) window.clearInterval(cooldownTimer);
    expiryTimer = null;
    cooldownTimer = null;
  }

  function speedLabel() {
    return String(playbackSpeeds[playbackSpeedIndex]) + "x";
  }

  function updateSpeedButton() {
    var label = speedLabel();
    speedButton.textContent = label;
    speedButton.setAttribute("aria-label", "Playback speed: " + label);
  }

  function setProgress(value) {
    var normalized = Math.min(100, Math.max(0, value));
    var rounded = Math.floor(normalized);
    progressPercent.textContent = rounded + "%";
    progressTrack.setAttribute("aria-valuenow", String(rounded));
    progressMarker.style.left = normalized + "%";
  }

  function stopProgress() {
    if (progressTimer) window.clearInterval(progressTimer);
    progressTimer = null;
  }

  function startProgress(durationMs) {
    stopProgress();
    playbackDurationMs = Math.max(1, durationMs);
    playbackStartedAt = performance.now();
    setProgress(0);
    progressTimer = window.setInterval(function () {
      var elapsed = performance.now() - playbackStartedAt;
      setProgress((elapsed % playbackDurationMs) / playbackDurationMs * 100);
    }, 100);
  }

  function skipGifSubBlocks(bytes, offset) {
    while (offset < bytes.length) {
      var size = bytes[offset] || 0;
      offset += 1;
      if (size === 0) break;
      offset += size;
    }
    return offset;
  }

  function gifForSpeed(sourceBytes, speed) {
    var bytes = new Uint8Array(sourceBytes);
    var packed = bytes[10] || 0;
    var offset = 13;
    if (packed & 0x80) offset += 3 * Math.pow(2, (packed & 0x07) + 1);
    var durationMs = 0;

    while (offset < bytes.length) {
      var marker = bytes[offset];
      if (marker === 0x3b) break;
      if (marker === 0x21) {
        var extensionType = bytes[offset + 1];
        if (extensionType === 0xf9 && bytes[offset + 2] === 0x04) {
          var delay = (bytes[offset + 5] || 0) * 256 + (bytes[offset + 4] || 0);
          var adjustedDelay = Math.max(2, Math.round(Math.max(1, delay) / speed));
          bytes[offset + 4] = adjustedDelay & 0xff;
          bytes[offset + 5] = adjustedDelay >> 8 & 0xff;
          durationMs += adjustedDelay * 10;
          offset += 8;
          continue;
        }
        offset = skipGifSubBlocks(bytes, offset + 2);
        continue;
      }
      if (marker === 0x2c) {
        var imagePacked = bytes[offset + 9] || 0;
        offset += 10;
        if (imagePacked & 0x80) {
          offset += 3 * Math.pow(2, (imagePacked & 0x07) + 1);
        }
        offset += 1;
        offset = skipGifSubBlocks(bytes, offset);
        continue;
      }
      throw new Error("invalid-gif-data");
    }

    if (durationMs <= 0) throw new Error("gif-has-no-frames");
    return { bytes: bytes, durationMs: durationMs };
  }

  function releasePlayback(resetSpeed) {
    stopProgress();
    originalGifBytes = null;
    playbackDurationMs = 0;
    playbackStartedAt = 0;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
    image.removeAttribute("src");
    setProgress(0);
    if (resetSpeed) {
      playbackSpeedIndex = 0;
      updateSpeedButton();
    }
  }

  function playGif(onReady) {
    if (!originalGifBytes) return;
    stopProgress();
    setProgress(0);
    var playback = gifForSpeed(
      originalGifBytes,
      playbackSpeeds[playbackSpeedIndex] || 1
    );
    var nextObjectUrl = URL.createObjectURL(
      new Blob([playback.bytes], { type: "image/gif" })
    );
    var previousObjectUrl = currentObjectUrl;
    currentObjectUrl = nextObjectUrl;
    if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
    image.onload = function () {
      image.onload = null;
      startProgress(playback.durationMs);
      if (onReady) onReady();
    };
    image.src = nextObjectUrl;
  }

  function showLoadingPlaceholder(text) {
    image.classList.remove("is-visible");
    image.removeAttribute("src");
    placeholder.hidden = false;
    placeholder.replaceChildren();
    var icon = document.createElement("i");
    icon.className = "fa-solid fa-circle-notch fa-spin";
    icon.setAttribute("aria-hidden", "true");
    placeholder.append(icon, document.createTextNode(text));
  }

  function armExpiry(expiresAtOrDuration) {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    var durationMs = typeof expiresAtOrDuration === "string"
      ? new Date(expiresAtOrDuration).getTime() - Date.now()
      : expiresAtOrDuration;
    expiryTimer = window.setTimeout(function () {
      currentVerificationId = null;
      completed = false;
      coolingDown = false;
      updateControls();
      setPill("Expired", "fa-clock", "is-error");
      setMessage("This verification expired after two minutes. Request a new one.", "is-error");
      sendResult({ success: false, verificationId: null, responseToken: null });
    }, Math.max(0, durationMs));
  }

  function startCooldown(seconds) {
    var remaining = Math.max(1, Math.ceil(seconds));
    coolingDown = true;
    updateControls();
    setPill("Wait", "fa-hourglass-half", "");

    function renderCooldown() {
      setMessage(
        "That was not correct. You can enter another answer in " + remaining + " seconds.",
        "is-error"
      );
    }

    renderCooldown();
    cooldownTimer = window.setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(cooldownTimer);
        cooldownTimer = null;
        coolingDown = false;
        setPill("Try again", "fa-keyboard", "");
        setMessage("Enter your next answer. One more incorrect answer ends this verification.", "");
        updateControls();
        input.focus();
        return;
      }
      renderCooldown();
    }, 1000);
  }

  function scheduleVerification() {
    clearTimers();
    image.onload = null;
    image.onerror = null;
    releasePlayback(true);
    completed = false;
    coolingDown = false;
    currentVerificationId = null;
    input.value = "";
    busy = true;
    updateControls();
    sendResult({ success: false, verificationId: null, responseToken: null });

    showLoadingPlaceholder("Preparing verification…");
    setPill("Loading", "", "");
    setMessage("Loading a new verification…", "");
    void createVerification();
  }

  async function createVerification() {
    showLoadingPlaceholder("Preparing verification…");
    setPill("Loading", "", "");
    setMessage("Loading a new verification…", "");

    try {
      var response = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store"
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.errorCode || "verification-create-error");

      currentVerificationId = result.verificationId;
      image.onerror = function () {
        currentVerificationId = null;
        busy = false;
        setPill("Error", "fa-circle-exclamation", "is-error");
        setMessage("The verification animation could not be loaded. Try again.", "is-error");
        updateControls();
      };
      var animationResponse = await fetch(result.animationUrl, { cache: "no-store" });
      if (!animationResponse.ok) throw new Error("verification-animation-error");
      originalGifBytes = new Uint8Array(await animationResponse.arrayBuffer());
      playGif(function () {
        var playbackVerificationId = currentVerificationId;
        placeholder.hidden = true;
        image.classList.add("is-visible");
        busy = false;
        setPill("Playing", "fa-eye", "");
        setMessage("Follow the reveal, then enter all four characters.", "");
        updateControls();
        armExpiry(Math.max(1_000, (result.expiresInMs || 120_000) - 1_000));
        void fetch(
          "/api/verifications/" + encodeURIComponent(playbackVerificationId) + "/status",
          { cache: "no-store" }
        ).then(function (statusResponse) {
          if (!statusResponse.ok) throw new Error("status-error");
          return statusResponse.json();
        }).then(function (status) {
          if (currentVerificationId === playbackVerificationId && status.expiresAt) {
            armExpiry(status.expiresAt);
          }
        }).catch(function () {
          // The conservative local timer remains armed when status sync fails.
        });
        input.focus();
      });
    } catch (_) {
      currentVerificationId = null;
      busy = false;
      releasePlayback(false);
      setPill("Offline", "fa-triangle-exclamation", "is-error");
      setMessage("Unable to reach NexaCAPTCHA. Try again.", "is-error");
      updateControls();
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (busy || coolingDown || completed || !currentVerificationId) return;
    var answer = input.value.trim().toUpperCase();
    input.value = answer;
    if (answer.length !== 4) {
      setMessage("Enter all four characters before verifying.", "is-error");
      input.focus();
      return;
    }

    busy = true;
    updateControls();
    setPill("Checking", "", "");
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

      busy = false;
      if (result.success) {
        completed = true;
        clearTimers();
        setPill("Complete", "fa-circle-check", "is-complete");
        setMessage("Verification complete.", "is-success");
        updateControls();
        sendResult({
          success: true,
          verificationId: result.verificationId,
          responseToken: result.responseToken
        });
        return;
      }

      input.value = "";
      if (result.status === "verification_failed") {
        clearTimers();
        currentVerificationId = null;
        setPill("Failed", "fa-circle-exclamation", "is-error");
        setMessage("Two incorrect answers ended this verification.", "is-error");
        updateControls();
      } else {
        startCooldown(result.retryAfterSeconds || 10);
      }
    } catch (error) {
      busy = false;
      var code = String(error.message);
      if (code.includes("verification-expired")) {
        clearTimers();
        currentVerificationId = null;
        setPill("Expired", "fa-clock", "is-error");
        setMessage("This verification expired after two minutes. Request a new one.", "is-error");
        updateControls();
      } else if (code.includes("answer-cooldown")) {
        startCooldown(10);
      } else {
        setPill("Error", "fa-circle-exclamation", "is-error");
        setMessage("Verification could not be completed. Try again.", "is-error");
        updateControls();
      }
    }
  }

  input.addEventListener("input", function () {
    input.value = input.value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  });
  form.addEventListener("submit", submitAnswer);
  newButton.addEventListener("click", scheduleVerification);
  speedButton.addEventListener("click", function () {
    if (busy || !originalGifBytes) return;
    playbackSpeedIndex = (playbackSpeedIndex + 1) % playbackSpeeds.length;
    updateSpeedButton();
    playGif();
  });
  window.addEventListener("message", function (event) {
    if (event.origin !== parentOrigin) return;
    var data = event.data;
    if (!data || data.namespace !== "NexaCAPTCHA" || data.widgetId !== widgetId) return;
    if (data.type === "reset") scheduleVerification();
  });
  window.addEventListener("beforeunload", function () {
    stopProgress();
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      send("resize", { height: document.documentElement.scrollHeight + 12 });
    }).observe(document.body);
  }

  busy = false;
  updateSpeedButton();
  updateControls();
  scheduleVerification();
})();
