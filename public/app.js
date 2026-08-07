(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navFeatures: "Features", navSetup: "Setup", navVerify: "Backend verification",
      heroEyebrow: "HUMAN VERIFICATION", heroTitle: "Easy for people. More work for bots.", heroLead: "NexaCAPTCHA shows four characters a little at a time. People follow the movement and read them naturally, while automated tools need to process the full animation.",
      tryIt: "Try it", addToSite: "Add to your site", fourChars: "4 uppercase letters or digits", fiveMinutes: "5 minutes to complete", oneTime: "One-time result",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", ready: "Ready", demoHelp: "Follow the moving window, then enter all four characters.", demoOutput: "Your result will appear here.",
      featuresEyebrow: "FEATURES", featuresTitle: "Why NexaCAPTCHA?", featuresLead: "A normal text CAPTCHA can be read from one picture. NexaCAPTCHA spreads the useful parts across an animation.",
      featureReadableTitle: "Clearer for people", featureReadableBody: "Characters stay centered, do not move up and down, and a wider area remains visible.", featureMotionTitle: "The full animation matters", featureMotionBody: "No single moment shows the complete answer. Automated tools must inspect more than one image.", featureSimpleTitle: "Simple to add", featureSimpleBody: "Load one script, add one element, then verify two values from your backend.",
      setupEyebrow: "SETUP", setupTitle: "Add it in two small steps", setupLead: "The CAPTCHA handles its own display and answer checking.", loadTitle: "Load the widget", loadBody: "Add this script and place the CAPTCHA where you want it.", sendTitle: "Send the result to your backend", sendBody: "After success, send only verificationId and responseToken to your server.",
      valuesTitle: "The two values you need", idMeaning: "Identifies which completed CAPTCHA is being checked.", tokenMeaning: "A 32-character, one-time proof returned after the correct answer.",
      verifyEyebrow: "BACKEND VERIFICATION", verifyTitle: "Confirm the result", verifyLead: "Your backend sends the two values to one endpoint before accepting the form, signup, or login.", request: "Request", response: "Response", important: "Only accept the protected action when siteverify returns success: true. Each responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Completed", footerTagline: "Simple motion-based human verification."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navFeatures: "特點", navSetup: "串接", navVerify: "後端驗證",
      heroEyebrow: "人類驗證", heroTitle: "人類容易辨識，機器需要更多處理。", heroLead: "NexaCAPTCHA 會逐步顯示四個字元。人類只要跟著移動閱讀，自動化工具則需要處理完整動畫。",
      tryIt: "立即試用", addToSite: "加入你的網站", fourChars: "4 個大寫英文字母或數字", fiveMinutes: "5 分鐘完成時間", oneTime: "一次性驗證結果",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著移動範圍閱讀，然後輸入全部四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "特點", featuresTitle: "為什麼使用 NexaCAPTCHA？", featuresLead: "一般文字 CAPTCHA 可以從一張圖片讀取；NexaCAPTCHA 將有效資訊分散在動畫裡。",
      featureReadableTitle: "人類更容易閱讀", featureReadableBody: "字元保持置中、不再上下移動，並顯示更寬的範圍。", featureMotionTitle: "需要觀看動畫", featureMotionBody: "任何單一畫面都不會顯示完整答案，自動化工具必須檢查多個畫面。", featureSimpleTitle: "容易加入網站", featureSimpleBody: "載入一個 Script、加入一個元素，再由後端驗證兩個值。",
      setupEyebrow: "串接", setupTitle: "兩個步驟即可加入", setupLead: "CAPTCHA 會自行處理顯示及答案檢查。", loadTitle: "載入元件", loadBody: "加入 Script，並將 CAPTCHA 放到你希望顯示的位置。", sendTitle: "將結果傳到後端", sendBody: "成功後，只要將 verificationId 和 responseToken 傳到你的伺服器。",
      valuesTitle: "你需要的兩個值", idMeaning: "指出這次要檢查的是哪一筆已完成的 CAPTCHA。", tokenMeaning: "正確回答後產生的 32 字元一次性證明。",
      verifyEyebrow: "後端驗證", verifyTitle: "確認驗證結果", verifyLead: "接受表單、註冊或登入前，由你的後端將兩個值傳到這個 Endpoint。", request: "輸入", response: "輸出", important: "只有 siteverify 回傳 success: true 時才能接受操作。每個 responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取程式碼。", completed: "已完成", footerTagline: "簡單的動態人類驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navFeatures: "特徴", navSetup: "導入", navVerify: "バックエンド確認",
      heroEyebrow: "人間認証", heroTitle: "人には読みやすく、ボットにはより多くの処理を。", heroLead: "NexaCAPTCHA は4文字を少しずつ表示します。人は動きを追って読めますが、自動化ツールはアニメーション全体を処理する必要があります。",
      tryIt: "試してみる", addToSite: "サイトに追加", fourChars: "英大文字または数字4文字", fiveMinutes: "完了まで5分", oneTime: "一度だけ使える結果",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "移動する表示を追い、4文字すべてを入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "特徴", featuresTitle: "NexaCAPTCHA の特徴", featuresLead: "通常の文字 CAPTCHA は一枚の画像で読めます。NexaCAPTCHA は必要な部分をアニメーションに分散します。",
      featureReadableTitle: "人が読みやすい", featureReadableBody: "文字は中央に固定され、上下に動かず、広い範囲が表示されます。", featureMotionTitle: "アニメーション全体が必要", featureMotionBody: "一画面だけでは答え全体が見えないため、自動化ツールは複数の画面を確認する必要があります。", featureSimpleTitle: "簡単に追加", featureSimpleBody: "Script と要素を一つずつ追加し、バックエンドで二つの値を確認します。",
      setupEyebrow: "導入", setupTitle: "二つの手順で追加", setupLead: "表示と回答確認は CAPTCHA が処理します。", loadTitle: "ウィジェットを読み込む", loadBody: "Script を追加し、表示したい場所に CAPTCHA を置きます。", sendTitle: "結果をバックエンドへ送る", sendBody: "成功後、verificationId と responseToken だけをサーバーへ送ります。",
      valuesTitle: "必要な二つの値", idMeaning: "確認する完了済み CAPTCHA を識別します。", tokenMeaning: "正解後に返される32文字の一度だけ使える証明です。",
      verifyEyebrow: "バックエンド確認", verifyTitle: "結果を確認する", verifyLead: "フォーム、登録、ログインを受け付ける前に、バックエンドから二つの値をこのエンドポイントへ送ります。", request: "リクエスト", response: "レスポンス", important: "siteverify が success: true を返した場合のみ処理を許可してください。responseToken は一度だけ使用でき、5分で失効します。",
      copy: "コピー", copied: "コピー済み", copySuccess: "コードをコピーしました。", copyFailure: "コピーできませんでした。手動で選択してください。", completed: "完了", footerTagline: "シンプルな動画式人間認証。"
    }
  };

  var currentLanguage = "en";
  var languageSelect = document.getElementById("language-select");
  var copyStatus = document.getElementById("copy-status");

  function text(key) {
    return translations[currentLanguage][key] || translations.en[key] || key;
  }

  function applyLanguage(language) {
    if (!translations[language]) language = "en";
    currentLanguage = language;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      var key = element.dataset.i18n;
      if (key) element.textContent = text(key);
    });
    document.title = language === "zh-Hant"
      ? "NexaCAPTCHA — 人類容易辨識"
      : language === "ja"
        ? "NexaCAPTCHA — 人に読みやすい認証"
        : "NexaCAPTCHA — Easy for people. More work for bots.";
  }

  languageSelect.addEventListener("change", function () {
    applyLanguage(languageSelect.value);
  });
  applyLanguage("en");

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

  window.onNexaComplete = function (result) {
    var output = document.getElementById("demo-output");
    if (!output || !result.success) return;
    output.classList.add("is-success");
    output.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span></span>';
    output.querySelector("span").textContent = text("completed") + " · " + result.verificationId;
  };
})();
