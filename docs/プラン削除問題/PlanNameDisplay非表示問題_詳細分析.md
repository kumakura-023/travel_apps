# PlanNameDisplay非表示問題 - 詳細分析

## 問題の概要

FirebaseとローカルストレージにプランデータがあるにもかかわらずPlanNameDisplayが表示されない。

## 真の原因

### 1. usePlanLoad.ts（30行目）- 未修正の問題

```typescript
if (!loaded) {
  loaded = getActivePlan() || createEmptyPlan(); // ← createEmptyPlan()が残っている
}
```

- 48行目は修正されたが、30行目のcreateEmptyPlan()は修正されていない

### 2. usePlanLoad.ts（61行目）- アクティブプランIDのクリア

```typescript
setActivePlan(loaded?.id || ""); // ← loadedがnullの場合、空文字列を設定
```

- プランが見つからない場合、ローカルストレージのアクティブプランIDが空文字列になる
- これによりgetActivePlan()が次回起動時にnullを返す

### 3. 問題の流れ

1. プラン削除時、残りのプランがある場合でも一時的にloaded = nullになるケース
2. setActivePlan('')でアクティブプランIDがクリア
3. アプリをリロードすると：
   - getActivePlan()がnull（アクティブプランIDが空のため）
   - planListにはプランが存在するが選択されない
   - listenToPlanが呼ばれず、planStoreがnullのまま
   - PlanNameDisplayが表示されない

## 解決策

### 1. usePlanLoad.tsの修正

```typescript
// 30行目の修正
if (!loaded) {
  loaded = getActivePlan(); // createEmptyPlan()を削除
}

// 44-56行目の改善
if (plans.length > 0) {
  const firstPlan = plans[0];
  console.log("[usePlanLoad] Using first available plan:", firstPlan.id);
  usePlanStore.getState().listenToPlan(firstPlan.id);
  setActivePlan(firstPlan.id); // アクティブプランIDを設定
  // loaded変数の更新は不要
} else {
  // プランが一つもない場合
  console.log("[usePlanLoad] No plans available");
  usePlanStore.getState().setPlan(null);
  setActivePlan(""); // 明示的に空に
}

// 58-61行目を条件付きに
if (loaded) {
  usePlacesStore.setState({ places: loaded.places || [] });
  useLabelsStore.setState({ labels: loaded.labels || [] });
  // setActivePlan(loaded.id);  // 既に設定済みなので不要
}
```

### 2. ローカルストレージの整合性確保

- プラン削除時にアクティブプランIDを適切に更新
- 存在しないプランIDがアクティブに設定されないようにする

## テスト項目

1. プラン削除後にリロードしても正しいプランが選択される
2. アクティブプランIDが常に有効なプランを指している
3. プランが存在する限りPlanNameDisplayが表示される
