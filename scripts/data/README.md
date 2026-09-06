# 抽出形式の定義

- `game-file-list.txt.gz`: 掲載データの生成に使用するゲーム内ファイル名
- `layouts.json.gz`: RE_RSZ の構造定義から使用する型を抜粋
- `layouts-current.json.gz`: 別バージョンの構造定義
- `layout-variants.json.gz`: 読み取りを検証した型ごとの構造定義

構造定義には型名、フィールド名、型、サイズ、アラインメント、CRC を格納しています。アイテム名や調合材料などの掲載内容は、抽出時にゲームの PAK から読み取ります。

構造定義の参照元: [dtlnor/RE_RSZ](https://github.com/dtlnor/RE_RSZ)、[alphazolam/RE_RSZ](https://github.com/alphazolam/RE_RSZ)

元の構造定義リビジョン: `60fc0631729e`、`1ef9f648d9c6`、`2002eb41c38d`、`f97857d43ac6`
