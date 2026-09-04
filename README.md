# MHWilds データベース

モンスターハンターワイルズのモンスター名またはアイテム名から、関連情報をまとめて確認できる攻略サイトです。PC とスマートフォンに対応しています。

## 掲載内容

- モンスターの特徴、弱点、肉質、出現場所、入手素材
- アイテムの基本情報、調合、モンスターからの入手方法、装備生産での使い道
- 日本語名によるモンスターとアイテムの横断検索

掲載データは、インストール済みゲームの PAK ファイルから再生成できます。抽出と変換には [mhdb-wilds-data](https://github.com/LartTyler/mhdb-wilds-data) を使用します。

## 起動

[mise](https://mise.jdx.dev/) を有効にした PowerShell で実行します。

```powershell
mise install
mise run setup
mise run dev
```

## ゲームデータの更新

ゲームを更新したあと、次のコマンドを実行します。抽出画面ではゲームフォルダー内の PAK ファイルを追加し、`user` と `msg` ファイルを選択します。

```powershell
mise run data
```

Steam の設定からゲームのインストール先を自動検出します。検出できない場合は `scripts/extract-game-data.ps1` の `GameDirectory` 引数、または `MH_WILDS_GAME_DIR` 環境変数で指定できます。

クエスト情報は、現在利用している抽出元に構造化データが追加されたあとに掲載対象へ含めます。
