(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navFeatures: "Features", navSetup: "Setup", navVerify: "Backend verification",
      heroEyebrow: "HUMAN VERIFICATION", heroTitle: "Stronger verification. Built to resist automation.", heroLead: "NexaCAPTCHA shows four characters a little at a time. People follow the movement and read them naturally, while automated tools need to process the full animation.",
      tryIt: "Try it", addToSite: "Add to your site", independentMotion: "Independent character motion", partialReveal: "Mostly partial reveal", stableV1: "Stable /v1/ endpoints",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", ready: "Ready", demoHelp: "Follow the moving window, then enter all four characters.", demoOutput: "Your result will appear here.",
      featuresEyebrow: "FEATURES", featuresTitle: "Why NexaCAPTCHA?", featuresLead: "A normal text CAPTCHA can be read from one picture. NexaCAPTCHA spreads the useful parts across an animation.",
      featureReadableTitle: "Four independent movements", featureReadableBody: "Each character changes direction, speed, rotation, and shape on its own 1.25–5 second cycle.", featureMotionTitle: "Only fragments stay visible", featureMotionBody: "The window changes speed and sometimes moves backward. A complete character appears only briefly.", featureSimpleTitle: "Simple to add", featureSimpleBody: "Load one script, add one element, then verify two values from your backend.",
      setupEyebrow: "SETUP", setupTitle: "Add it in two small steps", setupLead: "The CAPTCHA handles its own display and answer checking.", loadTitle: "Load the widget", loadBody: "Add this script and place the CAPTCHA where you want it.", sendTitle: "Submit with your own function", sendBody: "Put this in your frontend JavaScript. Replace yourSubmitFunction with the function that submits your form to your backend.", htmlLocation: "HTML · page markup", frontendLocation: "JavaScript · frontend", backendLocation: "Node.js · backend",
      valuesTitle: "The two values you need", idMeaning: "Identifies which completed CAPTCHA is being checked.", tokenMeaning: "A 32-character, one-time proof returned after the correct answer.",
      verifyEyebrow: "BACKEND VERIFICATION", verifyTitle: "Confirm the result", verifyLead: "Your backend sends the two values to one endpoint before accepting the form, signup, or login.", versionNote: "The /v1/ paths are stable and will not be renamed.", request: "Request", successResponse: "Response · success", failureResponse: "Response · failure", important: "Only accept the protected action when siteverify returns success: true. Each responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Completed", footerTagline: "Simple motion-based human verification."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navFeatures: "特點", navSetup: "串接", navVerify: "後端驗證",
      heroEyebrow: "人類驗證", heroTitle: "更強的驗證，為抵抗自動化而生。", heroLead: "NexaCAPTCHA 會逐步顯示四個字元。人類只要跟著移動閱讀，自動化工具則需要處理完整動畫。",
      tryIt: "立即試用", addToSite: "加入你的網站", independentMotion: "每個字元獨立移動", partialReveal: "大部分時間只顯示局部", stableV1: "穩定的 /v1/ Endpoint",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著移動範圍閱讀，然後輸入全部四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "特點", featuresTitle: "為什麼使用 NexaCAPTCHA？", featuresLead: "一般文字 CAPTCHA 可以從一張圖片讀取；NexaCAPTCHA 將有效資訊分散在動畫裡。",
      featureReadableTitle: "四個獨立移動的字元", featureReadableBody: "每個字元會用各自 1.25–5 秒的週期改變方向、速度、旋轉與形狀。", featureMotionTitle: "大部分時間只看得到片段", featureMotionBody: "顯示窗口會變速並偶爾倒退，完整字元只會短暫出現。", featureSimpleTitle: "容易加入網站", featureSimpleBody: "載入一個 Script、加入一個元素，再由後端驗證兩個值。",
      setupEyebrow: "串接", setupTitle: "兩個步驟即可加入", setupLead: "CAPTCHA 會自行處理顯示及答案檢查。", loadTitle: "載入元件", loadBody: "加入 Script，並將 CAPTCHA 放到你希望顯示的位置。", sendTitle: "使用你自己的提交函式", sendBody: "這段放在前端 JavaScript。將 yourSubmitFunction 換成你用來把表單送到後端的函式。", htmlLocation: "HTML · 頁面標記", frontendLocation: "JavaScript · 前端", backendLocation: "Node.js · 後端",
      valuesTitle: "你需要的兩個值", idMeaning: "指出這次要檢查的是哪一筆已完成的 CAPTCHA。", tokenMeaning: "正確回答後產生的 32 字元一次性證明。",
      verifyEyebrow: "後端驗證", verifyTitle: "確認驗證結果", verifyLead: "接受表單、註冊或登入前，由你的後端將兩個值傳到這個 Endpoint。", versionNote: "/v1/ 路徑保持穩定，不會重新命名。", request: "輸入", successResponse: "輸出 · 成功", failureResponse: "輸出 · 失敗", important: "只有 siteverify 回傳 success: true 時才能接受操作。每個 responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取程式碼。", completed: "已完成", footerTagline: "簡單的動態人類驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navFeatures: "特徴", navSetup: "導入", navVerify: "バックエンド確認",
      heroEyebrow: "人間認証", heroTitle: "より強い認証。自動化への抵抗を設計。", heroLead: "NexaCAPTCHA は4文字を少しずつ表示します。人は動きを追って読めますが、自動化ツールはアニメーション全体を処理する必要があります。",
      tryIt: "試してみる", addToSite: "サイトに追加", independentMotion: "文字ごとの独立した動き", partialReveal: "ほとんどの時間は部分表示", stableV1: "安定した /v1/ エンドポイント",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "移動する表示を追い、4文字すべてを入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "特徴", featuresTitle: "NexaCAPTCHA の特徴", featuresLead: "通常の文字 CAPTCHA は一枚の画像で読めます。NexaCAPTCHA は必要な部分をアニメーションに分散します。",
      featureReadableTitle: "四つの独立した動き", featureReadableBody: "各文字は1.25～5秒の独自周期で方向、速度、回転、形を変えます。", featureMotionTitle: "ほとんどの時間は断片だけ", featureMotionBody: "表示窓は速度を変え、時々後退します。完全な文字は短時間だけ現れます。", featureSimpleTitle: "簡単に追加", featureSimpleBody: "Script と要素を一つずつ追加し、バックエンドで二つの値を確認します。",
      setupEyebrow: "導入", setupTitle: "二つの手順で追加", setupLead: "表示と回答確認は CAPTCHA が処理します。", loadTitle: "ウィジェットを読み込む", loadBody: "Script を追加し、表示したい場所に CAPTCHA を置きます。", sendTitle: "独自の送信関数を使う", sendBody: "これはフロントエンド JavaScript に置きます。yourSubmitFunction をフォームをバックエンドへ送る関数に置き換えてください。", htmlLocation: "HTML · ページマークアップ", frontendLocation: "JavaScript · フロントエンド", backendLocation: "Node.js · バックエンド",
      valuesTitle: "必要な二つの値", idMeaning: "確認する完了済み CAPTCHA を識別します。", tokenMeaning: "正解後に返される32文字の一度だけ使える証明です。",
      verifyEyebrow: "バックエンド確認", verifyTitle: "結果を確認する", verifyLead: "フォーム、登録、ログインを受け付ける前に、バックエンドから二つの値をこのエンドポイントへ送ります。", versionNote: "/v1/ パスは安定しており、名前は変更されません。", request: "リクエスト", successResponse: "レスポンス · 成功", failureResponse: "レスポンス · 失敗", important: "siteverify が success: true を返した場合のみ処理を許可してください。responseToken は一度だけ使用でき、5分で失効します。",
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
      ? "NexaCAPTCHA — 為抵抗自動化而生"
      : language === "ja"
        ? "NexaCAPTCHA — 自動化への抵抗を設計"
        : "NexaCAPTCHA — Stronger verification. Built to resist automation.";
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
