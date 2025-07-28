
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