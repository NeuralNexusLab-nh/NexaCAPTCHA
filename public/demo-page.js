(function () {
  "use strict";

  window.onCaptchaComplete = function (result) {
    var output = document.getElementById("demo-result");
    if (!output || !result || !result.success) return;
    output.classList.add("is-complete");
    output.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Verification complete. The response is ready for server-side validation.</span>';
  };
})();
