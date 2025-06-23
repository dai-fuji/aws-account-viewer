// 検証用アカウントID（ここに実際のアカウントIDを設定してください）
const VALID_ACCOUNT_IDS = [
  "571705099822", // 例：検証用アカウントID
  // 必要に応じて複数のアカウントIDを追加できます
];

// 警告メッセージの設定
const WARNING_MESSAGE =
  "⚠️ 注意：検証用アカウントではありません。作業内容を確認してください。";

// 要素のID定数
const WARNING_ID = "aws-account-warning";
const FOOTER_ID = "aws-extension-footer";

// 拡張機能の有効状態を管理する変数
let extensionEnabled = true;

// 現在のアカウント情報を保存する変数
let currentAccountInfo = {
  detected: false,
  accountId: null,
  isValid: false,
};

// 警告が手動で閉じられた状態を管理する変数
let warningManuallyClosed = false;
let lastCheckedAccountId = null;

// ストレージから拡張機能の有効状態を読み込む
async function loadExtensionState() {
  try {
    if (typeof chrome === "undefined" || !chrome.storage) {
      extensionEnabled = true;
      return;
    }

    const result = await chrome.storage.sync.get(["extensionEnabled"]);
    extensionEnabled = result.extensionEnabled !== false;
  } catch (error) {
    console.error("設定の読み込みに失敗しました:", error);
    extensionEnabled = true;
  }
}

// フッタ要素を作成する関数
function createFooterElement() {
  const footer = document.createElement("div");
  footer.id = FOOTER_ID;
  footer.className = "aws-extension-footer";

  const statusIcon = document.createElement("span");
  statusIcon.className = "aws-extension-status-icon";
  statusIcon.innerHTML = "🛡️";

  const message = document.createElement("span");
  message.className = "aws-extension-status-text";
  message.textContent = "AWS Account Warning が有効です";

  footer.appendChild(statusIcon);
  footer.appendChild(message);

  return footer;
}

// フッタを表示する関数
function showFooter() {
  if (!extensionEnabled) {
    return;
  }

  let footer = document.getElementById(FOOTER_ID);
  if (!footer) {
    footer = createFooterElement();
    if (document.body) {
      document.body.appendChild(footer);
    }
  }

  if (footer) {
    footer.style.display = "flex";
  }
}

// フッタを非表示にする関数
function hideFooter() {
  const footer = document.getElementById(FOOTER_ID);
  if (footer) {
    footer.style.display = "none";
    footer.style.visibility = "hidden";
    footer.style.opacity = "0";
  }
}

// ポップアップからのメッセージを受信
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      if (request.action === "toggleExtension") {
        extensionEnabled = request.enabled;

        // 警告のトグルスイッチも連動させる
        const warning = document.getElementById(WARNING_ID);
        if (warning) {
          const toggleInput = warning.querySelector(".warning-toggle-input");
          if (toggleInput) {
            toggleInput.checked = extensionEnabled;
          }
        }

        if (!extensionEnabled) {
          hideWarning();
          hideFooter();

          // フッタを完全に削除
          const footer = document.getElementById(FOOTER_ID);
          if (footer) {
            footer.remove();
          }
        } else {
          // 拡張機能が有効化された時は警告状態をリセット
          warningManuallyClosed = false;
          lastCheckedAccountId = null;
          showFooter();
          checkAccountId();
        }

        sendResponse({ success: true, message: "状態変更完了" });
        return true;
      }

      if (request.action === "getAccountInfo") {
        updateAccountInfo();
        sendResponse({
          success: true,
          accountInfo: currentAccountInfo,
        });
        return true;
      }

      sendResponse({ success: false, message: "未知のアクション" });
    } catch (error) {
      console.error("メッセージ処理中にエラーが発生しました:", error);
      sendResponse({
        success: false,
        message: "エラーが発生しました",
        error: error.message,
      });
    }

    return true;
  });
}

// アカウントIDを抽出する関数
function extractAccountId(text) {
  const match = text.match(/\d{4}-\d{4}-\d{4}/);
  if (match) {
    return match[0].replace(/-/g, "");
  }
  return null;
}

// アカウント情報を更新する関数
function updateAccountInfo() {
  const accountElements = document.querySelectorAll(".freeTierNotOkay");

  // 初期化
  currentAccountInfo = {
    detected: false,
    accountId: null,
    isValid: false,
  };

  for (const element of accountElements) {
    const accountText = element.textContent;
    const accountId = extractAccountId(accountText);

    if (accountId) {
      currentAccountInfo.detected = true;
      currentAccountInfo.accountId = accountId;
      currentAccountInfo.isValid = VALID_ACCOUNT_IDS.includes(accountId);
      return;
    }
  }
}

// 警告要素を作成する関数
function createWarningElement() {
  const warning = document.createElement("div");
  warning.id = WARNING_ID;
  warning.className = "aws-account-warning";

  const message = document.createElement("span");
  message.className = "warning-message";
  message.textContent = WARNING_MESSAGE;

  // トグルスイッチコンテナ
  const toggleContainer = document.createElement("div");
  toggleContainer.className = "warning-toggle-container";

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "warning-toggle-label";

  const toggleText = document.createElement("span");
  toggleText.className = "warning-toggle-text";
  toggleText.textContent = "有効";

  const toggleSwitch = document.createElement("div");
  toggleSwitch.className = "warning-toggle-switch";

  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.id = "warningToggle";
  toggleInput.className = "warning-toggle-input";
  toggleInput.checked = extensionEnabled; // 拡張機能の有効状態に合わせる

  const slider = document.createElement("span");
  slider.className = "warning-slider";

  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(slider);

  toggleLabel.appendChild(toggleText);
  toggleLabel.appendChild(toggleSwitch);
  toggleContainer.appendChild(toggleLabel);

  warning.appendChild(message);
  warning.appendChild(toggleContainer);

  return warning;
}

// 警告を表示する関数
function showWarning() {
  if (!extensionEnabled) {
    return;
  }

  let warning = document.getElementById(WARNING_ID);
  if (!warning) {
    warning = createWarningElement();
    document.body.appendChild(warning);
  }

  warning.style.display = "flex";
  // トグルスイッチを拡張機能の有効状態に合わせる
  const toggleInput = warning.querySelector(".warning-toggle-input");
  if (toggleInput) {
    toggleInput.checked = extensionEnabled;
  }
}

// 警告を非表示にする関数
function hideWarning() {
  const warning = document.getElementById(WARNING_ID);
  if (warning) {
    warning.style.display = "none";
  }
}

// アカウントIDをチェックする関数
function checkAccountId() {
  if (!extensionEnabled) {
    // フッタを完全に削除
    const footer = document.getElementById(FOOTER_ID);
    if (footer) {
      footer.remove();
    }
    hideWarning();
    return;
  }

  // フッタを常に表示（拡張機能が有効な場合）
  showFooter();

  // アカウント情報を更新
  updateAccountInfo();

  // アカウントが変更された場合は警告状態をリセット
  if (lastCheckedAccountId !== currentAccountInfo.accountId) {
    warningManuallyClosed = false;
    lastCheckedAccountId = currentAccountInfo.accountId;
  }

  // 警告表示の判定
  if (currentAccountInfo.detected) {
    if (!currentAccountInfo.isValid && !warningManuallyClosed) {
      // 手動で閉じられていない場合のみ表示
      showWarning();
    } else if (currentAccountInfo.isValid) {
      hideWarning();
      warningManuallyClosed = false; // 有効なアカウントの場合は状態をリセット
    }
  } else {
    hideWarning();
    warningManuallyClosed = false; // アカウントが検出されない場合は状態をリセット
  }
}

// イベントリスナーを設定する関数
function setupEventListeners() {
  document.addEventListener("change", async (e) => {
    if (e.target.classList.contains("warning-toggle-input")) {
      const isChecked = e.target.checked;

      // 拡張機能の有効状態を更新
      extensionEnabled = isChecked;

      // Chrome storageに保存
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          await chrome.storage.sync.set({ extensionEnabled: isChecked });
        }
      } catch (error) {
        console.error("設定の保存に失敗しました:", error);
      }

      if (isChecked) {
        // 拡張機能を有効化
        warningManuallyClosed = false;
        lastCheckedAccountId = null;
        showFooter();
        checkAccountId();
      } else {
        // 拡張機能を無効化
        hideWarning();
        hideFooter();

        // フッタを完全に削除
        const footer = document.getElementById(FOOTER_ID);
        if (footer) {
          footer.remove();
        }
      }
    }
  });
}

// メイン処理
async function init() {
  try {
    // 拡張機能の有効状態を読み込む
    await loadExtensionState();

    // 初期チェック
    checkAccountId();

    // イベントリスナーを設定
    setupEventListeners();

    // MutationObserverを使用してDOMの変更を監視
    try {
      const observer = new MutationObserver((mutations) => {
        try {
          for (const mutation of mutations) {
            if (mutation.type === "childList") {
              if (extensionEnabled) {
                checkAccountId();
              } else {
                const footer = document.getElementById(FOOTER_ID);
                if (footer) {
                  footer.remove();
                }
              }
            }
          }
        } catch (error) {
          console.error("MutationObserver処理中にエラーが発生しました:", error);
        }
      });

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    } catch (error) {
      console.error("MutationObserverの設定でエラーが発生しました:", error);
    }

    // 定期的にもチェック
    setInterval(() => {
      try {
        if (extensionEnabled) {
          checkAccountId();
        } else {
          const footer = document.getElementById(FOOTER_ID);
          if (footer) {
            footer.remove();
          }
        }
      } catch (error) {
        console.error("定期チェックでエラーが発生しました:", error);
      }
    }, 5000);
  } catch (error) {
    console.error("拡張機能の初期化中にエラーが発生しました:", error);
  }
}

// ページが読み込まれた後に実行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
