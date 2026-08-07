(function () {
  "use strict";

  var copyStatus = document.getElementById("copy-status");
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", async function () {
      var target = document.getElementById(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent);
        var icon = button.querySelector("i");
        var label = button.querySelector("span");
        icon.className = "fa-solid fa-check";
        label.textContent = "Copied";
        button.classList.add("is-copied");
        copyStatus.textContent = "Code copied to clipboard.";
        window.setTimeout(function () {
          icon.className = "fa-solid fa-copy";
          label.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1800);
      } catch (_) {
        copyStatus.textContent = "Code could not be copied. Select it manually.";
      }
    });
  });

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (element) {
      element.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(function (element) {
      observer.observe(element);
    });
  }

  window.onNexaComplete = function (result) {
    var output = document.getElementById("demo-output");
    if (!output || !result.success) return;
    output.classList.add("is-success");
    output.replaceChildren();
    var icon = document.createElement("i");
    icon.className = "fa-solid fa-circle-check";
    icon.setAttribute("aria-hidden", "true");
    var text = document.createElement("span");
    text.textContent = "Completed · " + result.challengeId;
    output.append(icon, text);
  };
})();
