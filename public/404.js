(function () {
  "use strict";

  var translations = {
    en: {
      navigationLabel: "Main navigation",
      homeLabel: "NexaCAPTCHA home",
      languageLabel: "Language",
      home: "Home",
      eyebrow: "ROUTE NOT FOUND",
      title: "This route ends here.",
      description: "The address may have changed, or the page may no longer exist.",
      returnHome: "Return home",
      viewModules: "View CAPTCHA modules",
      footer: "Human verification, engineered for resistance.",
      documentTitle: "Page not found · NexaCAPTCHA"
    },
    "zh-Hant": {
      navigationLabel: "主要導覽",
      homeLabel: "NexaCAPTCHA 首頁",
      languageLabel: "語言",
      home: "首頁",
      eyebrow: "找不到路徑",
      title: "這條路到此為止。",
      description: "網址可能已經變更，或這個頁面已不存在。",
      returnHome: "返回首頁",
      viewModules: "查看 CAPTCHA 模組",
      footer: "為提高自動化破解成本而設計的人機驗證。",
      documentTitle: "找不到頁面 · NexaCAPTCHA"
    },
    ja: {
      navigationLabel: "メインナビゲーション",
      homeLabel: "NexaCAPTCHA ホーム",
      languageLabel: "言語",
      home: "ホーム",
      eyebrow: "ルートが見つかりません",
      title: "このルートはここで終わりです。",
      description: "URLが変更されたか、ページが存在しない可能性があります。",
      returnHome: "ホームに戻る",
      viewModules: "CAPTCHAモジュールを見る",
      footer: "自動解析への耐性を追求した本人確認。",
      documentTitle: "ページが見つかりません · NexaCAPTCHA"
    }
  };
  var storageKey = "nexacaptcha-language";
  var languageSelect = document.getElementById("language-select");
  var pathOutput = document.getElementById("not-found-path");

  function storedLanguage() {
    try {
      var language = window.localStorage.getItem(storageKey);
      return Object.prototype.hasOwnProperty.call(translations, language) ? language : "en";
    } catch (_) {
      return "en";
    }
  }

  function applyLanguage(language) {
    if (!Object.prototype.hasOwnProperty.call(translations, language)) language = "en";
    var text = translations[language];
    document.documentElement.lang = language;
    document.title = text.documentTitle;
    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      var key = element.dataset.i18n;
      if (key && text[key]) element.textContent = text[key];
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (element) {
      var key = element.dataset.i18nAriaLabel;
      if (key && text[key]) element.setAttribute("aria-label", text[key]);
    });
    languageSelect.value = language;
  }

  languageSelect.addEventListener("change", function () {
    applyLanguage(languageSelect.value);
    try {
      window.localStorage.setItem(storageKey, languageSelect.value);
    } catch (_) {
      // Language selection still works when storage is unavailable.
    }
  });

  pathOutput.textContent = window.location.pathname + window.location.search;
  applyLanguage(storedLanguage());
})();
