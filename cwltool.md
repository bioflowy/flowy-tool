* process.avroize_typeでCWL typeを正規の者に変換
* process._init_jobからfill_in_defaultsを呼び出してdefaultを設定
* builder.bind_inputで、input_bindsに対してdatum、positionを付加,File,Directoryを収集して、builder.filesに格納
* pathmapper.visitでstage用のパスを生成
* commandline_tool.check_adjustでpathmapperで生成したStage用のパスをbuilder.files、builder.bind_inputのPathに移す。nameroot,basename,nameextも追加
* process.stage_filesで、stageにリンクを作成
* builder.generate_argで、input_bindsからcommand_lineを生成

* basedirはjob_order_fileのベースディレクトリ
* jobのoutdirとbuilderのoutdirはなにが違うのか
jobのoutdirはホスト上のpath、builderのoutdirはコンテナ上のパス