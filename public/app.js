(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navTop: "Home", navDemo: "Demo", navFeatures: "How it works", navExperiment: "Results", navCallback: "Callback", navVerify: "Check the result",
      heroEyebrow: "ADAPTIVE HUMAN VERIFICATION", heroTitleLine1: "Human by design.", heroTitleLine2: "Automation denied.", heroLead: "NexaCAPTCHA keeps verification clear for legitimate users while increasing the time, computation, and uncertainty required for automated solving.",
      tryIt: "Explore CAPTCHA modules", addToSite: "View integration", noCleanFrame: "Designed for human readability", changingMotion: "11.8% model success in our test", higherCost: "Two attempts before expiry",
      demoEyebrow: "CAPTCHA MODULES", demoTitle: "Choose a verification.", demoLead: "Horizon reveals four color-coded characters across a short animation. Follow each color over time, then use the shared callback and server-side verification flow.", liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA Horizon", ready: "Ready", demoHelp: "Follow each color through the animation. Enter the four characters when you're ready.", demoOutput: "Your result will appear here.",
      installEyebrow: "ADD HORIZON", installTitle: "Add this HTML to your page.", installLead: "The script loads Horizon and the div marks where the verification should appear.", legacyLoader: "/captcha.js currently loads Horizon too. It remains available as the compatibility URL for existing integrations.",
      featuresEyebrow: "HOW IT WORKS", featuresTitle: "Security that remains usable.", featuresLead: "NexaCAPTCHA distributes visual information across time. People follow a clear sequence, while automated systems must reconstruct it from changing frames.",
      experimentEyebrow: "VERIFICATION TEST", experimentTitle: "Verification performance, measured.", experimentLead: "Recorded mean completion time and success rate for human participants and GPT 5.6 Sol - Medium across three verification systems.", experimentVersion: "Tested build", experimentHumanLabel: "Human", verificationSystem: "Verification system", secondsAverage: "seconds average", successRate: "success rate", experimentNote: "These results describe the recorded test runs and are not a guarantee of performance against every model or execution.",
      featureIncompleteTitle: "No complete still image", featureIncompleteBody: "The answer is revealed over time instead of being exposed in a single frame.", featureDistortionTitle: "Independent motion profiles", featureDistortionBody: "Each character moves and rotates on its own schedule, complicating frame-by-frame alignment.", featureMotionTitle: "Stable visual anchors", featureMotionBody: "Distinct colors help people track characters through motion without exposing the answer in metadata.", featureWindowTitle: "Variable reveal path", featureWindowBody: "The visible region changes direction and pace, reducing the value of fixed-window extraction.", featureUniqueTitle: "Per-verification rendering", featureUniqueBody: "Timing, distortion, placement, and masking are regenerated for every verification.", featureCostTitle: "Server-enforced controls", featureCostBody: "Retry limits, expiry, cooldowns, and one-time response tokens are enforced by the server.",
      callbackEyebrow: "CALLBACK", callbackTitle: "Use the completed result.", callbackLead: "Every NexaCAPTCHA module uses the same callback result. Send the returned ID and token to your backend with the form being protected.", callbackCodeTitle: "Example callback", callbackCodeLead: "This is only an example. You may rename onCaptchaComplete and change the submission logic; keep data-callback set to the same function name.", callbackNameNote: "Choose your own callback name if you prefer. Use exactly the same name in the HTML and JavaScript.", callbackSecurity: "The callback is a frontend handoff, not final proof. Accept the form only after /api/siteverify returns success: true.", callbackValuesTitle: "Callback parameters", callbackValuesLead: "The callback receives one result object with these fields.", resultMeaning: "The object passed into your callback function.", successMeaning: "A boolean. It is true when the verification has been completed.",
      htmlLocation: "HTML · page markup", frontendLocation: "JavaScript · frontend", backendLocation: "Node.js · backend", idMeaning: "The 16-character verification ID. Send it to your backend.", tokenMeaning: "The 64-character one-time token. Send it to your backend without changing it.",
      verifyEyebrow: "SERVER VALIDATION", verifyTitle: "Validate every response server-side.", verifyLead: "Before accepting a form submission, registration, or login, send both values to NexaCAPTCHA.", request: "Request", successResponse: "Response · success", failureResponse: "Response · failure", important: "Continue only when the response says success: true. A responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Verification complete", footerTagline: "Motion-based verification with server-enforced controls."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navTop: "首頁", navFeatures: "運作方式", navExperiment: "測試結果", navSetup: "串接", navVerify: "檢查結果",
      heroEyebrow: "自適應人機驗證", heroTitleLine1: "Human by design.", heroTitleLine2: "Automation denied.", heroLead: "NexaCAPTCHA 讓正常使用者清楚完成驗證，同時提高自動化解題所需的時間、運算與不確定性。",
      tryIt: "開啟示範", addToSite: "查看串接方式", noCleanFrame: "以真人可讀性為優先", changingMotion: "測試中模型成功率 11.8%", higherCost: "兩次輸入機會，之後失效",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著每個顏色看完整段動畫，準備好後輸入四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "運作方式", featuresTitle: "兼顧安全性與可用性。", featuresLead: "NexaCAPTCHA 將視覺資訊分散在時間序列中。真人能依循清楚的變化完成驗證；自動化系統則必須從多個影格重建答案。",
      experimentEyebrow: "驗證測試", experimentTitle: "驗證效能，實際量測。", experimentLead: "記錄真人與 GPT 5.6 Sol - Medium 在三種驗證系統中的平均完成時間與成功率。", experimentVersion: "測試版本", experimentHumanLabel: "真人", verificationSystem: "驗證系統", secondsAverage: "秒平均完成", successRate: "成功率", experimentNote: "這些數據僅描述已記錄的測試，不保證所有模型或每次執行都會得到相同結果。",
      featureIncompleteTitle: "單一影格不含完整答案", featureIncompleteBody: "答案會隨時間逐步呈現，不會直接暴露在一張靜態影像中。", featureDistortionTitle: "獨立的動態參數", featureDistortionBody: "每個字元依照不同節奏移動與旋轉，增加逐幀對齊的處理難度。", featureMotionTitle: "穩定的視覺線索", featureMotionBody: "不同顏色協助真人在移動中追蹤字元，同時不在資料中洩漏答案。", featureWindowTitle: "變化的顯示路徑", featureWindowBody: "可見區域會改變方向與速度，降低固定視窗擷取的有效性。", featureUniqueTitle: "每次驗證重新產生", featureUniqueBody: "時間、扭曲、位置與遮罩參數都會在每次驗證重新生成。", featureCostTitle: "由伺服器強制執行", featureCostBody: "重試次數、有效期限、等待時間與一次性權杖均由伺服器控管。",
      setupEyebrow: "系統串接", setupTitle: "串接 NexaCAPTCHA。", setupLead: "加入前端程式，並在伺服器驗證完成結果；不需要額外的前端框架。",
      loadTitle: "加入前端程式。", loadBody: "載入 NexaCAPTCHA，並將容器放在需要顯示驗證的位置。", sendTitle: "送出已完成的驗證結果。", sendBody: "將這段程式加入前端 JavaScript，並以現有的提交函式取代 yourSubmitFunction。",
      htmlLocation: "HTML · 頁面", frontendLocation: "JavaScript · 前端", backendLocation: "Node.js · 後端", valuesTitle: "前端會收到兩個值。", idMeaning: "已完成 CAPTCHA 的識別碼。", tokenMeaning: "驗證完成的一次性證明。",
      verifyEyebrow: "伺服器驗證", verifyTitle: "所有結果都應由伺服器驗證。", verifyLead: "接受表單、註冊或登入前，請將兩個值傳送至 NexaCAPTCHA。", request: "輸入", successResponse: "輸出 · 成功", failureResponse: "輸出 · 失敗", important: "只有回傳 success: true 才能繼續。responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取。", completed: "驗證完成", footerTagline: "結合動態呈現與伺服器控管的人機驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navTop: "ホーム", navFeatures: "仕組み", navExperiment: "テスト結果", navSetup: "導入", navVerify: "結果を確認",
      heroEyebrow: "適応型ヒューマン認証", heroTitleLine1: "Human by design.", heroTitleLine2: "Automation denied.", heroLead: "NexaCAPTCHA は正規ユーザーの分かりやすさを保ちながら、自動解読に必要な時間、計算量、不確実性を高めます。",
      tryIt: "デモを開く", addToSite: "導入方法を見る", noCleanFrame: "人の読みやすさを優先", changingMotion: "テスト時のモデル成功率 11.8%", higherCost: "入力は2回まで",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "色ごとに動きを追い、分かった4文字を入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "仕組み", featuresTitle: "安全性と使いやすさを両立。", featuresLead: "NexaCAPTCHA は視覚情報を時間軸に分散します。人は明確な変化を追えますが、自動化システムには複数フレームからの再構成が必要です。",
      experimentEyebrow: "検証テスト", experimentTitle: "認証性能を実測。", experimentLead: "人と GPT 5.6 Sol - Medium を対象に、3種類の認証システムで平均所要時間と成功率を記録しました。", experimentVersion: "テスト版", experimentHumanLabel: "人", verificationSystem: "認証システム", secondsAverage: "秒（平均）", successRate: "成功率", experimentNote: "記載値は実施したテストの結果であり、すべてのモデルや実行に対する性能を保証するものではありません。",
      featureIncompleteTitle: "一枚では答えが完成しない", featureIncompleteBody: "答えは時間とともに現れ、単一の静止画にはそのまま表示されません。", featureDistortionTitle: "独立した動作プロファイル", featureDistortionBody: "各文字が異なるタイミングで移動・回転し、フレーム単位の位置合わせを難しくします。", featureMotionTitle: "安定した視覚的手掛かり", featureMotionBody: "異なる色が人の追跡を助けつつ、データ上では答えを公開しません。", featureWindowTitle: "変化する表示経路", featureWindowBody: "表示領域の方向と速度が変化し、固定範囲の抽出効果を抑えます。", featureUniqueTitle: "認証ごとに再生成", featureUniqueBody: "時間、変形、位置、マスクのパラメータを認証のたびに生成します。", featureCostTitle: "サーバー側で強制", featureCostBody: "再試行回数、有効期限、待機時間、一度限りのトークンをサーバーで管理します。",
      setupEyebrow: "システム導入", setupTitle: "NexaCAPTCHA を導入。", setupLead: "クライアントスクリプトを追加し、完了結果をサーバーで検証します。フロントエンドフレームワークは不要です。",
      loadTitle: "クライアントスクリプトを追加。", loadBody: "NexaCAPTCHA を読み込み、認証を表示する位置にコンテナを配置します。", sendTitle: "完了した認証結果を送信。", sendBody: "フロントエンド JavaScript に追加し、yourSubmitFunction を既存の送信処理に置き換えます。",
      htmlLocation: "HTML · ページ", frontendLocation: "JavaScript · フロントエンド", backendLocation: "Node.js · バックエンド", valuesTitle: "フロントエンドに返される値。", idMeaning: "完了した CAPTCHA の識別子です。", tokenMeaning: "認証完了を示す一度限りの証明です。",
      verifyEyebrow: "サーバー検証", verifyTitle: "すべての結果をサーバー側で検証。", verifyLead: "フォーム送信、登録、ログインを受け付ける前に、二つの値を NexaCAPTCHA へ送信します。", request: "リクエスト", successResponse: "レスポンス · 成功", failureResponse: "レスポンス · 失敗", important: "success: true の場合だけ続行してください。responseToken は一度だけ使用でき、5分で失効します。",
      copy: "コピー", copied: "コピー済み", copySuccess: "コードをコピーしました。", copyFailure: "コピーできませんでした。手動で選択してください。", completed: "認証完了", footerTagline: "動的表示とサーバー制御を組み合わせた本人確認。"
    }
  };

  Object.assign(translations["zh-Hant"], {
    navDemo: "示範",
    navCallback: "回呼函式",
    tryIt: "查看 CAPTCHA 模組",
    demoEyebrow: "CAPTCHA 模組",
    demoTitle: "選擇驗證方式。",
    demoLead: "Horizon 會在短動畫中逐步呈現四個不同顏色的字元。沿著顏色追蹤並輸入結果，再使用共用的回呼與後端驗證流程。",
    tryNexa: "試用 NexaCAPTCHA Horizon",
    installEyebrow: "加入 HORIZON",
    installTitle: "將這段 HTML 加入你的頁面。",
    installLead: "script 會載入 Horizon，div 則標示驗證元件要顯示的位置。",
    legacyLoader: "/captcha.js 目前同樣會載入 Horizon，並保留作為既有串接的相容網址。",
    callbackEyebrow: "回呼函式",
    callbackTitle: "取得已完成的驗證結果。",
    callbackLead: "所有 NexaCAPTCHA 模組都使用相同的回呼結果。請將回傳的 ID 與權杖和受保護的表單一起送到後端。",
    callbackCodeTitle: "回呼範例",
    callbackCodeLead: "這只是一個範例。你可以重新命名 onCaptchaComplete 並改寫提交邏輯，只要 data-callback 使用相同的函式名稱即可。",
    callbackNameNote: "函式名稱可以自行修改，但 HTML 與 JavaScript 中的名稱必須完全相同。",
    callbackSecurity: "Callback 只負責將結果交給前端，不能當成最終證明。只有 /api/siteverify 回傳 success: true 時才能接受表單。",
    callbackValuesTitle: "Callback 參數",
    callbackValuesLead: "Callback 會收到一個 result 物件，其中包含以下欄位。",
    resultMeaning: "傳入 callback 函式的結果物件。",
    successMeaning: "布林值；完成驗證時為 true。",
    idMeaning: "16 字元的驗證 ID，請將它傳給後端。",
    tokenMeaning: "64 字元的一次性權杖，請勿修改並直接傳給後端。"
  });

  Object.assign(translations.ja, {
    navDemo: "デモ",
    navCallback: "コールバック",
    tryIt: "CAPTCHAモジュールを見る",
    demoEyebrow: "CAPTCHA MODULES",
    demoTitle: "認証方式を選択。",
    demoLead: "Horizonは短いアニメーションの中で、色分けされた4文字を徐々に表示します。色を追って結果を入力し、共通のコールバックとサーバー検証フローを使用します。",
    tryNexa: "NexaCAPTCHA Horizonを試す",
    installEyebrow: "HORIZONを追加",
    installTitle: "このHTMLをページに追加。",
    installLead: "scriptがHorizonを読み込み、divが認証を表示する位置を指定します。",
    legacyLoader: "/captcha.jsも現在はHorizonを読み込みます。既存の導入向け互換URLとして維持されます。",
    callbackEyebrow: "コールバック",
    callbackTitle: "完了した認証結果を使用。",
    callbackLead: "すべてのNexaCAPTCHAモジュールは同じコールバック結果を使用します。返されたIDとトークンを保護対象のフォームと一緒にバックエンドへ送信します。",
    callbackCodeTitle: "コールバック例",
    callbackCodeLead: "これは一例です。onCaptchaCompleteの名前や送信処理は変更でき、data-callbackには同じ関数名を指定します。",
    callbackNameNote: "関数名は自由に変更できますが、HTMLとJavaScriptでは完全に同じ名前を使用してください。",
    callbackSecurity: "Callbackはフロントエンドへの受け渡しであり、最終的な証明ではありません。/api/siteverifyがsuccess: trueを返した場合のみフォームを受け付けてください。",
    callbackValuesTitle: "Callbackパラメータ",
    callbackValuesLead: "Callbackは、次のフィールドを含むresultオブジェクトを一つ受け取ります。",
    resultMeaning: "Callback関数へ渡される結果オブジェクトです。",
    successMeaning: "真偽値です。認証が完了するとtrueになります。",
    idMeaning: "16文字の認証IDです。バックエンドへ送信します。",
    tokenMeaning: "64文字のワンタイムトークンです。変更せずバックエンドへ送信します。"
  });

  var currentLanguage = "en";
  var languageSelect = document.getElementById("language-select");
  var copyStatus = document.getElementById("copy-status");
  var languageStorageKey = "nexacaptcha-language";

  function hasLanguage(language) {
    return Object.prototype.hasOwnProperty.call(translations, language);
  }

  function storedLanguage() {
    try {
      var language = window.localStorage.getItem(languageStorageKey);
      return hasLanguage(language) ? language : "en";
    } catch (_) {
      return "en";
    }
  }

  function rememberLanguage(language) {
    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch (_) {
      // Language selection still works when storage is unavailable.
    }
  }

  function text(key) {
    return translations[currentLanguage][key] || translations.en[key] || key;
  }

  function applyLanguage(language) {
    if (!hasLanguage(language)) language = "en";
    currentLanguage = language;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      var key = element.dataset.i18n;
      if (key) element.textContent = text(key);
    });
    document.title = language === "zh-Hant"
      ? "NexaCAPTCHA — 可信的人機驗證，為抵抗自動化而設計。"
      : language === "ja"
        ? "NexaCAPTCHA — 信頼できる本人確認を、自動化への耐性から設計。"
        : "NexaCAPTCHA — Human verification, engineered for resistance.";
  }

  languageSelect.addEventListener("change", function () {
    applyLanguage(languageSelect.value);
    rememberLanguage(currentLanguage);
  });
  currentLanguage = storedLanguage();
  languageSelect.value = currentLanguage;
  applyLanguage(currentLanguage);

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var parallaxFrame = null;
  function updateEarthPosition() {
    parallaxFrame = null;
    var progress = Math.min(window.scrollY, 1800);
    document.documentElement.style.setProperty("--earth-shift-y", Math.min(progress * 0.035, 54) + "px");
    document.documentElement.style.setProperty("--earth-shift-x", Math.min(progress * 0.01, 16) + "px");
  }
  if (!reducedMotion.matches) {
    updateEarthPosition();
    window.addEventListener("scroll", function () {
      if (parallaxFrame !== null) return;
      parallaxFrame = window.requestAnimationFrame(updateEarthPosition);
    }, { passive: true });
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", async function () {
      var target = document.getElementById(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent);
        var icon = button.querySelector("i");
        var label = button.querySelector("[data-copy-label]");
        icon.className = "fa-solid fa-check";
        label.textContent = text("copied");
        button.classList.add("is-copied");
        copyStatus.textContent = text("copySuccess");
        window.setTimeout(function () {
          icon.className = "fa-solid fa-copy";
          label.textContent = text("copy");
          button.classList.remove("is-copied");
        }, 1800);
      } catch (_) {
        copyStatus.textContent = text("copyFailure");
      }
    });
  });

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach(function (element) { element.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (element) { observer.observe(element); });
  }

  window.onCaptchaComplete = function (result) {
    var output = document.getElementById("demo-output");
    if (!output || !result.success) return;
    output.classList.add("is-success");
    output.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span></span>';
    output.querySelector("span").textContent = text("completed");
  };
})();
