(function () {
  "use strict";

  var translations = {
    en: {
      skip: "Skip to content", languageLabel: "Language", navDifference: "Difference", navDemo: "Demo", navIntegration: "Integration", navApi: "API",
      heroEyebrow: "TEMPORAL HUMAN VERIFICATION", heroTitle: "Built for human perception.", heroLead: "NexaCAPTCHA reveals readable fragments over time. People combine them naturally; automated systems must extract, align, track, and reconstruct the sequence before recognition.",
      tryDemo: "Try the demo", viewIntegration: "View integration", highlightReadable: "Human-readable reveal", highlightExpiry: "3-minute verification window", highlightToken: "Single-use token",
      liveDemo: "LIVE DEMO", tryNexa: "Try NexaCAPTCHA", liveApi: "Live API", demoHelp: "Watch the wider moving reveal, then enter all four uppercase letters or digits.", demoOutput: "Complete the verification to see the browser output.",
      differenceEyebrow: "WHY IT IS DIFFERENT", differenceTitle: "Recognition requires time, not one screenshot.", differenceLead: "Traditional image CAPTCHAs expose the complete text at once. NexaCAPTCHA distributes useful visual context across a changing sequence.",
      staticLabel: "Static CAPTCHA", staticTitle: "One image contains the answer.", staticBody: "An OCR pipeline can crop, denoise, segment, and recognize a single stable frame.", nexaTitle: "Meaning is distributed over time.", nexaBody: "Automation must sample frames, align motion, track changing glyph fragments, undo deformation, reconstruct characters, and only then run recognition.",
      costTitle: "Why automated solving costs more", costBody: "A model cannot rely on one clean input. It needs a temporal pipeline and more inference work per verification. NexaCAPTCHA is not “AI-proof”; it is designed to make reliable automation less direct and more expensive.",
      threeSteps: "THREE STEPS", howTitle: "A short integration path", stepLoad: "Load", stepLoadBody: "Add one hosted script and one mount point.", stepVerify: "Verify", stepVerifyBody: "The user reads four uppercase letters or digits over time.", stepConfirm: "Confirm", stepConfirmBody: "Your backend confirms and consumes the response token.",
      integrationEyebrow: "INTEGRATION", integrationTitle: "Add NexaCAPTCHA", integrationLead: "The loader creates the complete isolated interface inside your mount point.", embedTitle: "Embed the widget", embedBody: "Place this markup where verification should appear.", receiveTitle: "Receive browser output", receiveBody: "The callback returns a verification ID and one-time token after success.",
      browserOutput: "Browser output", fieldMeaning: "Field meaning", fieldSuccess: "True only after the text was entered correctly.", fieldId: "Public identifier passed to your backend.", fieldToken: "32-character token that expires after five minutes and works once.",
      apiEyebrow: "HTTP API", apiTitle: "Every request and response, explicitly defined.", apiLead: "All endpoints use JSON except the animation response. No site key or authorization header is required.", createVerification: "Create verification", submitAnswer: "Submit answer", confirmBackend: "Confirm from your backend", input: "Input", output: "Output", outputSuccess: "Output · success", outputIncorrect: "Output · incorrect",
      nodeExample: "Node.js verification example", nodeExampleBody: "Call the public confirmation endpoint before accepting signup, login, or form submission.", backendRequired: "Backend confirmation is required", backendRequiredBody: "Never trust browser completion alone. Accept the protected action only after siteverify returns success.",
      openEyebrow: "OPEN BY DESIGN", openTitle: "Inspect it. Run it. Improve it.", openBody: "NexaCAPTCHA is developed in public with transparent protocol, security, and resource limits.", viewGithub: "View on GitHub", footerTagline: "Temporal verification designed for human perception.",
      copy: "Copy", copied: "Copied", copySuccess: "Code copied to clipboard.", copyFailure: "Code could not be copied. Select it manually.", completed: "Completed"
    },
    "zh-Hant": {
      skip: "跳到主要內容", languageLabel: "語言", navDifference: "技術差異", navDemo: "示範", navIntegration: "串接", navApi: "API",
      heroEyebrow: "跨時間的人類驗證", heroTitle: "為人類視覺而設計。", heroLead: "NexaCAPTCHA 讓可辨識的文字片段隨時間出現。人類能自然整合這些資訊；自動化系統則必須先擷取、對齊、追蹤並重建整段序列。",
      tryDemo: "立即試用", viewIntegration: "查看串接方式", highlightReadable: "更容易辨識的顯示範圍", highlightExpiry: "3 分鐘驗證時間", highlightToken: "一次性 Token",
      liveDemo: "即時示範", tryNexa: "試用 NexaCAPTCHA", liveApi: "真實 API", demoHelp: "觀察較寬的移動顯示範圍，輸入四個大寫英文字母或數字。", demoOutput: "完成驗證後，這裡會顯示瀏覽器輸出。",
      differenceEyebrow: "技術差異", differenceTitle: "辨識需要整合時間，而不是只看一張截圖。", differenceLead: "傳統圖片 CAPTCHA 會在單一畫面顯示完整文字；NexaCAPTCHA 將有效視覺資訊分布在持續變化的序列中。",
      staticLabel: "靜態 CAPTCHA", staticTitle: "一張圖片就包含完整答案。", staticBody: "OCR 流程可以直接裁切、去雜訊、分割並辨識單一穩定畫面。", nexaTitle: "有效資訊分布在時間序列中。", nexaBody: "自動化系統必須取樣影格、對齊移動、追蹤變形的文字片段、還原字形，最後才能進行辨識。",
      costTitle: "為什麼自動化辨識成本更高", costBody: "模型不能只依賴一張乾淨圖片，而需要額外的時間序列處理與更多推論工作。NexaCAPTCHA 並非宣稱 AI 無法破解，而是讓穩定自動化變得較不直接、成本更高。",
      threeSteps: "三個步驟", howTitle: "簡短清楚的串接流程", stepLoad: "載入", stepLoadBody: "加入一個 Script 和一個掛載位置。", stepVerify: "驗證", stepVerifyBody: "使用者隨時間辨識四個大寫字母或數字。", stepConfirm: "確認", stepConfirmBody: "網站後端確認並消耗一次性 Token。",
      integrationEyebrow: "串接方式", integrationTitle: "加入 NexaCAPTCHA", integrationLead: "Loader 會在指定位置建立完整且隔離的驗證介面。", embedTitle: "嵌入元件", embedBody: "將這段標記放在需要顯示驗證的位置。", receiveTitle: "接收瀏覽器輸出", receiveBody: "成功後 Callback 會回傳 Verification ID 與一次性 Token。",
      browserOutput: "瀏覽器輸出", fieldMeaning: "欄位說明", fieldSuccess: "只有正確輸入文字後才會是 true。", fieldId: "傳給網站後端的公開識別碼。", fieldToken: "32 字元、五分鐘後失效且只能使用一次的 Token。",
      apiEyebrow: "HTTP API", apiTitle: "明確定義每個輸入與輸出。", apiLead: "除了動畫回應以外，所有 Endpoint 都使用 JSON。不需要 Site Key 或 Authorization Header。", createVerification: "建立驗證", submitAnswer: "提交答案", confirmBackend: "由網站後端確認", input: "輸入", output: "輸出", outputSuccess: "輸出 · 成功", outputIncorrect: "輸出 · 錯誤",
      nodeExample: "Node.js 驗證範例", nodeExampleBody: "允許註冊、登入或送出表單前，先呼叫公開確認 Endpoint。", backendRequired: "必須由後端確認", backendRequiredBody: "不能只相信瀏覽器顯示完成；只有 siteverify 回傳 success 後才能接受受保護操作。",
      openEyebrow: "公開設計", openTitle: "檢視、執行、改進。", openBody: "NexaCAPTCHA 公開開發，協定、安全邊界與資源限制都能被檢視。", viewGithub: "前往 GitHub", footerTagline: "為人類感知設計的跨時間驗證。",
      copy: "複製", copied: "已複製", copySuccess: "程式碼已複製。", copyFailure: "無法自動複製，請手動選取。", completed: "已完成"
    },
    ja: {
      skip: "メインコンテンツへ移動", languageLabel: "言語", navDifference: "違い", navDemo: "デモ", navIntegration: "導入", navApi: "API",
      heroEyebrow: "時間軸を使った人間認証", heroTitle: "人間の知覚のために設計。", heroLead: "NexaCAPTCHA は読み取れる文字の断片を時間とともに表示します。人は自然に統合できますが、自動化システムには抽出、整列、追跡、再構成が必要です。",
      tryDemo: "デモを試す", viewIntegration: "導入方法を見る", highlightReadable: "人が読みやすい表示", highlightExpiry: "3 分間の認証時間", highlightToken: "一度だけ使えるトークン",
      liveDemo: "ライブデモ", tryNexa: "NexaCAPTCHA を試す", liveApi: "実際の API", demoHelp: "広くなった移動表示を見て、4 文字の大文字英字または数字を入力してください。", demoOutput: "認証を完了すると、ブラウザー出力が表示されます。",
      differenceEyebrow: "技術的な違い", differenceTitle: "認識に必要なのは一枚の画像ではなく、時間です。", differenceLead: "従来の画像 CAPTCHA は一画面に全文字を表示します。NexaCAPTCHA は有効な視覚情報を変化する時間列に分散させます。",
      staticLabel: "静止画 CAPTCHA", staticTitle: "一枚の画像に答えが含まれます。", staticBody: "OCR は安定した一枚の画像を切り出し、ノイズ除去、分割、認識できます。", nexaTitle: "意味は時間の中に分散します。", nexaBody: "自動化にはフレームの取得、動きの整列、変形する断片の追跡、文字の再構成、その後の認識が必要です。",
      costTitle: "自動認識のコストが高くなる理由", costBody: "モデルは一枚のきれいな入力だけに頼れず、時間処理と追加の推論が必要です。NexaCAPTCHA は「AI に解けない」と主張するものではなく、安定した自動化をより複雑で高コストにする設計です。",
      threeSteps: "3 ステップ", howTitle: "短く明確な導入手順", stepLoad: "読み込み", stepLoadBody: "一つの Script と一つの表示場所を追加します。", stepVerify: "認証", stepVerifyBody: "利用者が時間とともに4文字の英大文字または数字を読み取ります。", stepConfirm: "確認", stepConfirmBody: "バックエンドがレスポンストークンを確認して消費します。",
      integrationEyebrow: "導入", integrationTitle: "NexaCAPTCHA を追加", integrationLead: "ローダーが指定位置に完全で分離された認証 UI を作成します。", embedTitle: "ウィジェットを埋め込む", embedBody: "認証を表示したい場所にこのマークアップを置きます。", receiveTitle: "ブラウザー出力を受け取る", receiveBody: "成功すると Verification ID と一度だけ使えるトークンが返ります。",
      browserOutput: "ブラウザー出力", fieldMeaning: "フィールドの意味", fieldSuccess: "文字を正しく入力した場合のみ true です。", fieldId: "バックエンドへ渡す公開識別子です。", fieldToken: "32文字、5分で失効し、一度だけ使えるトークンです。",
      apiEyebrow: "HTTP API", apiTitle: "すべての入力と出力を明確に定義。", apiLead: "アニメーション以外のすべてのエンドポイントは JSON を使用します。Site Key や Authorization Header は不要です。", createVerification: "認証を作成", submitAnswer: "回答を送信", confirmBackend: "バックエンドから確認", input: "入力", output: "出力", outputSuccess: "出力 · 成功", outputIncorrect: "出力 · 不正解",
      nodeExample: "Node.js 確認例", nodeExampleBody: "登録、ログイン、フォーム送信を受け付ける前に公開確認エンドポイントを呼び出します。", backendRequired: "バックエンド確認が必要です", backendRequiredBody: "ブラウザーの完了表示だけを信用せず、siteverify が success を返した後だけ処理を受け付けてください。",
      openEyebrow: "公開された設計", openTitle: "確認し、実行し、改善する。", openBody: "NexaCAPTCHA はプロトコル、セキュリティ、リソース制限を公開して開発されています。", viewGithub: "GitHub で見る", footerTagline: "人間の知覚のために設計された時間認証。",
      copy: "コピー", copied: "コピー済み", copySuccess: "コードをコピーしました。", copyFailure: "自動コピーに失敗しました。手動で選択してください。", completed: "完了"
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
      if (key && text(key)) element.textContent = text(key);
    });
    document.title = language === "zh-Hant"
      ? "NexaCAPTCHA — 為人類視覺而設計"
      : language === "ja"
        ? "NexaCAPTCHA — 人間の知覚のために設計"
        : "NexaCAPTCHA — Built for human perception";
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

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (element) {
      element.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
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
    var value = document.createElement("span");
    value.textContent = text("completed") + " · " + result.verificationId;
    output.append(icon, value);
  };
})();
