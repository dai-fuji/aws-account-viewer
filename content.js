// 検証用アカウントID（ここに実際のアカウントIDを設定してください）
const VALID_ACCOUNT_IDS = [
  "121212121212", // 例：検証用アカウントID
  // 必要に応じて複数のアカウントIDを追加できます
];

// 警告メッセージの設定
const WARNING_MESSAGE =
  "⚠️ 注意：検証用アカウントではありません。作業内容を確認してください。";

// 警告要素のID
const WARNING_ID = "aws-account-warning";

// フッタ要素のID
const FOOTER_ID = "aws-extension-footer";

// 拡張機能の有効状態を管理する変数
let extensionEnabled = true;

// 現在のアカウント情報を保存する変数
let currentAccountInfo = {
  detected: false,
  accountId: null,
  isValid: false,
};

console.log("=== AWS Account Warning 拡張機能開始 ===");
console.log("現在のURL:", window.location.href);

// ストレージから拡張機能の有効状態を読み込む
async function loadExtensionState() {
  try {
    if (typeof chrome === "undefined" || !chrome.storage) {
      console.log("Chrome拡張機能のAPIが利用できません");
      extensionEnabled = true;
      return;
    }

    const result = await chrome.storage.sync.get(["extensionEnabled"]);
    extensionEnabled = result.extensionEnabled !== false;
    console.log("拡張機能の状態:", extensionEnabled ? "有効" : "無効");
  } catch (error) {
    console.log("設定の読み込みに失敗しました:", error);
    extensionEnabled = true;
  }
}

// フッタ要素を作成する関数
function createFooterElement() {
  console.log("フッタ要素を作成中...");
  const footer = document.createElement("div");
  footer.id = FOOTER_ID;
  footer.className = "aws-extension-footer";

  // 直接的なスタイル設定で確実に表示
  footer.style.cssText = `
    position: fixed !important;
    bottom: 0px !important;
    right: 20px !important;
    z-index: 999999 !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
    color: white !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -2px 12px rgba(40, 167, 69, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-bottom: none;
    opacity: 0.9 !important;
    transition: all 0.2s ease;
    width: auto !important;
    height: auto !important;
    visibility: visible !important;
    pointer-events: auto !important;
  `;

  const statusIcon = document.createElement("span");
  statusIcon.className = "aws-extension-status-icon";
  statusIcon.innerHTML = "🛡️";
  statusIcon.style.cssText = "font-size: 14px; animation: pulse 3s infinite;";

  const message = document.createElement("span");
  message.className = "aws-extension-status-text";
  message.textContent = "AWS Account Warning が有効です";
  message.style.cssText =
    "text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); white-space: nowrap;";

  footer.appendChild(statusIcon);
  footer.appendChild(message);

  console.log("フッタ要素が作成されました");
  return footer;
}

// フッタを表示する関数
function showFooter() {
  console.log(
    "showFooter関数が呼ばれました。extensionEnabled:",
    extensionEnabled
  );

  if (!extensionEnabled) {
    console.log("拡張機能が無効のため、フッタを表示しません");
    return;
  }

  let footer = document.getElementById(FOOTER_ID);
  if (!footer) {
    console.log("フッタが存在しないため、新しく作成します");
    footer = createFooterElement();

    if (document.body) {
      document.body.appendChild(footer);
      console.log("フッタをbodyに追加しました");
    } else {
      console.log("document.bodyが存在しません");
    }
  }

  if (footer) {
    footer.style.display = "flex";
    console.log("フッタを表示しました");
  }
}

// フッタを非表示にする関数
function hideFooter() {
  console.log("hideFooter関数が呼ばれました");
  const footer = document.getElementById(FOOTER_ID);
  if (footer) {
    footer.style.display = "none";
    footer.style.visibility = "hidden";
    footer.style.opacity = "0";
    console.log("フッタを非表示にしました");
  } else {
    console.log("フッタが見つかりませんでした");
  }
}

// ポップアップからのメッセージを受信
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      console.log("メッセージを受信しました:", request);

      if (request.action === "toggleExtension") {
        extensionEnabled = request.enabled;
        console.log(
          "拡張機能の状態が変更されました:",
          extensionEnabled ? "有効" : "無効"
        );

        if (!extensionEnabled) {
          // 無効化された場合は警告とフッタを非表示
          console.log("拡張機能を無効化 - 警告とフッタを非表示にします");
          hideWarning();
          hideFooter();

          // フッタを強制的に削除
          const footer = document.getElementById(FOOTER_ID);
          if (footer) {
            footer.remove();
            console.log("フッタを完全に削除しました");
          }
        } else {
          // 有効化された場合はフッタ表示とアカウントチェック
          console.log(
            "拡張機能を有効化 - フッタ表示とアカウントチェックを実行"
          );
          showFooter();
          checkAccountId();
        }

        sendResponse({ success: true, message: "状態変更完了" });
        return true;
      }

      if (request.action === "getAccountInfo") {
        console.log("アカウント情報を要求されました");

        // 最新のアカウント情報を取得
        updateAccountInfo();

        sendResponse({
          success: true,
          accountInfo: currentAccountInfo,
        });
        return true;
      }

      console.log("未知のアクション:", request.action);
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
  console.log("アカウント情報を更新中...");

  // freeTierNotOkayクラスの要素を探す
  const accountElements = document.querySelectorAll(".freeTierNotOkay");
  console.log("freeTierNotOkay要素の数:", accountElements.length);

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
      console.log("検出されたアカウントID:", accountId);

      currentAccountInfo.detected = true;
      currentAccountInfo.accountId = accountId;
      currentAccountInfo.isValid = VALID_ACCOUNT_IDS.includes(accountId);

      console.log("アカウント情報を更新しました:", currentAccountInfo);
      return;
    }
  }

  console.log("アカウントIDが見つかりませんでした");
}

// 警告要素を作成する関数
function createWarningElement() {
  const warning = document.createElement("div");
  warning.id = WARNING_ID;
  warning.className = "aws-account-warning";

  const message = document.createElement("span");
  message.textContent = WARNING_MESSAGE;

  const closeButton = document.createElement("button");
  closeButton.className = "aws-account-warning-close";
  closeButton.innerHTML = "&times;";
  closeButton.title = "警告を閉じる";

  const showButton = document.createElement("button");
  showButton.className = "aws-account-warning-show";
  showButton.innerHTML = "⚠️";
  showButton.title = "警告を再表示";
  showButton.style.display = "none";

  warning.appendChild(message);
  warning.appendChild(closeButton);
  warning.appendChild(showButton);

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
  warning.querySelector(".aws-account-warning-show").style.display = "none";
  warning.querySelector(".aws-account-warning-close").style.display = "block";
}

// 警告を非表示にする関数
function hideWarning() {
  const warning = document.getElementById(WARNING_ID);
  if (warning) {
    warning.style.display = "none";
    warning.querySelector(".aws-account-warning-show").style.display = "block";
  }
}

// アカウントIDをチェックする関数
function checkAccountId() {
  console.log(
    "checkAccountId関数が呼ばれました。extensionEnabled:",
    extensionEnabled
  );

  if (!extensionEnabled) {
    console.log(
      "拡張機能が無効のため、チェックをスキップし、フッタを削除します"
    );

    // フッタを完全に削除
    const footer = document.getElementById(FOOTER_ID);
    if (footer) {
      footer.remove();
      console.log("フッタを削除しました");
    }

    // 警告も非表示
    hideWarning();
    return;
  }

  // フッタを常に表示（拡張機能が有効な場合）
  showFooter();

  // アカウント情報を更新
  updateAccountInfo();

  // 警告表示の判定
  if (currentAccountInfo.detected) {
    if (!currentAccountInfo.isValid) {
      console.log("警告：検証用アカウントではありません");
      showWarning();
    } else {
      console.log("検証用アカウントです");
      hideWarning();
    }
  } else {
    console.log("アカウントIDが見つかりませんでした。警告を非表示にします");
    hideWarning();
  }
}

// イベントリスナーを設定する関数
function setupEventListeners() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("aws-account-warning-close")) {
      hideWarning();
    } else if (e.target.classList.contains("aws-account-warning-show")) {
      const warning = document.getElementById(WARNING_ID);
      if (warning) {
        warning.style.display = "flex";
        warning.querySelector(".aws-account-warning-show").style.display =
          "none";
        warning.querySelector(".aws-account-warning-close").style.display =
          "block";
      }
    }
  });
}

// メイン処理
async function init() {
  try {
    console.log("=== AWS Account Warning 拡張機能初期化開始 ===");

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
              // 拡張機能が有効な場合のみチェック実行
              if (extensionEnabled) {
                checkAccountId();
              } else {
                // 無効な場合はフッタを削除
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
        console.log("MutationObserverを開始しました");
      }
    } catch (error) {
      console.error("MutationObserverの設定でエラーが発生しました:", error);
    }

    // 定期的にもチェック
    setInterval(() => {
      try {
        // 拡張機能が有効な場合のみチェック実行
        if (extensionEnabled) {
          checkAccountId();
        } else {
          // 無効な場合はフッタを削除
          const footer = document.getElementById(FOOTER_ID);
          if (footer) {
            footer.remove();
            console.log("定期チェックでフッタを削除しました");
          }
        }
      } catch (error) {
        console.error("定期チェックでエラーが発生しました:", error);
      }
    }, 5000);

    console.log("=== AWS Account Warning 拡張機能初期化完了 ===");
  } catch (error) {
    console.error("拡張機能の初期化中にエラーが発生しました:", error);
  }
}

// ページが読み込まれた後に実行
console.log("document.readyState:", document.readyState);
if (document.readyState === "loading") {
  console.log("DOMContentLoadedを待機中...");
  document.addEventListener("DOMContentLoaded", init);
} else {
  console.log("即座に初期化を実行します");
  init();
}
