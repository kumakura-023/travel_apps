import React from "react";
import { useUnifiedPlan } from "../../hooks/useUnifiedPlan";
import { usePlanStore } from "../../store/planStore";
import { useAuthStore } from "../../hooks/useAuth";

export const UnifiedPlanTestComponent: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const plan = usePlanStore((s) => s.plan);

  const {
    isLoading,
    message,
    createPlan,
    switchPlan,
    duplicatePlan,
    deletePlan,
    updatePlanName,
    validateDataConsistency,
  } = useUnifiedPlan(user?.uid || null);

  const handleCreatePlan = () => {
    createPlan("テストプラン_" + Date.now());
  };

  const handleDuplicatePlan = () => {
    if (plan) {
      duplicatePlan(plan.id);
    }
  };

  const handleDeletePlan = () => {
    if (plan && window.confirm("本当に削除しますか？")) {
      deletePlan(plan.id);
    }
  };

  const handleUpdateName = () => {
    if (plan) {
      const newName = prompt("新しいプラン名を入力してください", plan.name);
      if (newName && newName !== plan.name) {
        updatePlanName(plan.id, newName);
      }
    }
  };

  const handleValidateData = () => {
    const isValid = validateDataConsistency();
    alert(`データ整合性: ${isValid ? "正常" : "異常"}`);
  };

  if (!user) {
    return (
      <div
        style={{
          position: "fixed",
          top: "120px",
          right: "10px",
          padding: "10px",
          background: "lightgreen",
          border: "1px solid #28a745",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 1000,
        }}
      >
        <h4>Unified Plan Service</h4>
        <div>ログインが必要です</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "120px",
        right: "10px",
        padding: "10px",
        background: "lightgreen",
        border: "1px solid #28a745",
        borderRadius: "4px",
        fontSize: "12px",
        zIndex: 1000,
        minWidth: "200px",
      }}
    >
      <h4>Unified Plan Service</h4>

      {message && (
        <div
          style={{
            marginBottom: "8px",
            padding: "4px",
            borderRadius: "2px",
            backgroundColor:
              message.includes("失敗") || message.includes("エラー")
                ? "#ffebee"
                : "#e8f5e8",
            color:
              message.includes("失敗") || message.includes("エラー")
                ? "#c62828"
                : "#2e7d32",
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: "8px" }}>
        現在のプラン: {plan ? plan.name : "なし"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          onClick={handleCreatePlan}
          disabled={isLoading}
          style={{ padding: "4px 8px", fontSize: "11px" }}
        >
          新規作成
        </button>

        {plan && (
          <>
            <button
              onClick={handleDuplicatePlan}
              disabled={isLoading}
              style={{ padding: "4px 8px", fontSize: "11px" }}
            >
              複製
            </button>

            <button
              onClick={handleUpdateName}
              disabled={isLoading}
              style={{ padding: "4px 8px", fontSize: "11px" }}
            >
              名前変更
            </button>

            <button
              onClick={handleDeletePlan}
              disabled={isLoading}
              style={{ padding: "4px 8px", fontSize: "11px", color: "red" }}
            >
              削除
            </button>
          </>
        )}

        <button
          onClick={handleValidateData}
          disabled={isLoading}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            backgroundColor: "#f0f0f0",
          }}
        >
          整合性チェック
        </button>
      </div>

      {isLoading && (
        <div style={{ marginTop: "8px", fontStyle: "italic" }}>処理中...</div>
      )}
    </div>
  );
};
