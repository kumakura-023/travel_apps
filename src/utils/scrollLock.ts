/**
 * ページスクロール制御ユーティリティ
 * BottomSheetのドラッグ中にページ全体のスクロールを抑止するためのユーティリティ
 */

let originalBodyOverflow: string | null = null;
let originalBodyPosition: string | null = null;
let originalBodyTop: string | null = null;
let originalBodyHeight: string | null = null;
let originalBodyOverscrollBehaviorY: string | null = null;
let originalDocumentElementOverflow: string | null = null;
let scrollY: number = 0;

/**
 * グローバルスクロールをロック/アンロックする
 * @param locked - true: スクロールロック, false: スクロールアンロック
 */
export function setGlobalScrollLock(locked: boolean): void {
  if (locked) {
    // 現在のスクロール位置を記録
    scrollY = window.scrollY;

    // 現在のスタイルを記録
    const body = document.body;
    const documentElement = document.documentElement;

    originalBodyOverflow = body.style.overflow;
    originalBodyPosition = body.style.position;
    originalBodyTop = body.style.top;
    originalBodyHeight = body.style.height;
    originalBodyOverscrollBehaviorY = body.style.overscrollBehaviorY;
    originalDocumentElementOverflow = documentElement.style.overflow;

    // スクロールを無効化
    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.height = "100%";
    body.style.width = "100%";
    body.style.overscrollBehaviorY = "contain";
  } else {
    // 元のスタイルを復元
    const body = document.body;
    const documentElement = document.documentElement;

    documentElement.style.overflow = originalDocumentElementOverflow || "";
    body.style.overflow = originalBodyOverflow || "";
    body.style.position = originalBodyPosition || "";
    body.style.top = originalBodyTop || "";
    body.style.height = originalBodyHeight || "";
    body.style.width = "";
    body.style.overscrollBehaviorY = originalBodyOverscrollBehaviorY || "";

    // スクロール位置を復元
    window.scrollTo(0, scrollY);

    // 記録をクリア
    originalBodyOverflow = null;
    originalBodyPosition = null;
    originalBodyTop = null;
    originalBodyHeight = null;
    originalBodyOverscrollBehaviorY = null;
    originalDocumentElementOverflow = null;
    scrollY = 0;
  }
}
