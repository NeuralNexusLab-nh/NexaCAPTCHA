(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navTop: "Home", navFeatures: "How it works", navExperiment: "Results", navSetup: "Setup", navVerify: "Check the result",
      heroEyebrow: "HUMAN CHECKS, WITHOUT THE EASY FRAMES", heroTitleLine1: "Easy to follow", heroTitleLine2: "Hard to fake", heroLead: "People follow four colors. Automated solvers have to track the motion, separate the fragments and rebuild the answer.",
      tryIt: "Open the demo", addToSite: "Read the setup", noCleanFrame: "Readable in motion", changingMotion: "45.8% model success in our test", higherCost: "Two tries, then it expires",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", ready: "Ready", demoHelp: "Follow each color through the animation. Enter the four characters when you're ready.", demoOutput: "Your result will appear here.",
      featuresEyebrow: "HOW IT WORKS", featuresTitle: "Four colors for people. A reconstruction problem for bots.", featuresLead: "The check is meant to be watched, not frozen. People keep track of each color; a solver has to piece changing fragments together across time.",
      experimentEyebrow: "VERIFICATION TEST", experimentTitle: "What we saw in testing", experimentLead: "We timed people and GPT 5.6 Sol - Medium on three verification systems. These are the averages from those runs.", experimentVersion: "Tested build", experimentHumanLabel: "Human", verificationSystem: "Verification system", secondsAverage: "seconds average", successRate: "success rate", experimentNote: "This is a recorded test, not a promise that every model or every run will behave the same way.",
      featureIncompleteTitle: "No lucky screenshot", featureIncompleteBody: "A single frame never gives away a whole character. It only makes sense after you follow it for a moment.", featureDistortionTitle: "More than one thing moves", featureDistortionBody: "At least two characters stay active, so there is no tidy one-by-one sequence to collect.", featureMotionTitle: "Color keeps your place", featureMotionBody: "Each character keeps its own color, giving people a steady cue even when paths cross.", featureWindowTitle: "The pieces do not line up", featureWindowBody: "Visible fragments shift in position, angle and scale. Simple frame stacking leaves a messy result.", featureUniqueTitle: "Hard shapes stay split", featureUniqueBody: "Long strokes and closed loops appear in separate stages instead of revealing the shape at once.", featureCostTitle: "Different every run", featureCostBody: "Timing, paths and presentation are generated again for every verification.",
      setupEyebrow: "SETUP", setupTitle: "Add NexaCAPTCHA to your site", setupLead: "Copy these two pieces. No frontend framework is required.",
      loadTitle: "Paste this into your HTML", loadBody: "The Script loads NexaCAPTCHA. The Div chooses where it appears.", sendTitle: "Send the result with your form", sendBody: "Put this in your frontend JavaScript. Replace yourSubmitFunction with your existing submit function.",
      htmlLocation: "HTML · page markup", frontendLocation: "JavaScript · frontend", backendLocation: "Node.js · backend", valuesTitle: "Two values come back", idMeaning: "The ID of the completed CAPTCHA.", tokenMeaning: "Proof that it was completed. It works once.",
      verifyEyebrow: "SERVER CHECK", verifyTitle: "Check it on your server", verifyLead: "Before accepting the form, signup, or login, send both values to NexaCAPTCHA.", request: "Request", successResponse: "Response · success", failureResponse: "Response · failure", important: "Continue only when the response says success: true. A responseToken works once and expires after five minutes.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied.", copyFailure: "Could not copy. Select the code manually.", completed: "Verification complete", footerTagline: "A CAPTCHA people can follow, not just stare at."
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navTop: "首頁", navFeatures: "運作方式", navExperiment: "測試結果", navSetup: "串接", navVerify: "檢查結果",
      heroEyebrow: "不留簡單影格的人機驗證", heroTitleLine1: "人看得懂", heroTitleLine2: "機器沒那麼容易", heroLead: "真人跟著四種顏色就能讀出答案。自動化工具得先追蹤、分組，再把分散的筆畫拼回去。",
      tryIt: "開啟示範", addToSite: "查看串接方式", noCleanFrame: "跟著動畫就能讀", changingMotion: "測試中模型成功率 45.8%", higherCost: "答錯兩次即失效",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", ready: "可以開始", demoHelp: "跟著每個顏色看完整段動畫，準備好後輸入四個字元。", demoOutput: "驗證結果會顯示在這裡。",
      featuresEyebrow: "運作方式", featuresTitle: "真人跟著顏色看，機器得自己拼答案", featuresLead: "這段驗證是拿來看的，不是拿來截圖的。真人能持續追蹤顏色；自動化工具則得跨時間拼回不斷改變的片段。",
      experimentEyebrow: "驗證測試", experimentTitle: "我們實際測到的結果", experimentLead: "我們讓真人與 GPT 5.6 Sol - Medium 分別完成三種驗證。表格列出這些測試的平均結果。", experimentVersion: "測試版本", experimentHumanLabel: "真人", verificationSystem: "驗證系統", secondsAverage: "秒平均完成", successRate: "成功率", experimentNote: "這是已記錄的測試結果，不代表每個模型、每次執行都會得到相同數字。",
      featureIncompleteTitle: "沒有一張幸運截圖", featureIncompleteBody: "任何單一影格都不會直接交出完整字元。跟著看一小段時間，字才會在腦中成形。", featureDistortionTitle: "同時不只一個字在動", featureDistortionBody: "畫面中至少會有兩個字元保持活動，不會排好隊讓工具逐字擷取。", featureMotionTitle: "顏色幫你認路", featureMotionBody: "每個字元維持自己的顏色。路徑交錯時，真人仍能知道自己正在追哪一個字。", featureWindowTitle: "片段不會整齊對上", featureWindowBody: "可見部分會改變位置、角度和大小。直接把影格疊起來，只會得到一團混亂。", featureUniqueTitle: "難辨字形拆開出現", featureUniqueBody: "長直線與封閉圓環分成不同階段，不會一次露出整個關鍵結構。", featureCostTitle: "每次重新產生", featureCostBody: "時間、路徑和呈現方式會在每次驗證重新生成。",
      setupEyebrow: "串接", setupTitle: "把 NexaCAPTCHA 加入你的網站", setupLead: "複製下面兩段即可，不需要前端框架。",
      loadTitle: "貼到你的 HTML", loadBody: "Script 載入 NexaCAPTCHA，Div 決定顯示位置。", sendTitle: "和表單一起送出結果", sendBody: "這段放在前端 JavaScript。將 yourSubmitFunction 換成你現有的表單提交函式。",
      htmlLocation: "HTML · 頁面", frontendLocation: "JavaScript · 前端", backendLocation: "Node.js · 後端", valuesTitle: "完成後會取得兩個值", idMeaning: "這次已完成 CAPTCHA 的 ID。", tokenMeaning: "完成驗證的證明，只能使用一次。",
      verifyEyebrow: "伺服器檢查", verifyTitle: "在你的伺服器確認結果", verifyLead: "接受表單、註冊或登入前，把兩個值傳給 NexaCAPTCHA。", request: "輸入", successResponse: "輸出 · 成功", failureResponse: "輸出 · 失敗", important: "只有回傳 success: true 才能繼續。responseToken 只能使用一次，並在五分鐘後失效。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法複製，請手動選取。", completed: "驗證完成", footerTagline: "跟著顏色就能完成的人機驗證。"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navTop: "ホーム", navFeatures: "仕組み", navExperiment: "テスト結果", navSetup: "導入", navVerify: "結果を確認",
      heroEyebrow: "簡単な一枚を残さない本人確認", heroTitleLine1: "人には追いやすく", heroTitleLine2: "自動化には手強く", heroLead: "人は4色を追えば答えを読めます。自動解読には、動きを追跡し、断片を分け、文字を組み直す処理が必要です。",
      tryIt: "デモを開く", addToSite: "導入方法を見る", noCleanFrame: "動きを追えば読める", changingMotion: "テスト時のモデル成功率 45.8%", higherCost: "2回間違えると失効",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", ready: "準備完了", demoHelp: "色ごとに動きを追い、分かった4文字を入力してください。", demoOutput: "認証結果がここに表示されます。",
      featuresEyebrow: "仕組み", featuresTitle: "人は色を追い、自動化は断片を組み直す", featuresLead: "この認証は、一枚を止めて読むのではなく、流れを見て解く設計です。人は色を手掛かりにできますが、自動化には時間をまたいだ再構成が必要です。",
      experimentEyebrow: "検証テスト", experimentTitle: "実際のテスト結果", experimentLead: "人と GPT 5.6 Sol - Medium が3種類の認証を行い、その平均をまとめました。", experimentVersion: "テスト版", experimentHumanLabel: "人", verificationSystem: "認証システム", secondsAverage: "秒（平均）", successRate: "成功率", experimentNote: "記録したテストの結果であり、すべてのモデルや実行で同じ数値になることを保証するものではありません。",
      featureIncompleteTitle: "一枚だけでは読めない", featureIncompleteBody: "どのフレームにも文字全体は出ません。少しの間、色を追って初めて形が見えてきます。", featureDistortionTitle: "複数の文字が同時に動く", featureDistortionBody: "常に少なくとも2文字が動き、順番に一文字ずつ収集できる流れを作りません。", featureMotionTitle: "色が目印になる", featureMotionBody: "文字ごとに色を保つため、軌跡が交差しても人は追う対象を見失いにくくなります。", featureWindowTitle: "断片がきれいに重ならない", featureWindowBody: "見える位置、角度、大きさが変わり、単純なフレーム合成では形が崩れます。", featureUniqueTitle: "決め手になる形を分割", featureUniqueBody: "長い直線や閉じた輪は別々の段階で現れ、構造を一度に見せません。", featureCostTitle: "毎回作り直す", featureCostBody: "時間、軌跡、見せ方は認証のたびに生成し直されます。",
      setupEyebrow: "導入", setupTitle: "NexaCAPTCHA をサイトに追加", setupLead: "次の二つをコピーするだけです。フロントエンドフレームワークは不要です。",
      loadTitle: "HTML に貼り付ける", loadBody: "Script が NexaCAPTCHA を読み込み、Div が表示位置を決めます。", sendTitle: "フォームと一緒に結果を送る", sendBody: "フロントエンド JavaScript に置き、yourSubmitFunction を既存の送信関数に置き換えます。",
      htmlLocation: "HTML · ページ", frontendLocation: "JavaScript · フロントエンド", backendLocation: "Node.js · バックエンド", valuesTitle: "完了後に二つの値を取得", idMeaning: "完了した CAPTCHA の ID です。", tokenMeaning: "完了した証明で、一度だけ使えます。",
      verifyEyebrow: "サーバー確認", verifyTitle: "サーバーで結果を確認", verifyLead: "フォーム、登録、ログインを受け付ける前に二つの値を NexaCAPTCHA へ送ります。", request: "リクエスト", successResponse: "レスポンス · 成功", failureResponse: "レスポンス · 失敗", important: "success: true の場合だけ続行してください。responseToken は一度だけ使用でき、5分で失効します。",
      copy: "コピー", copied: "コピー済み", copySuccess: "コードをコピーしました。", copyFailure: "コピーできませんでした。手動で選択してください。", completed: "認証完了", footerTagline: "色を追って解く、人のための CAPTCHA。"
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
      ? "NexaCAPTCHA — 人看得懂，機器沒那麼容易"
      : language === "ja"
        ? "NexaCAPTCHA — 人には追いやすく、自動化には手強く"
        : "NexaCAPTCHA — Easy to follow. Hard to fake.";
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
