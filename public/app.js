(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navFeatures: "Features", navSetup: "Setup", navVerify: "Check the result",
      heroEyebrow: "A HARDER CAPTCHA FOR BOTS", heroTitle: "Simple for people. Costly for bots.", heroLead: "People follow four moving characters and type what they see. Bots must inspect the full animation, track each character, undo changing distortions, and rebuild the answer every time.",
      tryIt: "Try it", addToSite: "Add to your site", noCleanFrame: "No clean screenshot", changingMotion: "Changing motion and shape", higherCost: "More work per bot attempt",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", ready: "Ready", demoHelp: "Follow the moving window, then enter all four characters.", demoOutput: "Your result will appear here.",
      featuresEyebrow: "FEATURES", featuresTitle: "Why is it harder to automate?", featuresLead: "A normal text CAPTCHA gives a bot one picture. NexaCAPTCHA makes it follow a changing sequence.",
      featureReadableTitle: "No clean picture", featureReadableBody: "Most of the time, only part of a character is visible. A complete character appears only briefly.",
      featureMotionTitle: "Nothing moves the same way", featureMotionBody: "Each character has its own speed, direction, rotation, and distortion. The viewing window also slows down and moves backward.",
      featureSimpleTitle: "More work for every answer", featureSimpleBody: "A bot must examine many frames, follow four moving characters, and rebuild the answer. That costs more than reading one image.",
      setupEyebrow: "SETUP", setupTitle: "Add NexaCAPTCHA to your site", setupLead: "Copy these two pieces. No frontend framework is required.",
      loadTitle: "Paste this into your HTML", loadBody: "The Script loads NexaCAPTCHA. The Div chooses where it appears.", sendTitle: "Send the result with your form", sendBody: "Put this in your frontend JavaScript. Replace yourSubmitFunction with your existing submit function.",
      htmlLocation: "HTML · page markup", frontendLocation: "JavaScript · frontend", backendLocation: "Node.js · backend", valuesTitle: "Two values come back", idMeaning: "The ID of the completed CAPTCHA.", tokenMeaning: "Proof that it was completed. It works once.",
      verifyEyebrow: "SERVER CHECK", verifyTitle: "Check it on your server", verifyLead: "Before accepting the form, signup, or login, send both values to NexaCAPTCHA.", request: "Request", successResponse: "Response · success", failureResponse: "Response · failure", important: "Continue only when the response says success: true. A responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Verification complete", footerTagline: "Human verification that makes bots work harder."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navFeatures: "特點", navSetup: "串接", navVerify: "檢查結果",
      heroEyebrow: "讓 BOT 更難破解的 CAPTCHA", heroTitle: "人類容易完成，Bot 必須付出更高成本。", heroLead: "人只要跟著四個移動的字元閱讀並輸入答案。Bot 則必須分析整段動畫、追蹤每個字元、還原持續變化的扭曲，並在每次驗證重新組合答案。",
      tryIt: "立即試用", addToSite: "加入你的網站", noCleanFrame: "沒有乾淨的完整畫面", changingMotion: "移動與形狀持續改變", higherCost: "每次破解都要更多處理",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著移動窗口閱讀，然後輸入四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "特點", featuresTitle: "為什麼自動破解更困難？", featuresLead: "一般文字 CAPTCHA 只給 Bot 一張圖片；NexaCAPTCHA 要它追蹤一段持續變化的動畫。",
      featureReadableTitle: "沒有乾淨的完整圖片", featureReadableBody: "大部分時間只看得到部分筆畫，完整字元只會短暫出現。",
      featureMotionTitle: "每個字都用不同方式移動", featureMotionBody: "每個字元都有自己的速度、方向、旋轉與扭曲，顯示窗口也會減速和倒退。",
      featureSimpleTitle: "每個答案都需要更多處理", featureSimpleBody: "Bot 必須檢查許多畫面、追蹤四個移動字元，再重組答案，成本比讀取一張圖片更高。",
      setupEyebrow: "串接", setupTitle: "把 NexaCAPTCHA 加入你的網站", setupLead: "複製下面兩段即可，不需要前端框架。",
      loadTitle: "貼到你的 HTML", loadBody: "Script 載入 NexaCAPTCHA，Div 決定顯示位置。", sendTitle: "和表單一起送出結果", sendBody: "這段放在前端 JavaScript。將 yourSubmitFunction 換成你現有的表單提交函式。",
      htmlLocation: "HTML · 頁面", frontendLocation: "JavaScript · 前端", backendLocation: "Node.js · 後端", valuesTitle: "完成後會取得兩個值", idMeaning: "這次已完成 CAPTCHA 的 ID。", tokenMeaning: "完成驗證的證明，只能使用一次。",
      verifyEyebrow: "伺服器檢查", verifyTitle: "在你的伺服器確認結果", verifyLead: "接受表單、註冊或登入前，把兩個值傳給 NexaCAPTCHA。", request: "輸入", successResponse: "輸出 · 成功", failureResponse: "輸出 · 失敗", important: "只有回傳 success: true 才能繼續。responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取。", completed: "驗證完成", footerTagline: "讓 Bot 必須付出更多成本的人類驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navFeatures: "特徴", navSetup: "導入", navVerify: "結果を確認",
      heroEyebrow: "BOT にとって難しい CAPTCHA", heroTitle: "人には簡単。Bot には高コスト。", heroLead: "人は動く4文字を追って入力するだけです。Bot はアニメーション全体を調べ、各文字を追跡し、変化する歪みを戻して、毎回答えを再構成する必要があります。",
      tryIt: "試してみる", addToSite: "サイトに追加", noCleanFrame: "きれいな全体画像がない", changingMotion: "動きと形が変化", higherCost: "Bot の試行ごとに追加処理",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "移動する窓を追い、4文字すべてを入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "特徴", featuresTitle: "自動化が難しい理由", featuresLead: "通常の文字 CAPTCHA は一枚の画像です。NexaCAPTCHA は変化するアニメーションを追わせます。",
      featureReadableTitle: "きれいな全体画像がない", featureReadableBody: "ほとんどの時間は文字の一部だけが見え、完全な文字は短時間しか現れません。",
      featureMotionTitle: "すべての文字が違う動き", featureMotionBody: "文字ごとに速度、方向、回転、歪みが異なり、表示窓も減速や後退をします。",
      featureSimpleTitle: "答えごとにより多くの処理", featureSimpleBody: "Bot は多数の画面を確認し、4文字を追跡して答えを再構成するため、一枚の画像より高コストです。",
      setupEyebrow: "導入", setupTitle: "NexaCAPTCHA をサイトに追加", setupLead: "次の二つをコピーするだけです。フロントエンドフレームワークは不要です。",
      loadTitle: "HTML に貼り付ける", loadBody: "Script が NexaCAPTCHA を読み込み、Div が表示位置を決めます。", sendTitle: "フォームと一緒に結果を送る", sendBody: "フロントエンド JavaScript に置き、yourSubmitFunction を既存の送信関数に置き換えます。",
      htmlLocation: "HTML · ページ", frontendLocation: "JavaScript · フロントエンド", backendLocation: "Node.js · バックエンド", valuesTitle: "完了後に二つの値を取得", idMeaning: "完了した CAPTCHA の ID です。", tokenMeaning: "完了した証明で、一度だけ使えます。",
      verifyEyebrow: "サーバー確認", verifyTitle: "サーバーで結果を確認", verifyLead: "フォーム、登録、ログインを受け付ける前に二つの値を NexaCAPTCHA へ送ります。", request: "リクエスト", successResponse: "レスポンス · 成功", failureResponse: "レスポンス · 失敗", important: "success: true の場合だけ続行してください。responseToken は一度だけ使用でき、5分で失効します。",
      copy: "コピー", copied: "コピー済み", copySuccess: "コードをコピーしました。", copyFailure: "コピーできませんでした。手動で選択してください。", completed: "認証完了", footerTagline: "Bot により多くの処理を要求する人間認証。"
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
      ? "NexaCAPTCHA — 人類容易，Bot 成本更高"
      : language === "ja"
        ? "NexaCAPTCHA — 人には簡単、Bot には高コスト"
        : "NexaCAPTCHA — Simple for people. Costly for bots.";
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
    output.querySelector("span").textContent = text("completed");
  };
})();
