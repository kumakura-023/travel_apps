# PlanNameDisplay非表示問題

## 問題の概要
プラン削除バグの修正により、最後のプランを削除した際にプランがnullになり、PlanNameDisplayコンポーネントが非表示になる。

## 原因分析

### PlanNameDisplay.tsx（21行目）
```typescript
if (!plan) return null;
```
- プランがnullの場合、コンポーネント全体が非表示になる
- これは既存の仕様であり、プランがない状態では表示されない

### 修正による影響
1. **PlanNameEditModal.tsx（140行目）**
   - 最後のプランを削除した場合：`setPlan(null)`
   
2. **usePlanLoad.ts（53行目）**
   - プランが存在しない場合：`setPlan(null)`

これにより、プランがnullになる状態が正常に発生するようになった。

## 解決方針

### Option 1: プランがない状態でも表示する（推奨）
- プランがnullの場合、「プランを作成」ボタンやメッセージを表示
- ユーザーに次のアクションを促す

### Option 2: 現状維持
- プランがない場合は非表示のまま
- 別の場所に「新規プラン作成」ボタンを配置

## 実装案（Option 1）

```typescript
const PlanNameDisplay: React.FC<PlanNameDisplayProps> = ({ activeTab }) => {
  const { plan } = usePlanStore();
  const [nameModal, setNameModal] = useState(false);
  // ...

  // リスト表示画面では非表示にする
  if (activeTab === 'list') return null;

  // プランがない場合の表示
  if (!plan) {
    return (
      <div className={`fixed z-30 glass-effect-border rounded-xl px-4 py-3 ...`}>
        <button
          onClick={() => setNameModal(true)}
          className="text-coral-500 hover:text-coral-600 font-medium"
        >
          + 新しいプランを作成
        </button>
        <PlanNameEditModal isOpen={nameModal} onClose={() => setNameModal(false)} />
      </div>
    );
  }

  // 既存のプラン表示ロジック...
};
```

## 影響範囲
- PlanNameDisplay.tsx の表示ロジック
- ユーザー体験の改善（プランがない状態でのガイダンス）