# MHWilds データベース

モンスターハンターワイルズのモンスター名またはアイテム名から、関連情報をまとめて確認できる攻略サイトです。PC とスマートフォンに対応しています。

## 掲載内容

- モンスターの特徴、弱点、肉質、出現場所、入手素材
- アイテムの基本情報、採取場所、モンスター・クエスト報酬、支給品、素材採集依頼、交換、調理、錬金、調合、装備生産での使い道
- 日本語名によるモンスターとアイテムの横断検索

基本データは [mhdb-wilds-data](https://github.com/LartTyler/mhdb-wilds-data) の統合 JSON、追加の入手先はインストール済みゲームのファイルから生成します。

## 起動

[mise](https://mise.jdx.dev/) を有効にした PowerShell で実行します。

```powershell
mise install
mise run setup
mise run dev
```

開発サーバーは外部接続を受け付ける設定で起動します。同じネットワーク上の端末からは、開発 PC の IP アドレスにポート `5173` を付けてアクセスします。

作業用のキャッシュとビルド成果物を削除するときは、次のコマンドを実行します。

```powershell
mise run clean
```

## ゲームデータの更新

データを更新するときは、次のコマンドを実行します。上流リポジトリから必要な統合 JSON だけを取得し、サイト用データを生成します。

```powershell
mise run data
```

入手先を更新するときは、ゲームのインストール先を指定します。

```powershell
mise run extract -- "<ゲームのインストール先>"
```

ファイルの展開と読み取りはプロジェクト内のスクリプトで行います。ファイル名一覧とデータ構造の定義をダウンロードし、ゲームから採取・報酬・販売・交換の情報を抽出します。ダウンロードした資料、展開ファイル、解析結果は `.cache/direct/` にまとまり、`mise run clean` で削除できます。

形式の参照元: [ree-pak-rs](https://github.com/eigeen/ree-pak-rs)、[RE_RSZ](https://github.com/dtlnor/RE_RSZ/tree/MHWilds)、[REMSG_Converter](https://github.com/dtlnor/REMSG_Converter)
