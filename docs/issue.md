各UIの名称はUI_name.mdを参照してください。


修正内容（v1）
・mapを縮小したときのオーバーレイが小さい。オーバーレイの下限を現状のサイズの2倍にしてください。
・mapを縮小したとき、ある閾値を超えるとオーバーレイが非表示になり、色がついた円のみ保存地点に表示されます。このとき、候補地のカテゴリと名称だけわかるような新しいオーバーレイを実装してください。
・スマホ版においてメモの削除、サイズ変更ができません。それぞれのボタンが表示されないため機能にアクセスできない状況です。pc版と同様にそれぞれのボタンが常に表示されるように変更し、この問題の解決を図ってください。
・最後に閲覧していたエリアでアプリが起動するようにして下さい。現状だと、必ず東京周辺でアプリがスタートしますが例えば沖縄の計画を立てていて、沖縄周辺でアプリを閉じたらそこから再開するような感じです。

修正内容(v2追記)
・候補地オーバーレイ（ズームレベルを挙げた時に表示される方）のサイズが小さいまま。下限のサイズを2倍に大きくしてほしい。
・スマホ版メモの削除・サイズ変更ボタンが大きすぎるので小さく。メモのサイズとの比率を保つように。
・最後の位置でアプリを起動する機能が機能していません。アプリをリロードするたびに東京周辺に戻ってしまいます。
・候補地を追加すると以下のエラーが出るようになってしまいました。
vendor-DWvC8KHc.js:32 ReferenceError: isExpanded is not defined
    at bI (index-ChLh2yuA.js:3696:4564)
    at mo (vendor-DWvC8KHc.js:30:16959)
    at Ha (vendor-DWvC8KHc.js:32:43694)
    at Va (vendor-DWvC8KHc.js:32:39499)
    at ud (vendor-DWvC8KHc.js:32:39430)
    at Zr (vendor-DWvC8KHc.js:32:39289)
    at Mu (vendor-DWvC8KHc.js:32:35710)
    at Ii (vendor-DWvC8KHc.js:32:36511)
    at pt (vendor-DWvC8KHc.js:30:3258)
    at vendor-DWvC8KHc.js:32:34060
ku @ vendor-DWvC8KHc.js:32Understand this error
index-ChLh2yuA.js:3829 Uncaught error: ReferenceError: isExpanded is not defined
    at bI (index-ChLh2yuA.js:3696:4564)
    at mo (vendor-DWvC8KHc.js:30:16959)
    at Ha (vendor-DWvC8KHc.js:32:43694)
    at Va (vendor-DWvC8KHc.js:32:39499)
    at ud (vendor-DWvC8KHc.js:32:39430)
    at Zr (vendor-DWvC8KHc.js:32:39289)
    at Mu (vendor-DWvC8KHc.js:32:35710)
    at Ii (vendor-DWvC8KHc.js:32:36511)
    at pt (vendor-DWvC8KHc.js:30:3258)
    at vendor-DWvC8KHc.js:32:34060 Object

    修正内容 v3
    各UIの名称は/UI_name.mdを確認してください。
    ・PlaceList内のLinkedMemoを追加しようとするとコンソールエラーが出ます。修正をお願いします。
        maps-CYOiytW-.js:35 Uncaught TypeError: Cannot read properties of undefined (reading 'lat')
        at ar (maps-CYOiytW-.js:35:39000)
        at ur (maps-CYOiytW-.js:35:39169)
        at Ms (maps-CYOiytW-.js:35:39773)
        at ye.onPositionElement (maps-CYOiytW-.js:35:43036)
        at _.Kr.draw (maps-CYOiytW-.js:35:43496)
        at Mva.draw (overlay.js:5:344)
        at Nva.Ih (overlay.js:5:571)
        at xua (map.js:60:469)
        at map.js:60:42
    ・MapLabelOverlayの削除/サイズ変更ボタンがスマホ版においてデフォルトで非表示になっていますが、pc版と同様に常にボタンを表示するようにしてください。
    ・v1,v2からリロード後、もしくはアプリ再起動後、最後に表示していたエリアから再開するという機能を実装しようとしていますが機能しません。問題を特定してください。

    修正内容　v4
    ・簡易オーバーレイ（PlaceSimpleOverlay）のUIを改善。travel_app\document\rule\design_rule.mdを参考にしてください。
    ・PlaceDetailOverlayのサイズがズームレベルを下げた時に文字がつぶれてしまうので、PlaceDetailOverlayのサイズがスケーリングする現状のズーム閾値を超えたら簡易オーバーレイに切り替わるようにしてください。
    ・スマホ版のMapLabelOverlayの削除/サイズ表示ボタンが大きすぎます。PlaceDetailOverlayの削除ボタンの比率と同じくらいにしてください。また、PC版の削除/サイズ変更ボタンがmapのズームレベルが小さくなるほど大きくなっていて、あべこべです。ズームレベルが変わってもメモの書き込みスペースに対しての比率が変わらないように調節してください。

    修正内容 v5
    ・pc版においてサイズ変更ボタンをドラッグしている状態で、メモエリアにカーソルが干渉するとメモの移動操作に切り替わってしまいます。サイズ変更ボタンをドラッグしている際は、メモエリアに干渉しても移動操作に切り替わらないようにしてください。
    ・スマホ版において、メモのサイズ変更をしようとするとサイト全体がスクロールされてしまうので修正してください。
    ・最後に閲覧していたエリアからの復帰がまだ実装されていません。そこで、最後に追加したメモ・または候補地から再開するようにしてはどうかという提案です。
    それらをアプリ起動地点の保存トリガとして扱うことで実装できませんか？

    修正内容 v6
    ・v5の修正で、最後の操作を記録しましたがこれを、プランに参加しているユーザ全員に共有したいです。つまり、誰かが追加した最後の候補地・メモからアプリが立ち上がるようにしたいです。

    修正内容v7

    全てのデバイスでgoogleログインができません。pc版でコンソールを確認したところ以下のエラーがありました。
    index-CDAkFli6.js:3370 Refused to load the script 'https://apis.google.com/js/api.js?onload=__iframefcb405710' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.

(anonymous) @ index-CDAkFli6.js:3370
loadJS @ index-CDAkFli6.js:3370
Rb @ index-CDAkFli6.js:2755
Sw.Promise.catch.Fi @ index-CDAkFli6.js:3265
Sw @ index-CDAkFli6.js:3265
Rw @ index-CDAkFli6.js:3265
Mw @ index-CDAkFli6.js:3280
initAndGetManager @ index-CDAkFli6.js:3325
_initialize @ index-CDAkFli6.js:3325
(anonymous) @ index-CDAkFli6.js:3160
execute @ index-CDAkFli6.js:3160
execute @ index-CDAkFli6.js:3190
await in execute
bg @ index-CDAkFli6.js:3205
tryRedirectSignIn @ index-CDAkFli6.js:2740
initializeCurrentUser @ index-CDAkFli6.js:2740
await in initializeCurrentUser
(anonymous) @ index-CDAkFli6.js:2740
Promise.then
queue @ index-CDAkFli6.js:2740
_initializeWithPersistence @ index-CDAkFli6.js:2740
Nb @ index-CDAkFli6.js:2770
(anonymous) @ index-CDAkFli6.js:3355
getOrInitializeService @ index-CDAkFli6.js:170
initialize @ index-CDAkFli6.js:170
Pb @ index-CDAkFli6.js:2770
eE @ index-CDAkFli6.js:3370
(anonymous) @ index-CDAkFli6.js:3475Understand this error
voyagesketch.vercel.app/:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">Understand this warning
index-CDAkFli6.js:3856 PWA install prompt available
voyagesketch.vercel.app/:1 Banner not shown: beforeinstallpromptevent.preventDefault() called. The page must call beforeinstallpromptevent.prompt() to show the banner.
index-CDAkFli6.js:3696 リダイレクト認証エラー: FirebaseError: Firebase: Error (auth/internal-error).
    at Jl (index-CDAkFli6.js:2365:783)
    at bt (index-CDAkFli6.js:2365:68)
    at r.onerror (index-CDAkFli6.js:3370:1023)

    このエラーを解決してください。

修正内容 v8
タスク18で実装した、プラン参加者全員に最後に追加された候補地・メモを記憶し、アプリ更新時・立ち上げ時に記憶した地点でmapが開かれるという機能が確認できません。原因を特定して修正してください。

修正内容 v9
タスク20で実装したアプリ起動時の開始位置保存ですが、機能していません。それぞれのユーザがそれぞれの最後の保存地点から再開するようになっていて、共有がされていません。


修正内容 v10
・同一アカウントで、異なるデバイスA,Bにログインしている状態で、Aからプランの名前、削除、追加を行ったときBにその変更が反映されません。修正してください。


修正内容 v11
タスク20で実装した、プラン参加者全員に最後に追加された候補地・メモを記憶し、アプリ更新時・立ち上げ時に記憶した地点でmapが開かれるという機能が確認できません。原因を特定して修正してください。

修正内容 v12
プランを削除した後リロードすると削除したプランが復活する.
削除ボタン：PlanNameEditModal内、プラン管理画面の「このプランを削除する」ボタン
　　　//詳細
        前提条件・・・プランA、プランBが保存されていて、プランAがアクティブ
        削除実行後、プランBがアクティブになる。その後
                                    何もせずリロード→プランが復活。
                                    プランBに候補地を追加してからリロード→プランが正常に削除される。
     //分析
        クラウド同期のトリガが発行されていない可能性がある。

修正内容 v13
プランを削除した後必ず新しいプランが作られるので、そのバグを治して。

修正内容 v14
プラン名の変更が保存されない。プラン名を変更しても「新しいプラン」にもどってしまう。

修正内容 v15
プランAとプランBがある状態でプランAがアクティブのとき、プランBをアクティブに変更するとプランAに追加されているPlaceCircleBackgroundが残ったままになってしまいます。

修正内容 v16
travel_app\docs\UI_name.md参照。PlaceCircleBackground、PlaceCircle UIを削除してください。その代わりにPlaceDetailOverlay/PlaceSimpleOverlay内にその地点のPlaceDetailPanel/PlaceDetailsPanelを開くためのUIを追加してください。このUIはtravel_app\document\rule\design_rule.mdを参考に作成してください。

修正内容 v17
・PlanNameDisplay内プラン管理機能からプランを複数まとめて削除できる機能の実装
・プランを新規作成するボタンを押したとき、プラン名の編集モーダルを開いてほしい。現状だと新規作成した後自分で編集モーダルを開かないといけずUXが非常に悪い

修正内容 v18
・メモを追加しようとすると、クリックした場所に移動してしまいメモが追加されない。該当UIはたぶんAddLabelToggleなんだけど、mapにメモを追加する機能のところ。

修正内容 v19
・新規機能　ほかのユーザが追加した候補地の確認
    詳細　あるプランに対してほかのユーザが候補地を追加したときに、その候補地の内容の確認が簡単にできるようにしたい。
    　　　PlaceSimpleOverlayみたいなUIで「確認」ボタンを押すまで残るみたいな感じ。TabNavigationにアクセス用のアイコンを追加して
        　そのモーダルを開くと確認できるようにしたい。

修正内容 v20
・招待URLから参加すると以下のログが出力され、招待されたはずのプランに参加できない。招待URLから参加したとき、プラン一覧にプランが追加され、ゲスト側のユーザもいつでもアクセスできるようにしてください。
index-f3hn6yqQ.js:3472 [planListService] Error listening to plans: FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/voyagesketch/firestore/ind…2luZGV4ZXMvXxABGg0KCW1lbWJlcklkcxgBGg0KCXVwZGF0ZWRBdBACGgwKCF9fbmFtZV9fEAI

index-f3hn6yqQ.js:3472 [planListService] Firestore index required. Please create the composite index for: 
Object
index-f3hn6yqQ.js:3472 [planListService] You can create the index by visiting the URL in the error message or Firebase Console
index-f3hn6yqQ.js:3472 [planListStore] Error with sorted query: FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/voyagesketch/firestore/ind…2luZGV4ZXMvXxABGg0KCW1lbWJlcklkcxgBGg0KCXVwZGF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
index-f3hn6yqQ.js:3472 [planListStore] Falling back to no-sort query
index-f3hn6yqQ.js:3472 [PlanCoordinator] Retrieved active plan ID: e61ae225-760a-4c06-b7c9-5391f4423eae
index-f3hn6yqQ.js:3472 [PlanCoordinator] Available plans: 0
index-f3hn6yqQ.js:3472 [PlanCoordinator] No plans available, keeping empty state
index-f3hn6yqQ.js:3472 [PlanCoordinator] Initialization completed

修正内容 v21
・新規機能　メイン画面でのフィルター