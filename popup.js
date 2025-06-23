// ポップアップの初期化
document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("extensionToggle");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const detectionStatus = document.getElementById("detectionStatus");
  const accountId = document.getElementById("accountId");
  const accountStatus = document.getElementById("accountStatus");
  const refreshBtn = document.getElementById("refreshBtn");

  // 現在の設定を読み込む
  const result = await chrome.storage.sync.get(["extensionEnabled"]);
  const isEnabled = result.extensionEnabled !== false; // デフォルトは有効

  // UIを更新
  updateUI(isEnabled);

  // アカウント情報を取得
  await refreshAccountInfo();

  // トグルの変更イベントリスナー
  toggle.addEventListener("change", async (e) => {
    const enabled = e.target.checked;

    // 設定を保存
    await chrome.storage.sync.set({ extensionEnabled: enabled });

    // UIを更新
    updateUI(enabled);

    // アクティブなタブのコンテンツスクリプトに状態変更を通知
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url && tab.url.includes("console.aws.amazon.com")) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: "toggleExtension",
            enabled: enabled,
          });

          // 状態変更後にアカウント情報を更新
          setTimeout(refreshAccountInfo, 500);
        } catch (messageError) {
          // メッセージ送信に失敗した場合（コンテンツスクリプトが読み込まれていない等）
          console.error(
            "コンテンツスクリプトへのメッセージ送信に失敗:",
            messageError
          );
        }
      }
    } catch (error) {
      console.error("タブ情報の取得に失敗しました:", error);
    }
  });

  // 更新ボタンのイベントリスナー
  refreshBtn.addEventListener("click", refreshAccountInfo);

  // アカウント情報を取得する関数
  async function refreshAccountInfo() {
    try {
      detectionStatus.textContent = "確認中...";
      detectionStatus.className = "account-value";
      accountId.textContent = "-";
      accountId.className = "account-value";
      accountStatus.textContent = "-";
      accountStatus.className = "account-value";

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || !tab.url || !tab.url.includes("console.aws.amazon.com")) {
        detectionStatus.textContent = "AWSコンソール以外";
        detectionStatus.className = "account-value not-detected";
        return;
      }

      // コンテンツスクリプトにアカウント情報を要求
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "getAccountInfo",
        });

        if (response && response.success) {
          const info = response.accountInfo;

          // 検出状況を更新
          if (info.detected) {
            detectionStatus.textContent = "検出成功";
            detectionStatus.className = "account-value detected";

            // アカウントIDを表示
            accountId.textContent = info.accountId || "-";
            accountId.className = "account-value";

            // ステータスを表示
            if (info.isValid) {
              accountStatus.textContent = "社内検証用アカウント";
              accountStatus.className = "account-value valid";
            } else {
              accountStatus.textContent = "本番アカウント";
              accountStatus.className = "account-value invalid";
            }
          } else {
            detectionStatus.textContent = "検出できません";
            detectionStatus.className = "account-value not-detected";
            accountId.textContent = "-";
            accountStatus.textContent = "-";
          }
        } else {
          detectionStatus.textContent = "取得エラー";
          detectionStatus.className = "account-value not-detected";
        }
      } catch (messageError) {
        detectionStatus.textContent = "通信エラー";
        detectionStatus.className = "account-value not-detected";
        console.error("アカウント情報の取得に失敗:", messageError);
      }
    } catch (error) {
      detectionStatus.textContent = "エラー";
      detectionStatus.className = "account-value not-detected";
      console.error("アカウント情報取得処理でエラー:", error);
    }
  }

  function updateUI(enabled) {
    toggle.checked = enabled;

    if (enabled) {
      statusDot.classList.remove("disabled");
      statusText.textContent = "有効";
    } else {
      statusDot.classList.add("disabled");
      statusText.textContent = "無効";
    }
  }
});
