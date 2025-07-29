import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { PlanListItem } from './planListService';

/**
 * ユーザーが参加しているプラン一覧をリアルタイムで監視（ソートなし版）
 * インデックスが作成されていない場合の一時的な回避策
 */
export function listenUserPlansNoSort(
  user: User,
  onUpdate: (plans: PlanListItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  console.log('[planListServiceNoSort] Starting to listen for user plans (no sort):', user.uid);
  
  const plansRef = collection(db, 'plans');
  // orderByを使わないシンプルなクエリ
  const q = query(
    plansRef,
    where('memberIds', 'array-contains', user.uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('[planListServiceNoSort] Received plans snapshot:', snapshot.size, 'plans');
      
      // 変更内容を詳細にログ出力
      snapshot.docChanges().forEach((change) => {
        console.log('[planListServiceNoSort] Document change:', {
          type: change.type,
          id: change.doc.id,
          data: change.doc.data()
        });
      });
      
      const plans: PlanListItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // payloadから基本情報を抽出
        let placeCount = 0;
        let totalCost = 0;
        
        try {
          if (data.payload) {
            const payload = JSON.parse(data.payload);
            placeCount = payload.places?.length || 0;
            totalCost = payload.totalCost || 0;
          }
        } catch (e) {
          console.error('[planListServiceNoSort] Failed to parse payload:', e);
        }
        
        plans.push({
          id: doc.id,
          name: data.name || '名称未設定',
          ownerId: data.ownerId,
          memberCount: Object.keys(data.members || {}).length,
          placeCount,
          totalCost,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      
      // クライアント側でソート
      plans.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      console.log('[planListServiceNoSort] Processed plans:', plans);
      onUpdate(plans);
    },
    (error) => {
      console.error('[planListServiceNoSort] Error listening to plans:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}