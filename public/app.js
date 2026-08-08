(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navTop: "Home", navFeatures: "Features", navExperiment: "Experiment", navSetup: "Setup", navVerify: "Check the result",
      heroEyebrow: "HUMANS IN. BOTS HELD BACK.", heroTitle: "Let humans through. Make bots pay.", heroLead: "NexaCAPTCHA turns four characters into a moving target. People follow it naturally. Bots must chase incomplete, distorted pieces across the full animation—on every attempt.",
      tryIt: "Try it", addToSite: "Add to your site", noCleanFrame: "No clean all-character frame", changingMotion: "Smooth independent motion", higherCost: "More work per bot attempt",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", ready: "Ready", demoHelp: "Follow the moving window, then enter all four characters.", demoOutput: "Your result will appear here.",
      featuresEyebrow: "FEATURES", featuresTitle: "Why use NexaCAPTCHA?", featuresLead: "Readable intervals help people, while changing contours, decoy strokes, and slow color exchange make direct frame stacking unreliable.",
      experimentEyebrow: "SMALL-SCALE TEST", experimentTitle: "Fast for people. Expensive for AI.", experimentLead: "Average completion results for people and GPT 5.6 Sol - Medium across three verification systems.", experimentVersion: "Tested build", experimentHumanLabel: "Human", verificationSystem: "Verification system", secondsAverage: "seconds average", successRate: "success rate", experimentNote: "A documented small-scale test of the tested build. Results describe these runs and are not a security guarantee.",
      featureIncompleteTitle: "Readable in motion", featureIncompleteBody: "Each character gets a short clear interval, but no frame presents all four as one clean OCR target.", featureDistortionTitle: "Stable core, changing contours", featureDistortionBody: "The main skeleton stays readable while light outlines and brightness details change between frames.", featureMotionTitle: "Independent smooth movement", featureMotionBody: "Every character moves, rotates, and scales smoothly without instant jumps.", featureWindowTitle: "Moving decoy strokes", featureWindowBody: "Small nearby decorations remain harmless in one frame but create misleading contours when frames are stacked.", featureUniqueTitle: "Slow color exchange", featureUniqueBody: "Character colors transition gradually, preventing a fixed-color tracking shortcut while remaining easy to follow.", featureCostTitle: "Higher solving cost", featureCostBody: "Bots must align motion, reject decoys, and recover stable skeletons instead of reading or stacking one image.",
      setupEyebrow: "SETUP", setupTitle: "Add NexaCAPTCHA to your site", setupLead: "Copy these two pieces. No frontend framework is required.",
      loadTitle: "Paste this into your HTML", loadBody: "The Script loads NexaCAPTCHA. The Div chooses where it appears.", sendTitle: "Send the result with your form", sendBody: "Put this in your frontend JavaScript. Replace yourSubmitFunction with your existing submit function.",
      htmlLocation: "HTML · page markup", frontendLocation: "JavaScript · frontend", backendLocation: "Node.js · backend", valuesTitle: "Two values come back", idMeaning: "The ID of the completed CAPTCHA.", tokenMeaning: "Proof that it was completed. It works once.",
      verifyEyebrow: "SERVER CHECK", verifyTitle: "Check it on your server", verifyLead: "Before accepting the form, signup, or login, send both values to NexaCAPTCHA.", request: "Request", successResponse: "Response · success", failureResponse: "Response · failure", important: "Continue only when the response says success: true. A responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Verification complete", footerTagline: "Human verification that makes bots work harder."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navTop: "首頁", navFeatures: "特點", navExperiment: "實驗", navSetup: "串接", navVerify: "檢查結果",
      heroEyebrow: "讓人類通過，擋下 BOT", heroTitle: "讓人類通過，讓 Bot 付出代價。", heroLead: "NexaCAPTCHA 把四個字元變成持續移動的目標。人類能自然跟著閱讀；Bot 每次都必須在完整動畫中追蹤不完整、持續扭曲的片段。",
      tryIt: "立即試用", addToSite: "加入你的網站", noCleanFrame: "沒有四字同時清晰的畫面", changingMotion: "平順且獨立的移動", higherCost: "每次破解都要更多處理",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著移動窗口閱讀，然後輸入四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "特點", featuresTitle: "為什麼使用 NexaCAPTCHA？", featuresLead: "短暫清晰狀態方便人類閱讀；變動輪廓、誘餌筆畫和緩慢換色則讓直接疊幀不可靠。",
      experimentEyebrow: "正式小型測試", experimentTitle: "人類快速完成，AI 付出高昂成本。", experimentLead: "比較人類與 GPT 5.6 Sol - Medium 在三種驗證系統中的平均完成結果。", experimentVersion: "測試版本", experimentHumanLabel: "人類", verificationSystem: "驗證系統", secondsAverage: "秒平均完成", successRate: "成功率", experimentNote: "這是測試版本有紀錄的正式小型測試；結果只描述這些測試，不代表安全保證。",
      featureIncompleteTitle: "隨動畫清楚可讀", featureIncompleteBody: "每個字都有短暫清晰狀態，但不會在同一幀提供四字完整 OCR 目標。", featureDistortionTitle: "穩定骨架、變動輪廓", featureDistortionBody: "主要字形保持可讀，只有輕量外框與亮度細節隨影格改變。", featureMotionTitle: "各自平順移動", featureMotionBody: "每個字元獨立移動、旋轉和縮放，不會瞬間跳位。", featureWindowTitle: "移動中的誘餌筆畫", featureWindowBody: "單幀只是小裝飾，疊加多幀後則會形成誤導輪廓。", featureUniqueTitle: "緩慢交換顏色", featureUniqueBody: "字色漸進變化，避免固定顏色追蹤，同時仍方便人眼跟隨。", featureCostTitle: "大幅提高破解成本", featureCostBody: "Bot 必須對齊移動、排除誘餌並恢復穩定骨架，不能只讀取或疊加圖片。",
      setupEyebrow: "串接", setupTitle: "把 NexaCAPTCHA 加入你的網站", setupLead: "複製下面兩段即可，不需要前端框架。",
      loadTitle: "貼到你的 HTML", loadBody: "Script 載入 NexaCAPTCHA，Div 決定顯示位置。", sendTitle: "和表單一起送出結果", sendBody: "這段放在前端 JavaScript。將 yourSubmitFunction 換成你現有的表單提交函式。",
      htmlLocation: "HTML · 頁面", frontendLocation: "JavaScript · 前端", backendLocation: "Node.js · 後端", valuesTitle: "完成後會取得兩個值", idMeaning: "這次已完成 CAPTCHA 的 ID。", tokenMeaning: "完成驗證的證明，只能使用一次。",
      verifyEyebrow: "伺服器檢查", verifyTitle: "在你的伺服器確認結果", verifyLead: "接受表單、註冊或登入前，把兩個值傳給 NexaCAPTCHA。", request: "輸入", successResponse: "輸出 · 成功", failureResponse: "輸出 · 失敗", important: "只有回傳 success: true 才能繼續。responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取。", completed: "驗證完成", footerTagline: "讓 Bot 必須付出更多成本的人類驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navTop: "ホーム", navFeatures: "特徴", navExperiment: "実験", navSetup: "導入", navVerify: "結果を確認",
      heroEyebrow: "人を通し、BOT を止める", heroTitle: "人を通す。Bot には代償を。", heroLead: "NexaCAPTCHA は4文字を動く標的に変えます。人は自然に追えますが、Bot は毎回、アニメーション全体から不完全で歪んだ断片を追跡する必要があります。",
      tryIt: "試してみる", addToSite: "サイトに追加", noCleanFrame: "4文字が同時に鮮明なフレームなし", changingMotion: "滑らかで独立した動き", higherCost: "Bot の試行ごとに追加処理",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "移動する窓を追い、4文字すべてを入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "特徴", featuresTitle: "NexaCAPTCHA を使う理由", featuresLead: "短い鮮明な時間は人に読みやすく、変化する輪郭、デコイ線、緩やかな色交換は単純なフレーム合成を困難にします。",
      experimentEyebrow: "正式な小規模テスト", experimentTitle: "人には速く、AI には高コスト。", experimentLead: "3種類の認証システムで、人間と GPT 5.6 Sol - Medium の平均完了結果を比較しました。", experimentVersion: "テスト版", experimentHumanLabel: "人間", verificationSystem: "認証システム", secondsAverage: "秒（平均）", successRate: "成功率", experimentNote: "テスト版について記録した正式な小規模テストです。結果は今回の試行のみを示し、安全性を保証するものではありません。",
      featureIncompleteTitle: "動きの中で読みやすい", featureIncompleteBody: "各文字には短い鮮明な時間がありますが、4文字すべてを一枚で OCR できるフレームはありません。", featureDistortionTitle: "安定した骨格、変化する輪郭", featureDistortionBody: "主な字形は読みやすく保ち、軽い輪郭と明るさだけがフレーム間で変化します。", featureMotionTitle: "独立した滑らかな動き", featureMotionBody: "各文字は瞬間移動せず、滑らかに移動、回転、拡大縮小します。", featureWindowTitle: "移動するデコイ線", featureWindowBody: "単一フレームでは装飾ですが、合成すると誤解を招く輪郭になります。", featureUniqueTitle: "緩やかな色交換", featureUniqueBody: "色を徐々に変え、固定色だけで追跡する近道を防ぎながら目では追いやすくします。", featureCostTitle: "解読コストを大幅に増加", featureCostBody: "Bot は動きを整列し、デコイを除去し、安定した骨格を復元する必要があります。",
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
      ? "NexaCAPTCHA — 讓人類通過，讓 Bot 付出代價"
      : language === "ja"
        ? "NexaCAPTCHA — 人を通す、Bot には代償を"
        : "NexaCAPTCHA — Let humans through. Make bots pay.";
  }

  languageSelect.addEventListener("change", function () {
    applyLanguage(languageSelect.value);
    rememberLanguage(currentLanguage);
  });
  currentLanguage = storedLanguage();
  languageSelect.value = currentLanguage;
  applyLanguage(currentLanguage);

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
