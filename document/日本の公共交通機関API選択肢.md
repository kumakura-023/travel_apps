# 日本の公共交通機関API選択肢

## 🚅 主要API比較

### 1. Yahoo!路線情報API

**特徴**: 最も包括的な日本の公共交通機関データ

- **対応エリア**: 全国のJR、私鉄、地下鉄、バス
- **データ精度**: 非常に高い（リアルタイム遅延情報含む）
- **料金**: 従量課金（月間5万回まで無料プランあり）
- **公式**: https://developer.yahoo.co.jp/webapi/map/openlocalplatform/v1/routesearch.html

```javascript
// Yahoo!路線情報API 使用例
const response = await fetch(
  `https://map.yahooapis.jp/routesearch/V1/routesearch?appid=${API_KEY}&output=json&from=${from}&to=${to}`,
);
```

### 2. 駅すぱあとWebサービス

**特徴**: 最も老舗で信頼性の高いルート検索

- **対応エリア**: 全国の鉄道、航空、バス、船舶
- **データ精度**: 極めて高い（運賃計算も正確）
- **料金**: 月額課金制（詳細は要問い合わせ）
- **公式**: https://docs.ekispert.com/v1/

```javascript
// 駅すぱあとAPI 使用例
const response = await fetch(
  `https://api.ekispert.jp/v1/json/search/course/extreme?key=${API_KEY}&from=${from}&to=${to}`,
);
```

### 3. JR東日本API

**特徴**: JR東日本エリア限定だが高精度

- **対応エリア**: JR東日本管内（首都圏中心）
- **データ精度**: 非常に高い（運行情報リアルタイム）
- **料金**: 無料プランあり
- **公式**: https://www.jreast.co.jp/development/

### 4. 東京メトロAPI

**特徴**: 東京メトロ限定だが無料

- **対応エリア**: 東京メトロ全線
- **データ精度**: 高い（遅延情報、駅情報含む）
- **料金**: 完全無料
- **公式**: https://api.tokyometroapp.jp/

## 🏆 推奨選択肢

### **最適解: Yahoo!路線情報API**

- ✅ 全国対応
- ✅ Google Maps品質のUX可能
- ✅ 無料プランで月5万回（個人開発に十分）
- ✅ JSONレスポンスで統合しやすい

### **統合方法**

```typescript
// services/japanTransitService.ts
export class JapanTransitService {
  async getRoute(origin: string, destination: string): Promise<TransitRoute> {
    const response = await fetch(
      `https://map.yahooapis.jp/routesearch/V1/routesearch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appid: process.env.YAHOO_API_KEY,
          from: origin,
          to: destination,
          output: "json",
        }),
      },
    );

    return this.parseYahooResponse(await response.json());
  }
}
```

## 💰 コスト比較（月間利用想定）

| API            | 無料枠   | 有料プラン    | 対応範囲 | 推奨度 |
| -------------- | -------- | ------------- | -------- | ------ |
| Yahoo!路線情報 | 5万回/月 | ¥10-50/1000回 | 全国     | ★★★★★  |
| 駅すぱあと     | なし     | ¥50,000~/月   | 全国     | ★★★☆☆  |
| JR東日本       | 1万回/月 | 要相談        | 関東     | ★★★☆☆  |
| 東京メトロ     | 無制限   | 無料          | 東京     | ★★☆☆☆  |

## 📋 実装優先度

1. **第1段階**: Yahoo!路線情報API統合（全国対応）
2. **第2段階**: エラー時のフォールバック強化
3. **第3段階**: リアルタイム遅延情報表示
4. **第4段階**: 運賃・所要時間の詳細表示
