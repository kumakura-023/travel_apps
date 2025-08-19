import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

interface InviteData {
  planId: string;
  email: string;
}

export const inviteUserToPlan = onCall(async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const inviterUid = request.auth.uid;
  const { planId, email } = request.data as InviteData;

  // 2. Input Validation
  if (!planId || !email) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'planId' and 'email'.",
    );
  }

  try {
    const planRef = db.collection("plans").doc(planId);
    const planSnap = await planRef.get();

    if (!planSnap.exists) {
      throw new HttpsError("not-found", `Plan with ID ${planId} not found.`);
    }

    const planData = planSnap.data();
    if (!planData) {
      throw new HttpsError("internal", "Plan data is missing.");
    }
    const members = planData.members || {};

    // 3. Permission Check
    const inviterRole = members[inviterUid]?.role;
    if (inviterRole !== "owner" && inviterRole !== "editor") {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to invite users to this plan.",
      );
    }

    // 4. User Lookup
    let invitee;
    try {
      invitee = await admin.auth().getUserByEmail(email);
    } catch (error) {
      throw new HttpsError("not-found", `No user found with email ${email}.`);
    }

    if (members[invitee.uid]) {
      throw new HttpsError(
        "already-exists",
        `User ${email} is already a member of this plan.`,
      );
    }

    // 5. Add User to Plan
    // planDataから既存のmemberIds配列を取得
    const existingMemberIds = planData.memberIds || [];
    const updatedMemberIds = existingMemberIds.includes(invitee.uid)
      ? existingMemberIds
      : [...existingMemberIds, invitee.uid];

    // membersとmemberIds両方を更新
    await planRef.update({
      [`members.${invitee.uid}`]: {
        role: "editor",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      memberIds: updatedMemberIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Successfully invited ${email} to the plan.`,
    };
  } catch (error) {
    console.error("Error inviting user:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});

/**
 * URL招待用トークン生成API
 * オーナー/編集者のみ実行可
 * 既存のinviteTokenがあればそれを返し、なければ新規生成
 */
export const generateInviteToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "認証が必要です");
  }
  const uid = request.auth.uid;
  const { planId } = request.data as { planId: string };
  if (!planId) {
    throw new HttpsError("invalid-argument", "planIdが必要です");
  }
  const planRef = db.collection("plans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) {
    throw new HttpsError("not-found", "プランが存在しません");
  }
  const planData = planSnap.data();
  if (!planData) {
    throw new HttpsError("internal", "プランデータが取得できません");
  }
  const members = planData.members || {};
  const role = members[uid]?.role;
  if (role !== "owner" && role !== "editor") {
    throw new HttpsError("permission-denied", "招待権限がありません");
  }
  let inviteToken = planData.inviteToken;
  if (!inviteToken) {
    inviteToken = uuidv4();
    await planRef.update({ inviteToken });
  }
  return { inviteToken };
});

/**
 * URL招待トークン受理API
 * トークンから該当プランを検索し、認証済みユーザーをmembersに追加
 */
export const acceptInviteToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "認証が必要です");
  }
  const uid = request.auth.uid;
  const { token } = request.data as { token: string };
  if (!token) {
    throw new HttpsError("invalid-argument", "tokenが必要です");
  }
  // inviteTokenでプランを検索
  const plansSnap = await db
    .collection("plans")
    .where("inviteToken", "==", token)
    .get();
  if (plansSnap.empty) {
    throw new HttpsError("not-found", "有効な招待トークンが見つかりません");
  }
  const planDoc = plansSnap.docs[0];
  const planData = planDoc.data();
  if (!planData) {
    throw new HttpsError("internal", "プランデータが取得できません");
  }
  const members = planData.members || {};
  if (members[uid]) {
    return { alreadyMember: true, planId: planDoc.id };
  }
  // 既存のmemberIds配列を取得
  const existingMemberIds = planData.memberIds || [];
  const updatedMemberIds = existingMemberIds.includes(uid)
    ? existingMemberIds
    : [...existingMemberIds, uid];

  // membersとmemberIds両方を更新
  await planDoc.ref.update({
    [`members.${uid}`]: {
      role: "editor",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    memberIds: updatedMemberIds,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // 参加ユーザーの activePlanId を更新
  await db.collection("users").doc(uid).set(
    {
      activePlanId: planDoc.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { success: true, planId: planDoc.id };
});

// Export repair functions
export {
  repairExistingPlansMemberIds,
  repairSinglePlanMemberIds,
} from "./repairMemberIds";
