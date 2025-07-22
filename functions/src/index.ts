import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

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
      throw new HttpsError(
          "not-found",
          `Plan with ID ${planId} not found.`,
      );
    }

    const planData = planSnap.data();
    if (!planData) {
        throw new HttpsError(
            "internal",
            "Plan data is missing.",
        );
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
      throw new HttpsError(
          "not-found",
          `No user found with email ${email}.`,
      );
    }

    if (members[invitee.uid]) {
      throw new HttpsError(
          "already-exists",
          `User ${email} is already a member of this plan.`,
      );
    }

    // 5. Add User to Plan
    await planRef.update({
      [`members.${invitee.uid}`]: {
        role: "editor",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
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
    throw new HttpsError(
        "internal",
        "An unexpected error occurred.",
    );
  }
});