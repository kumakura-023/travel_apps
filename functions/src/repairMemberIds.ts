import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/**
 * 既存プランのmemberIds配列を修復する関数
 * membersオブジェクトからメンバーIDを抽出してmemberIds配列を再構築する
 * 一度だけ実行すればよい
 */
export const repairExistingPlansMemberIds = functions.https.onCall(
  async (data, context) => {
    // 管理者権限チェック（オプション - 本番環境では推奨）
    // if (!context.auth || !context.auth.token.admin) {
    //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    // }

    const db = admin.firestore();
    const plansRef = db.collection("plans");
    const snapshot = await plansRef.get();

    const batch = db.batch();
    let updateCount = 0;
    const repairedPlans: string[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const members = data.members || {};
      const existingMemberIds = data.memberIds || [];

      // membersオブジェクトからメンバーIDを抽出
      const actualMemberIds = Object.keys(members);

      // memberIds配列が不完全な場合は修復
      const needsUpdate = actualMemberIds.some(
        (id) => !existingMemberIds.includes(id),
      );

      if (needsUpdate) {
        batch.update(doc.ref, {
          memberIds: actualMemberIds,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updateCount++;
        repairedPlans.push(doc.id);
        console.log(
          `Repairing plan ${doc.id}: adding memberIds ${actualMemberIds}`,
        );
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully repaired ${updateCount} plans`);
    } else {
      console.log("No plans needed repair");
    }

    return {
      success: true,
      repaired: updateCount,
      repairedPlanIds: repairedPlans,
      message:
        updateCount > 0
          ? `Successfully repaired ${updateCount} plans`
          : "No plans needed repair",
    };
  },
);

/**
 * 単一プランのmemberIds配列を修復する関数
 * 特定のプランIDを指定して修復する場合に使用
 */
export const repairSinglePlanMemberIds = functions.https.onCall(
  async (data, context) => {
    const { planId } = data;

    if (!planId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "planId is required",
      );
    }

    const db = admin.firestore();
    const planRef = db.collection("plans").doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Plan ${planId} not found`,
      );
    }

    const planData = planDoc.data();
    if (!planData) {
      throw new functions.https.HttpsError("internal", "Plan data is empty");
    }

    const members = planData.members || {};
    const existingMemberIds = planData.memberIds || [];

    // membersオブジェクトからメンバーIDを抽出
    const actualMemberIds = Object.keys(members);

    // memberIds配列が不完全な場合は修復
    const needsUpdate = actualMemberIds.some(
      (id) => !existingMemberIds.includes(id),
    );

    if (needsUpdate) {
      await planRef.update({
        memberIds: actualMemberIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Successfully repaired plan ${planId}: memberIds updated to ${actualMemberIds}`,
      );

      return {
        success: true,
        planId,
        oldMemberIds: existingMemberIds,
        newMemberIds: actualMemberIds,
        message: `Successfully repaired plan ${planId}`,
      };
    } else {
      return {
        success: true,
        planId,
        memberIds: existingMemberIds,
        message: `Plan ${planId} does not need repair`,
      };
    }
  },
);
