# Sparta Typing

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-orange)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-blue)

英単語タイピング学習アプリ．ローカルファースト（IndexedDB）で，端末内に学習データを保存します．type · master · advance.

**デモ（ブラウザですぐ遊べます）: https://uzuchan.github.io/Sparta-Typing.github.io/**

## スクリーンショット

<!-- TODO: スクリーンショットを docs/screenshots/ に置いて，下のコメントを外してください．
     おすすめ構成: ゲーム画面（Practice）/ Spartaモード / 学習記録（ヒートマップ）の3枚．
     画面収録なら GIF（macOS: Cmd+Shift+5 で録画 → gifski等で変換）が最も伝わります． -->
<!--
| ゲーム画面 | 学習記録 |
| --- | --- |
| ![ゲーム画面](docs/screenshots/gameplay.png) | ![学習記録](docs/screenshots/stats.png) |
-->

## 工夫した点

- **間隔反復による出題設計** — 単語ごとに6段階（seed → crown）の習熟度を持たせ，定着度が低い語を優先して再出題するロジックを自作．
- **1文字単位のローマ字判定** — 「コンピューター」を `konpyuutaa` でも `konpyu-ta-` でも受け付けるなど，複数のローマ字表記のゆれをリアルタイムに判定．
- **ローカルファースト設計** — サーバ不要．Dexie（IndexedDB）で学習データを端末内に保存し，JSON書き出し/復元で端末移行にも対応．
- **音声ファイルを使わない効果音** — Web Audio APIで効果音を合成し，アセットなしで軽量に動作．
- **継続したくなるゲームデザイン** — 10語ブロック解放制・コンボ倍率・HP制のSpartaモードで「もう1回」を誘発する設計．

## 特徴

- **3つのモード**
  - **Practice** — 時間内にじっくり．コンボ倍率で得点を伸ばす基本モード．
  - **Sparta** — 答えを隠し，記憶から入力する暗記モード．制限時間はPracticeと同じ．
  - **Endless** — 時間で終わらない耐久モード．5問ごとに制限時間が短縮．
- **1文字単位の入力可視化** — ローマ字入力の進捗を文字ごとに表示．
- **カタカナ読み対応** — カタカナ・半角カタカナの読みもローマ字入力で判定．
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
analyze,分析:ぶんせき/する
hypothesis,仮説:かせつ
computer,コンピューター
```

- `分析:ぶんせき` は「表示＝分析／入力読み＝ぶんせき」を意味します．
- `する` のように `:` が無い部分は，表示・読みが同じものとして扱われます．
- 上の例は表示「分析する」読み「ぶんせきする」になります．
- カタカナの読みはローマ字で入力できます（例: `コンピューター` → `konpyuutaa` または `konpyu-ta-`）．

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
