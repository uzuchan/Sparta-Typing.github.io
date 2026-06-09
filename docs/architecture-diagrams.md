# Sparta Typing Architecture Diagrams

このドキュメントは、プロジェクト全体を把握するための図を次の順にまとめたものです。

1. プロジェクト概要図
2. ディレクトリ / モジュール構成図
3. 主要機能ごとの関数呼び出し図
4. ER図
5. データフロー図
6. シーケンス図

## 1. プロジェクト概要図

```mermaid
flowchart LR
  User["学習者"] -->|"ブラウザで操作"| App["Sparta Typing\nReact + Vite"]

  subgraph Browser["Browser runtime"]
    App --> Routes["Hash Router\nsrc/app/routes.ts"]
    App --> Pages["Pages\nHome / Import / Book / Play / Stats"]
    Pages --> Stores["Zustand Stores\nuseLibraryStore / useGameStore / useUiStore"]
    Pages --> UI["UI Components\nHud / WordCard / Modal / Icons"]
    Stores --> Lib["Domain Libraries\nscoring / mastery / romaji / parser"]
    Stores --> DB["Dexie\nspartaTypingDB"]
    Lib --> UI
  end

  DB --> IndexedDB[("IndexedDB\nlocal-first data")]
  Pages --> FileSystem["CSV / JSON files\nimport and backup"]
  App --> Audio["Web Audio API\nsynthetic SFX"]
  App --> Charts["Recharts\nstats visualization"]
```

## 2. ディレクトリ / モジュール構成図

```mermaid
flowchart TB
  Main["src/main.tsx"] --> App["src/app/App.tsx"]

  subgraph AppLayer["app"]
    App --> Routes["routes.ts\nhash parsing / navigation"]
    App --> UiStore["uiStore.ts\nsound preference / theme mode"]
  end

  App --> Pages["pages"]
  Pages --> Home["HomePage.tsx\nbook library"]
  Pages --> Import["ImportPage.tsx\nCSV registration"]
  Pages --> Book["BookPage.tsx\nbook detail and launch"]
  Pages --> Play["PlayPage.tsx\nmode selection / game stage"]
  Pages --> Stats["StatsPage.tsx\nlearning dashboard / backup"]
  Pages --> Result["ResultPage.tsx\nsession summary"]

  subgraph FeatureLayer["features"]
    LibraryStore["library/libraryStore.ts\nbook, word, progress, daily stats"]
    GameStore["game/gameStore.ts\nsession state and side effects"]
    Engine["game/engine.ts\npure question and tick logic"]
    GameUI["game/GameScreen.tsx\nHud / WordCard / effects"]
    TypingInput["game/useTypingInput.ts\nkeyboard and mobile input"]
    GameLoop["game/useGameLoop.ts\nrequestAnimationFrame loop"]
    Backup["stats/backup.ts\nJSON export / restore"]
  end

  subgraph LibLayer["lib"]
    Csv["csvImport.ts\nPapa Parse wrapper"]
    AnswerParser["answerParser.ts\ndisplay / reading parser"]
    Romaji["romaji.ts\nkana and English judgement"]
    Mastery["mastery.ts\nspaced repetition state"]
    Selector["questionSelector.ts\ncurrent / weak / review pool"]
    Scoring["scoring.ts\nnormal / sparta score"]
    Time["time.ts\ntime limit / hint timing"]
    Sfx["sfx.ts\nWeb Audio blips"]
    Helpers["helpers.ts\nnow / date / slug"]
  end

  subgraph Persistence["persistence"]
    DB["db/db.ts\nDexie schema"]
    Types["types.ts\ndomain record types"]
  end

  Import --> Csv
  Import --> AnswerParser
  Import --> Mastery
  Import --> LibraryStore
  Import --> DB

  Play --> GameStore
  Play --> LibraryStore
  Play --> GameUI
  GameUI --> TypingInput
  GameUI --> GameLoop
  GameLoop --> Engine
  GameStore --> Engine
  GameStore --> Selector
  GameStore --> Romaji
  GameStore --> Scoring
  GameStore --> Mastery
  GameStore --> Time
  GameStore --> Sfx
  GameStore --> DB
  GameStore --> LibraryStore

  Stats --> DB
  Stats --> Backup
  Stats --> Mastery
  Stats --> AnswerParser
  Backup --> DB
  LibraryStore --> DB
  UiStore --> DB
  UiStore --> Sfx
  DB --> Types
```

## 3. 主要機能ごとの関数呼び出し図

### 3.1 CSV登録

```mermaid
flowchart TD
  ImportPage["ImportPage.importCsv()"] --> ParseCsv["parseWordCsv(csv)"]
  ImportPage --> Now["nowIso()"]
  ImportPage --> Slug["slugify(bookTitle)"]
  ImportPage --> BuildBook["Book / Unit / WordItem を生成"]
  BuildBook --> InitialStats["createInitialStats(wordId)"]
  ImportPage --> Tx["db.transaction('rw', books, units, wordItems, wordStats, bookProgress)"]
  Tx --> AddBook["db.books.add(book)"]
  Tx --> AddUnits["db.units.bulkAdd(units)"]
  Tx --> AddWords["db.wordItems.bulkAdd(words)"]
  Tx --> AddStats["db.wordStats.bulkAdd(stats)"]
  Tx --> PutProgress["db.bookProgress.put(blockIndex=0)"]
  ImportPage --> Refresh["useLibraryStore.refreshBooks()"]
  Refresh --> CountWords["db.wordItems.where(bookId).count()"]
  Refresh --> Streak["computeStreak()"]
  ImportPage --> Navigate["navigate({ name: 'book', bookId })"]
```

### 3.2 ゲーム開始と出題

```mermaid
flowchart TD
  PlayPage["PlayPage.start()"] --> Init["useGameStore.init(params)"]
  Init --> GetWords["useLibraryStore.getWords(bookId)"]
  Init --> GetStats["useLibraryStore.getStatsMap(wordIds)"]
  Init --> GetProgress["useLibraryStore.getProgress(bookId)"]
  PlayPage --> Countdown["useGameStore.startCountdown()"]
  Countdown --> Begin["useGameStore.beginPlaying()"]
  Begin --> AddSession["db.sessions.add(session)"]
  Begin --> NextQuestion["nextQuestion(set, get, recent)"]

  NextQuestion --> CurrentBlock["currentBlockWords()"]
  NextQuestion --> WeakList["weakWordList()"]
  NextQuestion --> ReviewList["reviewWordList()"]
  WeakList --> IsWeak["isWeakWord(stats)"]
  ReviewList --> IsDue["isReviewDue(stats, now)"]
  NextQuestion --> Select["selectNextWord(...)"]
  Select --> ChoosePool["choosePool()"]
  Select --> PoolWords["poolWords(pool, params)"]
  Select --> Pick["pickRandom(candidates)"]
  NextQuestion --> BuildQuestion["buildQuestion(word, stats, direction, mode, pool)"]
  BuildQuestion --> ParseAnswer["getAnswerDisplay() / getAnswerReading()"]
  BuildQuestion --> Limit["calcTimeLimitMs(targetText.length)"]
```

### 3.3 入力判定と回答確定

```mermaid
flowchart TD
  GameScreen["GameScreen"] --> UseTyping["useTypingInput(...)"]
  UseTyping --> Allowed["allowedChar(direction, key)"]
  UseTyping --> OnChar["useGameStore.onChar(ch)"]
  UseTyping --> OnBackspace["useGameStore.onBackspace()"]

  OnChar --> Judge{"direction"}
  Judge -->|"en_to_ja"| JudgeRomaji["judgeRomajiInput(answerReading, input)"]
  Judge -->|"ja_to_en"| JudgeEnglish["judgeEnglishInput(question, input)"]
  JudgeRomaji --> MissOrMatch{"miss / match / completed"}
  JudgeEnglish --> MissOrMatch
  MissOrMatch -->|"miss"| MissSfx["sfx.miss()"]
  MissOrMatch -->|"match"| KeySfx["sfx.key()"]
  MissOrMatch -->|"completed"| Complete["completeQuestion(set, get, true)"]

  Complete --> Hint["getHintLevel(elapsedMs, timeLimitMs)"]
  Complete --> Normal["calcNormalScore(...)"]
  Complete --> Combo["comboMultiplier(combo)"]
  Complete --> Sparta["calcSpartaScore(...)"]
  Complete --> Quality["calcQuality(...)"]
  Complete --> MasteryRaw["updateMasteryRaw(oldRaw, quality)"]
  MasteryRaw --> MasteryLevel["toMasteryLevel(newRaw)"]
  MasteryLevel --> DueAt["calcNextDueAt(now, newLevel)"]
  Complete --> Attempt["Attempt を生成"]
  Complete --> SaveAttempt["db.transaction('rw', wordStats, attempts)"]
  SaveAttempt --> PutStats["db.wordStats.put(newStats)"]
  SaveAttempt --> AddAttempt["db.attempts.add(attempt)"]
  Complete --> SessionEnd{"session ended?"}
  SessionEnd -->|"yes"| Finalize["finalize(set, get)"]
  SessionEnd -->|"no"| NextQuestion["nextQuestion(...)"]
```

### 3.4 タイマー、ヒント、セッション終了

```mermaid
flowchart TD
  GameScreen["GameScreen"] --> LoopHook["useGameLoop()"]
  LoopHook --> Raf["requestAnimationFrame(loop)"]
  Raf --> Tick["tick(engineState, performance.now())"]
  Tick --> HintEvent["event: hint"]
  Tick --> TimeupEvent["event: timeup"]
  Tick --> EndEvent["event: session_end"]

  HintEvent --> OnHint["useGameStore.onHintChange(level)"]
  TimeupEvent --> OnTimeUp["useGameStore.onTimeUp()"]
  OnTimeUp --> CompleteFalse["completeQuestion(..., false)"]
  EndEvent --> PendingEnd["useGameStore.requestSessionEnd()"]

  CompleteFalse --> Finalize["finalize(set, get)"]
  PendingEnd --> Finalize
  Finalize --> UpdateSession["db.sessions.update(session totals)"]
  Finalize --> ReadAttempts["db.attempts.where(sessionId).toArray()"]
  Finalize --> RecordDaily["useLibraryStore.recordDaily(...)"]
  RecordDaily --> PutDaily["db.dailyStats.put(next)"]
  RecordDaily --> ComputeStreak["computeStreak()"]
  Finalize --> CanUnlock["canUnlockNextBlock(currentBlockStats)"]
  Finalize --> Summary["SessionSummary を生成"]
  Summary --> ResultPage["ResultPage"]
```

### 3.5 統計とバックアップ

```mermaid
flowchart TD
  StatsPage["StatsPage.useEffect()"] --> Daily["db.dailyStats.toArray()"]
  StatsPage --> WordStats["db.wordStats.toArray()"]
  StatsPage --> Words["db.wordItems.toArray()"]
  StatsPage --> Attempts["db.attempts.count()"]
  WordStats --> Dist["習熟度分布を集計"]
  WordStats --> Weak["isWeakWord(stats)"]
  Weak --> WeakRows["苦手語 Top20"]
  Daily --> Last30["buildLast30(daily)"]
  Last30 --> Chart["Recharts AreaChart / heatmap"]

  StatsPage --> Export["handleExport()"]
  Export --> ExportBackup["exportBackup()"]
  ExportBackup --> ReadAll["books / units / wordItems / wordStats / sessions / attempts / progress / dailyStats / prefs"]
  Export --> Download["downloadBackup(payload)"]

  StatsPage --> ImportFile["handleImportFile(file, mode)"]
  ImportFile --> ParseJson["JSON.parse(reader.result)"]
  ParseJson --> ImportBackup["importBackup(payload, mode)"]
  ImportBackup --> Validate["format === sparta-typing-backup"]
  ImportBackup --> Replace{"mode === replace"}
  Replace -->|"yes"| ClearAll["clear all stores"]
  Replace -->|"no"| BulkPut["bulkPut into all stores"]
  ClearAll --> BulkPut
  BulkPut --> RefreshBooks["refreshBooks()"]
```

## 4. ER図

このアプリは Dexie で IndexedDB を使っています。リレーショナルDBではありませんが、`types.ts` と `db/db.ts` のストア定義から見ると、実質的なデータ関係は次のようになります。

```mermaid
erDiagram
  BOOK ||--o{ UNIT : contains
  BOOK ||--o{ WORD_ITEM : contains
  BOOK ||--o{ SESSION : records
  BOOK ||--|| BOOK_PROGRESS : tracks
  UNIT ||--o{ UNIT : parent_child
  UNIT ||--o{ WORD_ITEM : groups
  WORD_ITEM ||--|| WORD_STATS : has
  WORD_ITEM ||--o{ ATTEMPT : answered_as
  SESSION ||--o{ ATTEMPT : includes
  DAILY_STAT ||--o{ SESSION : summarizes_by_date

  BOOK {
    string id PK
    string title
    string description
    Direction defaultDirection
    string createdAt
    string updatedAt
  }

  UNIT {
    string id PK
    string bookId FK
    string parentUnitId FK
    UnitType type
    string name
    string title
    number orderIndex
  }

  WORD_ITEM {
    string id PK
    string bookId FK
    string unitId FK
    number headwordNo
    string question
    string answerRaw
    string[] tags
    string note
    string createdAt
    string updatedAt
  }

  WORD_STATS {
    string wordId PK
    number seenCount
    number correctCount
    number wrongCount
    MasteryLevel masteryLevel
    number masteryRaw
    number streak
    number avgLatencyMs
    string lastSeenAt
    string dueAt
  }

  SESSION {
    string id PK
    string bookId FK
    string unitId FK
    Mode mode
    Direction direction
    string startedAt
    string endedAt
    number targetSeconds
    number totalQuestions
    number correctCount
    number wrongCount
    number normalScore
    number spartaScore
    number maxCombo
  }

  ATTEMPT {
    string id PK
    string sessionId FK
    string wordId FK
    boolean isCorrect
    number elapsedMs
    number timeLimitMs
    HintLevel hintLevel
    number missCount
    string typedText
    number normalScore
    number spartaScore
    Quality quality
    number combo
    boolean isBoss
    string createdAt
  }

  BOOK_PROGRESS {
    string bookId PK
    number blockIndex
    string updatedAt
  }

  DAILY_STAT {
    string date PK
    number sessionCount
    number totalQuestions
    number correctCount
    number masteryUpCount
  }

  USER_PREF {
    string key PK
    string value
  }
```

## 5. データフロー図

```mermaid
flowchart LR
  CsvFile["CSV text"] --> ImportPage["ImportPage"]
  ImportPage --> CsvParser["parseWordCsv"]
  CsvParser --> ImportedRecords["Book / Unit / WordItem / WordStats"]
  ImportedRecords --> LocalDB[("IndexedDB\nDexie stores")]

  LocalDB --> LibraryStore["useLibraryStore"]
  LibraryStore --> HomeBook["Home / Book pages"]
  HomeBook --> PlayPage["PlayPage"]

  PlayPage --> GameStore["useGameStore"]
  LocalDB --> GameStore
  GameStore --> EngineLibs["engine / selector / romaji / scoring / mastery"]
  EngineLibs --> GameStore
  GameStore --> GameScreen["GameScreen / Hud / WordCard"]
  UserInput["Keyboard / mobile input"] --> GameScreen
  GameScreen --> GameStore

  GameStore --> AttemptRecords["Attempt records"]
  GameStore --> UpdatedStats["Updated WordStats"]
  GameStore --> SessionRecord["Session totals"]
  GameStore --> DailyRecords["DailyStat"]
  AttemptRecords --> LocalDB
  UpdatedStats --> LocalDB
  SessionRecord --> LocalDB
  DailyRecords --> LocalDB

  LocalDB --> StatsPage["StatsPage"]
  StatsPage --> Charts["charts / heatmap / weak word table"]
  StatsPage --> BackupExport["exportBackup"]
  BackupExport --> JsonFile["Backup JSON"]
  JsonFile --> BackupImport["importBackup"]
  BackupImport --> LocalDB

  UiStore["useUiStore"] --> LocalDB
  UiStore --> SoundPref["soundEnabled"]
  SoundPref --> Sfx["Web Audio SFX"]
```

## 6. シーケンス図

### 6.1 CSVを登録して本を作る

```mermaid
sequenceDiagram
  actor User as 学習者
  participant ImportPage
  participant Csv as parseWordCsv
  participant Mastery as createInitialStats
  participant DB as Dexie / IndexedDB
  participant Library as useLibraryStore
  participant Router as navigate

  User->>ImportPage: CSVとBook情報を入力して登録
  ImportPage->>Csv: parseWordCsv(csv)
  Csv-->>ImportPage: rows
  ImportPage->>Mastery: createInitialStats(wordId) for each word
  Mastery-->>ImportPage: initial WordStats[]
  ImportPage->>DB: transaction add book, units, words, stats, progress
  DB-->>ImportPage: commit
  ImportPage->>Library: refreshBooks()
  Library->>DB: books and word counts
  DB-->>Library: library data
  Library-->>ImportPage: refreshed
  ImportPage->>Router: navigate(book page)
```

### 6.2 プレイ開始から1問を解く

```mermaid
sequenceDiagram
  actor User as 学習者
  participant PlayPage
  participant GameStore as useGameStore
  participant Library as useLibraryStore
  participant DB as Dexie / IndexedDB
  participant Engine as engine and selector
  participant GameScreen
  participant Input as useTypingInput
  participant Lib as romaji / scoring / mastery

  User->>PlayPage: mode, direction, durationを選んでスタート
  PlayPage->>GameStore: init(params)
  GameStore->>Library: getWords, getStatsMap, getProgress
  Library->>DB: read words, stats, progress
  DB-->>Library: data
  Library-->>GameStore: words, statsMap, progress
  PlayPage->>GameStore: startCountdown()
  GameStore->>GameStore: beginPlaying()
  GameStore->>DB: sessions.add(session)
  GameStore->>Engine: nextQuestion -> selectNextWord -> buildQuestion
  Engine-->>GameStore: GameQuestion
  GameStore-->>GameScreen: current question state
  User->>Input: type characters
  Input->>GameStore: onChar(ch)
  GameStore->>Lib: judgeRomajiInput or judgeEnglishInput
  Lib-->>GameStore: match / miss / completed
  alt completed
    GameStore->>Lib: calc score, quality, mastery, dueAt
    Lib-->>GameStore: scoring and stats result
    GameStore->>DB: transaction put WordStats and add Attempt
    DB-->>GameStore: commit
    GameStore->>Engine: nextQuestion or finalize
  else miss
    GameStore-->>GameScreen: miss flash and sound
  end
```

### 6.3 タイムアップまたは制限時間終了

```mermaid
sequenceDiagram
  participant GameScreen
  participant Loop as useGameLoop
  participant Engine as tick
  participant GameStore as useGameStore
  participant DB as Dexie / IndexedDB
  participant Library as useLibraryStore
  participant ResultPage

  GameScreen->>Loop: phase is playing
  Loop->>Engine: tick(engineState, now)
  Engine-->>Loop: hint / timeup / session_end events
  alt hint
    Loop->>GameStore: onHintChange(level)
  else timeup
    Loop->>GameStore: onTimeUp()
    GameStore->>GameStore: completeQuestion(false)
    GameStore->>DB: save Attempt and WordStats
  else session_end
    Loop->>GameStore: requestSessionEnd()
  end
  GameStore->>GameStore: finalize()
  GameStore->>DB: update Session totals
  GameStore->>DB: read Attempts for session
  GameStore->>Library: recordDaily(summary delta)
  Library->>DB: put DailyStat
  Library->>DB: compute streak from dailyStats
  GameStore-->>ResultPage: SessionSummary
```

### 6.4 統計閲覧とバックアップ

```mermaid
sequenceDiagram
  actor User as 学習者
  participant StatsPage
  participant DB as Dexie / IndexedDB
  participant Backup as backup.ts
  participant File as JSON file

  User->>StatsPage: Statsを開く
  StatsPage->>DB: read dailyStats, wordStats, wordItems, attempts
  DB-->>StatsPage: raw learning data
  StatsPage->>StatsPage: buildLast30, mastery distribution, weak word ranking
  StatsPage-->>User: chart, heatmap, weak words

  User->>StatsPage: JSONで書き出し
  StatsPage->>Backup: exportBackup()
  Backup->>DB: read all stores
  DB-->>Backup: backup data
  Backup-->>StatsPage: BackupPayload
  StatsPage->>Backup: downloadBackup(payload)
  Backup-->>File: sparta-typing-backup-yyyy-mm-dd.json

  User->>StatsPage: JSONを復元
  StatsPage->>File: readAsText(file)
  StatsPage->>Backup: importBackup(payload, merge or replace)
  Backup->>DB: clear stores when replace
  Backup->>DB: bulkPut all stores
  DB-->>StatsPage: restored
```
