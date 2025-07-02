import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="text-center py-3">
        <h2 className="title-2 text-system-label">設定</h2>
        <p className="footnote text-system-secondary-label mt-2">
          アプリの動作をカスタマイズできます
        </p>
      </div>

      {/* 設定セクション */}
      <div className="space-y-4">
        {/* 表示設定 */}
        <div className="glass-effect rounded-xl p-5 shadow-elevation-1">
          <h3 className="subheadline font-semibold text-system-label mb-4">
            表示設定
          </h3>
          
          {/* 付箋表示設定 */}
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="callout text-system-label">付箋表示</span>
                <p className="caption-1 text-system-secondary-label">
                  地図上に候補地の付箋を表示
                </p>
              </div>
              <div className="switch">
                <input type="checkbox" className="sr-only" />
                <div className="switch-thumb"></div>
              </div>
            </label>
            
            {/* 地図スタイル */}
            <div className="space-y-2">
              <label className="subheadline text-system-label">地図スタイル</label>
              <select className="input appearance-none bg-right">
                <option value="roadmap">通常</option>
                <option value="satellite">衛星</option>
                <option value="hybrid">ハイブリッド</option>
                <option value="terrain">地形</option>
              </select>
            </div>
          </div>
        </div>

        {/* 言語・地域設定 */}
        <div className="glass-effect rounded-xl p-5 shadow-elevation-1">
          <h3 className="subheadline font-semibold text-system-label mb-4">
            言語・地域
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="subheadline text-system-label">言語</label>
              <select className="input appearance-none bg-right">
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="subheadline text-system-label">通貨</label>
              <select className="input appearance-none bg-right">
                <option value="JPY">日本円 (¥)</option>
                <option value="USD">米ドル ($)</option>
                <option value="EUR">ユーロ (€)</option>
                <option value="KRW">韓国ウォン (₩)</option>
              </select>
            </div>
          </div>
        </div>

        {/* データ管理 */}
        <div className="glass-effect rounded-xl p-5 shadow-elevation-1">
          <h3 className="subheadline font-semibold text-system-label mb-4">
            データ管理
          </h3>
          
          <div className="space-y-3">
            <button className="btn-secondary w-full justify-start">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              データをエクスポート
            </button>
            
            <button className="btn-secondary w-full justify-start">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              データをインポート
            </button>
            
            <button className="w-full px-4 py-3 bg-coral-500/10 text-coral-600 
                             rounded-lg callout font-medium transition-all duration-150 ease-ios-default
                             hover:bg-coral-500/20 active:scale-95 border border-coral-500/30
                             flex items-center justify-start">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
              データをクリア
            </button>
          </div>
        </div>

        {/* アプリ情報 */}
        <div className="glass-effect rounded-xl p-5 shadow-elevation-1">
          <h3 className="subheadline font-semibold text-system-label mb-4">
            アプリ情報
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="callout text-system-secondary-label">バージョン</span>
              <span className="callout text-system-label">1.0.0</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="callout text-system-secondary-label">最終更新</span>
              <span className="callout text-system-label">2024年12月</span>
            </div>
            
            <button className="btn-text text-coral-500 w-full text-left">
              利用規約・プライバシーポリシー
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 