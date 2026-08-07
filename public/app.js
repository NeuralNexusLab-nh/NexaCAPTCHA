(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navTop: "Top", navDemo: "Demo", navFeatures: "Features", navSetup: "Setup", navVerify: "Check the result",
      heroEyebrow: "HUMANS IN. BOTS HELD BACK.", heroTitle: "Let humans through. Make bots pay.", heroLead: "NexaCAPTCHA turns four characters into a moving target. People follow it naturally. Bots must chase incomplete, distorted pieces across the full animation—on every attempt.",
      tryIt: "Try it", addToSite: "Add to your site", noCleanFrame: "No clean screenshot", changingMotion: "Changing motion and shape", higherCost: "More work per bot attempt",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", ready: "Ready", demoHelp: "Follow the moving window, then enter all four characters.", demoOutput: "Your result will appear here.",
      featuresEyebrow: "FEATURES", featuresTitle: "Why use NexaCAPTCHA?", featuresLead: "Random distortion, independent movement, and incomplete display force automated solvers to do far more work for every answer.",
      featureIncompleteTitle: "Incomplete by design", featureIncompleteBody: "Most frames show only fragments. Two to four characters are never shown in full.", featureDistortionTitle: "Constant distortion", featureDistortionBody: "Characters keep bending, stretching, rotating, and changing shape.", featureMotionTitle: "Independent movement", featureMotionBody: "Every character moves in its own direction and at its own changing speed.", featureWindowTitle: "An unpredictable window", featureWindowBody: "The visible shape keeps bending and changing while it speeds up, slows down, and moves backward.", featureUniqueTitle: "Different every time", featureUniqueBody: "The motion, distortion, timing, and hidden characters change with every CAPTCHA.", featureCostTitle: "Higher solving cost", featureCostBody: "Bots must inspect many frames, track moving fragments, and rebuild the answer instead of reading one image.",
      setupEyebrow: "SETUP", setupTitle: "Add NexaCAPTCHA to your site", setupLead: "Copy these two pieces. No frontend framework is required.",
      loadTitle: "Paste this into your HTML", loadBody: "The Script loads NexaCAPTCHA. The Div chooses where it appears.", sendTitle: "Send the result with your form", sendBody: "Put this in your frontend JavaScript. Replace yourSubmitFunction with your existing submit function.",
      htmlLocation: "HTML · page markup", frontendLocation: "JavaScript · frontend", backendLocation: "Node.js · backend", valuesTitle: "Two values come back", idMeaning: "The ID of the completed CAPTCHA.", tokenMeaning: "Proof that it was completed. It works once.",
      verifyEyebrow: "SERVER CHECK", verifyTitle: "Check it on your server", verifyLead: "Before accepting the form, signup, or login, send both values to NexaCAPTCHA.", request: "Request", successResponse: "Response · success", failureResponse: "Response · failure", important: "Continue only when the response says success: true. A responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Verification complete", footerTagline: "Human verification that makes bots work harder."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navTop: "頂端", navDemo: "示範", navFeatures: "特點", navSetup: "串接", navVerify: "檢查結果",
      heroEyebrow: "讓人類通過，擋下 BOT", heroTitle: "讓人類通過，讓 Bot 付出代價。", heroLead: "NexaCAPTCHA 把四個字元變成持續移動的目標。人類能自然跟著閱讀；Bot 每次都必須在完整動畫中追蹤不完整、持續扭曲的片段。",
      tryIt: "立即試用", addToSite: "加入你的網站", noCleanFrame: "沒有乾淨的完整畫面", changingMotion: "移動與形狀持續改變", higherCost: "每次破解都要更多處理",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著移動窗口閱讀，然後輸入四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "特點", featuresTitle: "為什麼使用 NexaCAPTCHA？", featuresLead: "隨機扭曲、獨立移動和不完整顯示，會讓自動破解每個答案都必須付出大幅增加的處理成本。",
      featureIncompleteTitle: "刻意保持不完整", featureIncompleteBody: "大部分畫面只顯示片段，而且每題會有二至四個字元從頭到尾都不完整。", featureDistortionTitle: "持續扭曲", featureDistortionBody: "字元會不斷彎曲、拉伸、旋轉和改變形狀。", featureMotionTitle: "各自獨立移動", featureMotionBody: "每個字元都有自己的方向和持續改變的速度。", featureWindowTitle: "難以預測的窗口", featureWindowBody: "可見形狀會持續彎曲和改變，同時加速、減速和倒退。", featureUniqueTitle: "每次都不一樣", featureUniqueBody: "每次 CAPTCHA 的移動、扭曲、時機和隱藏字元都會改變。", featureCostTitle: "大幅提高破解成本", featureCostBody: "Bot 不能只讀一張圖片，而必須檢查許多畫面、追蹤片段並重組答案。",
      setupEyebrow: "串接", setupTitle: "把 NexaCAPTCHA 加入你的網站", setupLead: "複製下面兩段即可，不需要前端框架。",
      loadTitle: "貼到你的 HTML", loadBody: "Script 載入 NexaCAPTCHA，Div 決定顯示位置。", sendTitle: "和表單一起送出結果", sendBody: "這段放在前端 JavaScript。將 yourSubmitFunction 換成你現有的表單提交函式。",
      htmlLocation: "HTML · 頁面", frontendLocation: "JavaScript · 前端", backendLocation: "Node.js · 後端", valuesTitle: "完成後會取得兩個值", idMeaning: "這次已完成 CAPTCHA 的 ID。", tokenMeaning: "完成驗證的證明，只能使用一次。",
      verifyEyebrow: "伺服器檢查", verifyTitle: "在你的伺服器確認結果", verifyLead: "接受表單、註冊或登入前，把兩個值傳給 NexaCAPTCHA。", request: "輸入", successResponse: "輸出 · 成功", failureResponse: "輸出 · 失敗", important: "只有回傳 success: true 才能繼續。responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取。", completed: "驗證完成", footerTagline: "讓 Bot 必須付出更多成本的人類驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navTop: "トップ", navDemo: "デモ", navFeatures: "特徴", navSetup: "導入", navVerify: "結果を確認",
      heroEyebrow: "人を通し、BOT を止める", heroTitle: "人を通す。Bot には代償を。", heroLead: "NexaCAPTCHA は4文字を動く標的に変えます。人は自然に追えますが、Bot は毎回、アニメーション全体から不完全で歪んだ断片を追跡する必要があります。",
      tryIt: "試してみる", addToSite: "サイトに追加", noCleanFrame: "きれいな全体画像がない", changingMotion: "動きと形が変化", higherCost: "Bot の試行ごとに追加処理",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "移動する窓を追い、4文字すべてを入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "特徴", featuresTitle: "NexaCAPTCHA を使う理由", featuresLead: "ランダムな歪み、独立した動き、不完全な表示により、自動解読の処理コストが大幅に増えます。",
      featureIncompleteTitle: "意図的に不完全", featureIncompleteBody: "ほとんどの画面は断片だけで、毎回2～4文字が最後まで完全に表示されません。", featureDistortionTitle: "変化し続ける歪み", featureDistortionBody: "文字は曲がり、伸び、回転し、形を変え続けます。", featureMotionTitle: "独立した動き", featureMotionBody: "各文字は独自の方向と変化する速度で動きます。", featureWindowTitle: "予測しにくい表示窓", featureWindowBody: "表示形状は曲がり続け、加速、減速、後退しながら変化します。", featureUniqueTitle: "毎回異なる", featureUniqueBody: "動き、歪み、タイミング、隠される文字が CAPTCHA ごとに変わります。", featureCostTitle: "解読コストを大幅に増加", featureCostBody: "Bot は一枚の画像では足りず、多数の画面を調べ、断片を追跡して答えを再構成します。",
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
      ? "NexaCAPTCHA — 讓人類通過，讓 Bot 付出代價"
      : language === "ja"
        ? "NexaCAPTCHA — 人を通す、Bot には代償を"
        : "NexaCAPTCHA — Let humans through. Make bots pay.";
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
