# Sparta Typing

英単語タイピング学習アプリ．ローカルファースト（IndexedDB）で，端末内に学習データを保存します．type · master · advance.

## 特徴

- **3つのモード**
  - **Practice** — 時間内にじっくり．コンボ倍率で得点を伸ばす基本モード．
  - **Sparta** — HP3・極端に短い制限時間・ノーヒント勝負の高難度モード．
  - **Endless** — 時間で終わらない耐久モード．5問ごとに制限時間が短縮．
- **1文字単位の入力可視化** — ローマ字入力の進捗を文字ごとに表示．
- **習熟度システム** — 単語ごとに6段階（seed → crown）で定着度を管理．間隔反復で出題．
- **10語ブロック制** — 習熟が基準に達すると次の10語が解放される．
- **学習記録** — 日次の出題数ヒートマップ，習熟度分布，苦手語Top20．
- **JSONバックアップ** — 端末移行に備えてデータを書き出し・復元できる．
- **合成効果音** — Web Audio APIで生成（音声ファイル不要）．

## 技術スタック

- Vite + React + TypeScript
- Zustand（状態管理）
- Dexie（IndexedDB ラッパ）
- Recharts（グラフ）

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build      # tsc -b && vite build → dist/ に出力
npm run preview    # ビルド成果物をローカル配信
```

## CSVの形式

`英単語,日本語解答` の2列．解答は `表示:読み/表示:読み` 形式で区切ります．

```
arise,起:お/こる
live,生:せい/活:かつ/を/送:おく/る
```

- `起:お` は「表示＝起／入力読み＝お」を意味します．
- `こる` のように `:` が無い部分は，表示・読みが同じものとして扱われます．
- 上の例は表示「起こる」読み「おこる」になります．

## GitHub Pages へのデプロイ

`main` ブランチへ push すると，GitHub Actions が自動でビルドして公開します．

### 初回セットアップ

1. このリポジトリを GitHub に push する．
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定する．
3. `main` に push すると `.github/workflows/deploy.yml` が動き，`https://<ユーザー名>.github.io/<リポジトリ名>/` に公開されます．

Source が **Deploy from a branch** のままだと，Vite の production build ではなくソースの `index.html` がそのまま公開されます．

`base` パスはワークフロー内でリポジトリ名から自動設定されるため，リポジトリ名を変更しても追従します．

### ローカルでサブパスを確認する場合

```bash
VITE_BASE=/sparta-typing/ npm run build
npm run preview
```

## データの保存場所

学習データはブラウザの IndexedDB に保存されます．別の端末・ブラウザには引き継がれないため，移行時は Stats 画面の「JSONで書き出し」でバックアップを取り，移行先で「復元」してください．
