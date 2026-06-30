# SysRec

Windows向けの画面録画アプリです。

> ⚠️ **対応OS：Windows 10 / Windows 11**
> Windows 7 / 8 / 8.1 では動作しません（インストールはできても起動できません）。

<br>

## ダウンロード

こちらから最新版をダウンロードできます。

### 👉 [SysRec をダウンロード](https://github.com/workntones-cyber/SysRec/releases/latest)

<br>

## インストール方法

1. 上のリンクから **`SysRec Setup.exe`** をダウンロード
2. ダウンロードしたファイルをダブルクリックして実行
3. インストールが終わると、自動的にSysRecが起動します

<br>

それだけです。とても簡単です。

<br>

## 使い方

1. 「録画範囲」で、録画したい範囲（全画面 / 指定ウィンドウ / 範囲選択）を選びます
2. 必要であれば「音声」をシステム音声・マイクで切り替えます
3. 「録画開始」を押すと録画がスタートします
4. もう一度押すと録画が止まり、自動で再生されます

<br>
<br>

## 🔊 音が録音されないときは

パソコンによっては、最初の設定のままだと「システム音声」が録音できないことがあります。

その場合は、以下の手順で設定してください。

<br>

### 手順1：無料の音声ソフトをインストールする

下のリンクから **「VB-CABLE」** という無料ソフトをダウンロードし、インストールしてください。

### 👉 [VB-CABLE をダウンロード](https://vb-audio.com/Cable/)

<br>

### 手順2：パソコンの音の出力先を変更する

1. Windowsの「サウンドの設定」を開く
2. 出力（再生）デバイスを **「CABLE Input」** に変更する

<br>

### 手順3：自分にも音が聞こえるようにする

このままだと、自分の耳に音が聞こえなくなってしまうので、聞こえるように設定します。

1. 「コントロールパネル」→「サウンド」を開く
2. 「録音」タブを開く
3. **「CABLE Output」** を右クリック →「プロパティ」
4. 「聴く」タブを開く
5. 「このデバイスを聴く」にチェックを入れる
6. 再生するデバイスとして、いつも使っているスピーカーやヘッドホンを選ぶ

<br>

これで設定は完了です。普段どおり音も聞こえながら、SysRecでシステム音声を録音できるようになります。

<br>
<br>

---

<br>
<br>

# 開発者向け情報

ここから下は、開発・改造をしたい方向けの情報です。

---

## 1. 動作環境

- **OS**: Windows 10 / 11（`gdigrab` / `dshow` を使うため Windows専用）
- **Node.js**: 18 以降推奨
- **Electron**: 31.x（`devDependencies` で固定）
- 録画にバンドルのFFmpegバイナリ（`resources/ffmpeg/ffmpeg.exe`）を使用。未配置の場合はシステムPATH上の `ffmpeg` にフォールバックします。

### システム音声録音の前提条件（重要）

`dshow` の録音デバイス経由でシステム音声（スピーカー出力）をキャプチャするため、**Windowsの既定の再生デバイスに対応するループバック録音デバイスが必要**です。

- Realtek内蔵オーディオが既定出力の場合 → 「ステレオ ミキサー」が自動的に有効なら録音可能
- それ以外（USBオーディオ、Bluetooth、Sound Blaster等）の場合 → 多くはOS標準のループバック録音デバイスが存在しないため、**[VB-Audio Virtual Cable](https://vb-audio.com/Cable/) 等の仮想オーディオケーブルの導入が必須**
  - 既定の再生デバイスを「CABLE Input」に変更
  - Windowsのサウンド設定（コントロールパネル「録音」タブ）→「CABLE Output」のプロパティ→「聴く」タブ→「このデバイスを聴く」を有効化し、実際のスピーカーを選択（普段の音声も聞こえるようにするため）
- これを設定しないと、録画自体は成功するが**音声が無音**になる（アプリの不具合ではなくOSのオーディオルーティングの制約）

---

## 2. インストール

```bash
npm install
```

## 3. 起動（開発モード）

```bash
npm start
```

デスクトップの `SysRec` ショートカット（`start-sysrec.bat`）からも起動可能。

## 4. 使い方

1. アプリ起動時、ウィンドウはフレームレスのフローティングツールバーとして表示される
2. **録画範囲**プルダウンで以下のいずれかを選択
   - `全画面`：マルチモニター環境では、どの画面を録画するかサムネイル付きの選択ダイアログが表示される（単一モニターならそのまま全画面の赤枠が表示される）
   - `指定ウィンドウ`：サムネイル付きのウィンドウ一覧から録画対象を選択する
   - `範囲選択`：画面上をドラッグして矩形の録画範囲を指定する
3. 対象選択後、選択範囲を示す赤枠が画面に表示される（**録画中も消えず**、録画停止時に消える）
4. **音声**のスイッチで「システム音声」/「マイク」を切り替え（前提条件は上記参照）
5. **録画開始**ボタンで録画開始、ボタンは「録画停止」に変化しパルスアニメーションで録画中を表示
6. 録画停止後、自動でプレビュー欄に再生される
7. プレビュー右側の「録画ファイル」パネルに保存済みファイルの一覧が新しい順に表示され、クリックでそのファイルを再生できる。パネルヘッダーの📁ボタンで保存先フォルダをExplorerで開ける
8. フッターで出力形式（mp4 / WebM）と保存先フォルダを変更できる（「参照」で変更すると同時にそのフォルダが開く）
9. **録画中はSysRecのウィンドウ自体は画面キャプチャに含まれない**（`setContentProtection` による除外）

## 5. パッケージング（インストーラー作成）

```bash
npm run dist
```

`electron-builder` によりNSISインストーラー（`SysRec Setup x.x.x.exe`、ワンクリック・ユーザー単位インストール）が `dist/` に出力される。ビルド設定は `package.json` の `build` フィールド参照。

---

## 6. 技術スタックと仕様（AIへの共有・引き継ぎ用）

### 6.1 技術スタック

| 項目 | 内容 |
|---|---|
| ランタイム | Electron 31.x（メインプロセス + 複数の`BrowserWindow`によるレンダラー） |
| 言語 | Node.js（CommonJS）、Vanilla JS / HTML / CSS（フレームワーク不使用） |
| 録画エンジン | FFmpeg（バンドル: `resources/ffmpeg/ffmpeg.exe`） |
| 画面キャプチャ | FFmpeg `gdigrab`（GDI経由のデスクトップキャプチャ） |
| 音声キャプチャ | FFmpeg `dshow`（DirectShow音声入力） |
| ウィンドウ位置取得 | PowerShell + C#（`Add-Type`でWin32 API `EnumWindows`/`GetWindowRect`を呼び出し） |
| ウィンドウ/画面サムネイル | Electron `desktopCapturer` |
| パッケージング | `electron-builder`（NSIS, Windows x64） |
| 設定の永続化 | `app.getPath('userData')/settings.json`（JSON） |

### 6.2 プロセス構成・ウィンドウ一覧（`main/main.js`）

| 変数名 | 役割 | ロード元 |
|---|---|---|
| `toolbarWindow` | メインのツールバーUI（フレームレス、常に最前面） | `renderer/index.html` |
| `overlayWindow` | 範囲選択（ドラッグで矩形指定）用の全画面透明オーバーレイ | `renderer/overlay.html` |
| `settingsWindow` | 設定ウィンドウ（出力形式・保存先・機能ON/OFF等） | `renderer/settings.html` |
| `borderWindow` | 録画範囲を示す赤枠（クリック透過・フォーカス不可） | `renderer/border.html` |
| `pickerWindow` | 指定ウィンドウ選択用のサムネイル一覧ダイアログ | `renderer/window-picker.html` |
| `monitorPickerWindow` | マルチモニター時の画面選択用サムネイル一覧ダイアログ | `renderer/monitor-picker.html` |

すべて `webPreferences: { preload: main/preload.js, contextIsolation: true }` でレンダラーからは `window.sysrec.*` 経由のみアクセス可能（Node直接アクセス不可）。

### 6.3 IPCチャネル一覧（`main/main.js` ⇄ `main/preload.js`）

- 設定: `settings:get` / `settings:set` / `settings:choose-folder` / `settings:open-window`
- フォルダ操作: `folder:open`（`shell.openPath`） / `files:list`（録画フォルダ内のmp4/webm一覧、更新日時降順）
- ウィンドウ操作: `window:minimize` / `window:close`
- 範囲選択オーバーレイ: `overlay:open` / `overlay:cancel` / `overlay:region-confirmed`（renderer→main） / `region:confirmed`・`region:cancelled`（main→renderer）
- 指定ウィンドウピッカー: `sources:list-windows`（`desktopCapturer`でウィンドウ一覧+サムネイル取得） / `picker:open` / `picker:picked`（renderer→main） / `window:picked`（main→renderer、選択ウィンドウのタイトルから`getWindowBoundsByTitle`でPowerShell経由の実座標を付与）
- モニターピッカー: `monitors:list`（`screen.getAllDisplays()`の件数・bounds取得、件数チェック用） / `screens:list-thumbnails`（`desktopCapturer`の画面サムネイル + `display_id`でbounds紐付け） / `picker:open-monitor` / `monitor:picked`
- 赤枠: `border:show-fullscreen` / `border:show-region` / `border:hide`
- 録画: `recording:start`（録画開始時に`toolbarWindow.setContentProtection(true)`を有効化） / `recording:stop`（停止後に赤枠を消し`setContentProtection(false)`に戻す） / `recording:finished`（main→renderer、出力パス通知）

### 6.4 録画ロジック（`main/recorder.js`）

- `Recorder.start({ region, format, systemAudio, micAudio, saveFolder, audioDeviceName, micDeviceName })` でFFmpegプロセスをspawn
- 映像: `-f gdigrab -i desktop`。`region`指定時は`-offset_x/-offset_y/-video_size`でクロップ（全画面/指定ウィンドウ/範囲選択すべて、選択時に確定したbounds座標を渡す）
- 解像度はマルチモニター環境で奇数になることがあるため、`scale=trunc(iw/2)*2:trunc(ih/2)*2`フィルタで偶数に補正（libx264/libvpx-vp9の制約対応）
- 音声デバイスは`audioDeviceName`/`micDeviceName`未指定時、`ffmpeg -list_devices true -f dshow -i dummy`の出力（`spawnSync`でstdout+stderr両方を取得。`execFileSync`はexit code 0時にstderrを返さないため不採用）をパースして自動検出
  - システム音声候補: `ステレオ ミキサー` / `stereo mix` / `cable output` / `virtual-audio-capturer` のいずれかを含むデバイス名（先勝ち）
  - マイク候補: 上記に該当しない最初のデバイス
- 出力コーデック: mp4→`libx264`(yuv420p)+`aac`、webm→`libvpx-vp9`+`libopus`
- 停止時は標準入力に`q`を送信してFFmpegを正常終了、3秒でタイムアウトkill

### 6.5 既知の制約・注意点

- システム音声録音はWindowsのオーディオルーティング構成に依存（6.1参照）。コード側では解決不可能なケースがある
- `getWindowBoundsByTitle`はウィンドウタイトルの文字列一致で実座標を取得するため、同名タイトルが複数存在する場合は最初に見つかったものが対象になる
- `renderer/preview.html` / `preview.js` および`preload.js`の`closePreview`は現状未使用（旧実装の残骸、削除候補）
- ウィンドウは`resizable: false`固定（960×700px）

### 6.6 ディレクトリ構成

```
SysRec/
├── main/                       # Electronメインプロセス
│   ├── main.js                 # ウィンドウ生成・IPCハンドラ
│   ├── recorder.js             # FFmpeg制御（録画開始/停止・デバイス自動検出）
│   ├── settings.js             # 設定の読み書き（userData/settings.json）
│   └── preload.js              # contextBridgeでrenderer側にAPIを公開
├── renderer/                   # UI（フレームワーク不使用）
│   ├── index.html / renderer.js        # メインツールバー
│   ├── overlay.html / overlay.js       # 範囲選択オーバーレイ
│   ├── window-picker.html / .js        # 指定ウィンドウ選択ダイアログ
│   ├── monitor-picker.html / .js       # モニター選択ダイアログ
│   ├── border.html                     # 録画範囲の赤枠
│   ├── settings.html / settings.js     # 設定ウィンドウ
│   └── preview.html / preview.js       # （未使用・削除候補）
├── resources/
│   ├── ffmpeg/ffmpeg.exe        # バンドルFFmpeg（electron-builderで extraResources としても配布）
│   ├── icon.ico                 # インストーラー/exeアイコン
│   └── SysReclogo.png / SysRec_!.png / SysRec_logo.png / logo00.png  # UIロゴ各種
├── start-sysrec.bat             # 開発起動用バッチ
└── package.json                 # electron-builder設定（build フィールド）含む
```
