import React from "react";
import { usePlanLifecycle } from "../../hooks/usePlanLifecycle";
import { useAuth } from "../../hooks/useAuth";

export const PlanLifecycleTestComponent: React.FC = () => {
  const { user } = useAuth();
  const {
    state,
    currentPlan,
    error,
    isReady,
    isLoading,
    hasError,
    switchPlan,
    getTransitionHistory,
  } = usePlanLifecycle(user);

  const handleShowHistory = () => {
    const history = getTransitionHistory();
    console.log("[PlanLifecycle] Transition History:", history);
    alert(
      `Transition History (${history.length} transitions) - Check console for details`,
    );
  };

  const handleSwitchPlan = () => {
    const planId = prompt("切り替えるプランIDを入力してください:");
    if (planId) {
      switchPlan(planId);
    }
  };

  if (!user) {
    return (
      <div
        style={{
          position: "fixed",
          top: "170px",
          right: "10px",
          padding: "10px",
          background: "lightblue",
          border: "1px solid #007acc",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 1000,
        }}
      >
        <h4>Plan Lifecycle</h4>
        <div>ログインが必要です</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "170px",
        right: "10px",
        padding: "10px",
        background: "lightblue",
        border: "1px solid #007acc",
        borderRadius: "4px",
        fontSize: "12px",
        zIndex: 1000,
        minWidth: "220px",
      }}
    >
      <h4>Plan Lifecycle Manager</h4>

      <div style={{ marginBottom: "8px" }}>
        <strong>状態:</strong> {state}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>プラン:</strong> {currentPlan ? currentPlan.name : "なし"}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>準備完了:</strong> {isReady ? "✓" : "✗"}
      </div>

      <div style={{ marginBottom: "8px" }}>
        <strong>読み込み中:</strong> {isLoading ? "✓" : "✗"}
      </div>

      {hasError && (
        <div
          style={{
            marginBottom: "8px",
            padding: "4px",
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "2px",
          }}
        >
          <strong>エラー:</strong> {error?.message || "Unknown error"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          onClick={handleSwitchPlan}
          disabled={!isReady}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            opacity: isReady ? 1 : 0.5,
          }}
        >
          プラン切り替え
        </button>

        <button
          onClick={handleShowHistory}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            backgroundColor: "#f0f0f0",
          }}
        >
          履歴表示
        </button>
      </div>
    </div>
  );
};
