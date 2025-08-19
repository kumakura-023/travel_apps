# 公共交通機関ルート検索トラブルシューティングガイド

## 問題：東京駅→渋谷駅でZERO_RESULTSエラー

### 1. Google Cloud Console 設定確認（重要）

**必須の設定確認**：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「APIs & Services」→「Enabled APIs & services」
3. 以下のAPIが**有効**であることを確認：
   - ✅ **Maps JavaScript API**
   - ✅ **Places API**
   - ✅ **Directions API** ← **これが最重要**
   - ✅ **Geocoding API**

**Directions APIの詳細確認**：

- Directions APIの詳細ページで「Transit」機能が含まれているか確認
- 制限事項・課金設定を確認

### 2. APIキー制限設定の確認

**APIキー設定ページ**で以下を確認：

1. 「Application restrictions」→「HTTP referrers」が正しく設定されているか
2. 「API restrictions」→「Restrict key」で以下が許可されているか：
   - Maps JavaScript API
   - **Directions API** ← **重要**
   - Places API
   - Geocoding API

### 3. 課金設定の確認

**Transit データは追加料金が発生する場合があります**：

- Google Cloud Console →「Billing」
- Directions API の使用量・課金状況を確認
- 無料枠を超過していないか確認

### 4. 地域・時刻による制限

**公共交通機関データの利用可能性**：

- **利用可能地域**: 日本の主要都市部
- **利用可能時間**: 実際の運行時間内
- **データ更新**: リアルタイム時刻表データに依存

### 5. デバッグ手順

**Step 1: 他の移動手段でテスト**
同じ東京駅→渋谷駅で以下を試す：

- ✅ WALKING モード
- ✅ DRIVING モード
  → これらが成功すればAPIキー基本設定は正常

**Step 2: 確実に動作する区間でテスト**

- 新宿駅→渋谷駅（JR山手線）
- 東京駅→品川駅（JR山手線・京浜東北線）
  → より確実なルートで再テスト

**Step 3: 時間帯を変えてテスト**

- 平日 9:00-17:00
- 土日 10:00-18:00
  → 運行時間内での再テスト

### 6. 代替解決策

**一時的な対処法**：

```javascript
// 開発時のみ：TRANSITが失敗した場合の詳細ログ
if (selectedMode === "TRANSIT") {
  console.log("TRANSIT mode debug info:", {
    apiKeyPresent: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    currentTime: new Date().toISOString(),
    requestDetails: { originCoords, destinationCoords },
  });
}
```

**長期的な解決策**：

1. Google Cloud Console でのDirections API設定見直し
2. 課金アカウントの設定・限度額設定
3. 必要に応じてGoogle Supportへの問い合わせ

### 7. よくある原因

**最頻出の問題**：

1. ❌ **Directions API が有効化されていない**
2. ❌ **APIキーでDirections APIが制限されている**
3. ❌ **課金設定が未完了（Transit データ用）**
4. ❌ **リファラー制限が厳しすぎる**

### 8. 確認コマンド

**ブラウザConsoleで確認**：

```javascript
// Google Maps APIの読み込み状況確認
console.log("Google Maps API:", window.google?.maps ? "Loaded" : "Not loaded");
console.log("DirectionsService:", new google.maps.DirectionsService());
console.log("TravelMode.TRANSIT:", google.maps.TravelMode.TRANSIT);
```

## 結論

東京駅→渋谷駅で失敗する場合、**99%がGoogle Cloud Console の設定問題**です。
特に「Directions API の有効化」と「APIキーの制限設定」を重点的に確認してください。
