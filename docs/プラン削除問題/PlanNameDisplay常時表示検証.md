# PlanNameDisplay常時表示検証

## 検証目的

PlanNameDisplayを必ず表示するように変更することで、問題の本質が「planがnullになっている」ことであることを確認する。

## 検証方法

### PlanNameDisplay.tsxの修正案

```typescript
const PlanNameDisplay: React.FC<PlanNameDisplayProps> = ({ activeTab }) => {
  const { plan } = usePlanStore();
  const [nameModal, setNameModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isMobile = !isDesktop && !isTablet;

  // planがnullの場合の早期リターンを削除
  // if (!plan) return null;

  // リスト表示画面では非表示にする
  if (activeTab === 'list') return null;

  // プランがない場合の代替表示
  if (!plan) {
    return (
      <>
        <div
          className={`fixed z-30
                      glass-effect-border rounded-xl
                      px-4 py-3
                      text-system-label
                      transition-all duration-150 ease-ios-default
                      ${
                        isDesktop
                          ? 'top-4 left-1/2 -translate-x-1/2 max-w-[280px]'
                          : isTablet
                          ? 'top-4 right-4 max-w-[280px]'
                          : 'top-20 left-1/2 -translate-x-1/2 w-[60%] max-w-[calc(100vw-3rem)] scale-[0.70] origin-top'
                      }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => setNameModal(true)}
              className="text-coral-500 hover:text-coral-600 font-medium text-[18px]
                         transition-all duration-150 ease-ios-default"
            >
              + 新しいプランを作成
            </button>
            <p className="text-system-secondary-label text-[12px]">
              プランがありません
            </p>
          </div>
        </div>

        {/* モーダル */}
        <PlanNameEditModal isOpen={nameModal} onClose={() => setNameModal(false)} />
      </>
    );
  }

  // 以下、既存のプラン表示ロジック...
}
```

## 検証結果の解釈

1. **表示される場合**
   - 問題は確実に「planがnull」であることが原因
   - プラン読み込みロジックの問題

2. **表示されない場合**
   - PlanNameDisplayコンポーネント自体が描画されていない
   - 親コンポーネントレベルの問題

## この検証では解決できない根本問題

この変更は応急処置的なものであり、以下の根本問題は解決しません：

1. **なぜplanがnullになるのか**
2. **Firestoreとローカルストレージにデータがあるのに読み込まれない理由**
3. **プラン削除時の状態管理の不整合**

これらの問題を解決するには、より深い調査と可能な大規模リファクタリングが必要です。
