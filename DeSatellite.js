/*
   DesSatellite.js

   Purpose:

      - black paint satellite trails
      or
      - replace satellite tracks with pixels from a reference frame


   Copyright (C) 2026, Kidani Bunkei

   mailto: peseta_aircrew.6d@icloud.com

   Modified for color image support, Undo functionality, and file open


   Acknowledgements

   Hartmut V. Bornemann for his SKill.js

   Andres del Pozo for his PreviewControl.js

   stackoverflow for a nice curve interpolation function

   Herbert Walter and Gerald Wechselberger for testing and tips
*/


#feature-id    Utilities > DeSatellite

#include <pjsr/BitmapFormat.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/Slider.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/Color.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/ButtonCodes.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/PenStyle.jsh>

#define VERSION "1.0.1"
#define DEFAULT_AUTOSTRETCH_SCLIP -2.80
// Target mean background in the [0,1] range.
#define DEFAULT_AUTOSTRETCH_TBGND   0.25
#define DEFAULT_AUTOSTRETCH_CLINK   false

#define PenCap_Round 2

#define ID        "DeSatellite"
#define TITLE     ID + " " + VERSION

// i18n の再起動シグナル (dialog.done() の戻り値として使用)
#define LANG_RESTART_CODE 42


// *****************************************************************************
// Localization (i18n)
//
// 表示言語を英語 / 日本語で切り替えるための最小インフラ。
//   - LANG: 言語別の辞書 (キーは snake_case、値は表示文字列)
//   - T(key): 現在言語の辞書を引くヘルパー。キーが無ければ英語 → キー文字列そのもの の順にフォールバック。
//   - loadLang / saveLang: Settings API で次回起動時にも選択言語を引き継ぐ。
//   - currentLang: 現在選択されている言語 ('en' | 'ja')。
//
// 使い方:
//   btnApply.text   = T("apply");
//   btnApply.toolTip = T("apply_tooltip");
// 新しい文言を追加するときは必ず en/ja 両方にキーを足すこと。
//
// 言語切替ツールバーボタンは言語 ToolButton を frame0 に配置し、
// クリックで currentLang をトグル + Settings 保存 + dialog.done(LANG_RESTART_CODE)
// によってダイアログを再起動する。
// *****************************************************************************

var LANG = {
   en: {
      // --- toolbar ---
      lang_tooltip:      "Switch language (English / Japanese)",
      restore_window:    "Restore this dialog window",
      maximize_window:   "Maximize this window",
      autostretch:       "AutoStretch ON/OFF\nDisplay preview with temporary auto stretch.",
      loupe_tooltip:     "<b>Loupe</b><p>" +
                         "Shows a magnified square view around the cursor for precise point placement. " +
                         "Existing points and lines inside the loupe are also magnified, " +
                         "helping you fine-tune anchor positions on a curved track.",

      // --- main action buttons ---
      add:               "Add",
      add_tooltip:       "<b>Start with a new tracking line.</b><p>" +
                         "Click at track start and track end. If the track is curved, add one or more points.<p>" +
                         "Each point marks a movable anchor point. Precision can be improved by clicking inside the circle and moving the cursor.",
      undo:              "Undo",
      undo_tooltip:      "<b>Undo last point.</b><p>" +
                         "Remove the last added point from the selected track.<p>" +
                         "If the track becomes empty, the entire track is removed.",
      edit:              "Edit",
      edit_tooltip:      "<b>Edit existing anchor points.</b><p>" +
                         "While this mode is ON, clicking inside an anchor circle selects that track " +
                         "and lets you drag the anchor to a new position. Clicks outside any anchor " +
                         "are ignored — new anchors are NOT placed.<p>" +
                         "Useful when start/end anchors overlap and adding a new point keeps selecting " +
                         "the wrong track. Click the button again to leave edit mode.",
      apply:             "   Apply",
      apply_tooltip:     "<b>Process track paintings on view.</b><p>" +
                         "This will result in either a black line or a merge with a reference view.",
      processing:        "*** Processing ***",
      line_width:        "Line width",
      line_width_preset_tip: "Select from presets",
      line_width_edit_tip:   "Type a value and press Enter",

      // --- target view selector ---
      target_select_placeholder: "Select target",
      target_open_file:  "--- Open File... ---",
      target_ofd_caption:  "Select file(s) to process",
      output_folder_caption: "Select output folder",

      // --- reference view selector ---
      reference_select_placeholder: "No Reference",
      reference_open_file:          "--- Open File... ---",
      reference_ofd_caption:        "Open Reference Image",

      // --- preview / reference toggle ---
      preview_tip:       "<b>Preview painting option.</b><p>" +
                         "If checked, the preview lines are painted with defined width.",
      reference_show:    "Reference",
      reference_show_tip:"<b>Show reference image in the preview pane.</b><p>" +
                         "If checked, the reference image is displayed in the preview " +
                         "area instead of the target image, so you can verify the " +
                         "reference image without leaving this dialog.<p>" +
                         "Uncheck to return to the target image preview.",

      // --- batch panel ---
      batch_queue_add:   "Add files to queue...",
      batch_queue_tip:   "Select multiple image files and register them in the batch queue.",
      output_folder:     "Output folder...",
      output_folder_tip: "Specify the destination folder for processed files.",
      not_set:           "(not set)",
      suffix_label:      "Suffix:",
      suffix_tip:        "Suffix appended to output filenames. e.g. image001_ds.xisf",
      queue_list_tip:    "Batch queue file list.",
      save_and_next:     "Save and next",
      save_and_next_tip: "Apply tracks, save to output folder, and move to the next file.",
      skip_copy:         "Skip (copy)",
      skip_copy_tip:     "Copy this file to the output folder without applying tracks, then move to the next file.",
      skip_no_copy:      "Skip (no copy)",
      skip_no_copy_tip:  "Do not save or copy this file; move to the next file.",
      batch_progress:    "%done% / %total% completed",
      batch_done:        "Batch processing completed.",
      batch_done_title:  "Batch processing complete",
      batch_cancel:      "Cancel batch",
      batch_cancel_tip:  "Stop the batch processing immediately.",
      batch_cancel_msg:  "Batch processing was cancelled.",
      batch_cancel_title:"Batch cancelled",

      // --- reference / messages ---
      channel_mismatch_title: "Channel Mismatch",
      channel_mismatch_msg:   "The main image and the Reference image have different channel counts.\nContinue anyway?",
      channel_mismatch_detail: "The main image and the Reference have different channel counts.\n\n" +
                               "  Main image : %target% ch\n" +
                               "  Reference  : %ref% ch\n\n" +
                               "When continuing, 3ch→1ch is converted to luminance (Rec.709),\n" +
                               "and 1ch→3ch applies the same value to all channels.\n" +
                               "Results may differ from expectations. Continue?",
      reference_not_found_title: "Reference not found",
      reference_not_found_msg:   "The selected Reference view was not found.\nThe reference selection has been reset.",
      main_image_required:    "A main image is required.",
      main_image_required_title: "Main image required",
      error:                  "Error",

      // --- help ---
      help_tooltip:
         '<p><b><font size="5">Satellite track removal</font></b><br></p>' +
         '<p><font size="4"><b>DeSatellite</b> usage summary:</font><br></p>' +
         '<p>- <b>Target image</b>: select or open the image to process</p>' +
         '<p>- <b>Reference (optional)</b>: select a reference frame</p>' +
         '<p>&nbsp;&nbsp;Track pixels are replaced with matching pixels from the reference</p>' +
         '<p>- <b>Add</b>: start a new track</p>' +
         '<p>- <b>Undo</b>: remove the last point from the selected track</p>' +
         '<p>- <b>Edit</b>: move existing anchor points</p>' +
         '<p>- <b>Apply</b>: apply the track mask to the current image<br></p>' +
         '<p>- <b>Line width</b>: thickness of the track mask</p>' +
         '<p>- <b>Preview</b>: overlay the drawn track on the processed image</p>' +
         '<p>- <b>Reference</b>: display the reference image in the preview</p>' +
         '<p>- <b>Multi Point Mode (Curve)</b>: draw curved tracks</p>' +
         '<p>- <b>Add files to queue</b>: select files for batch processing</p>' +
         '<p>- <b>Output folder</b>: destination folder for processed files</p>' +
         '<p>- <b>Suffix</b>: suffix appended to output filenames</p>' +
         '<p><u><font size="4">Mouse operations:</font></u></p>' +
         '<p>- Click anywhere: adds a new anchor point to the selected track</p>' +
         '<p>- Drag inside an anchor: moves the anchor point</p>' +
         '<p>- CTRL/⌘ + click inside an anchor: removes the point<br></p>',

      // --- misc ---
      copyright:         "(c) 2026, B.Kidani "
   },

   ja: {
      lang_tooltip:      "表示言語を切り替え (英語 / 日本語)",
      restore_window:    "ウインドウを元のサイズに戻す",
      maximize_window:   "ウインドウを最大化",
      autostretch:       "AutoStretch ON/OFF\n一時的に自動ストレッチを適用してプレビュー表示します。",
      loupe_tooltip:     "<b>ルーペ (拡大鏡)</b><p>" +
                         "カーソル位置を正方形に拡大表示して、精密なポイント配置を助けます。" +
                         "既に置いたポイントやラインもルーペ内では拡大されるので、" +
                         "カーブしたトラックのアンカー位置の微調整に便利です。",

      add:               "追加",
      add_tooltip:       "<b>新しいトラックを開始します。</b><p>" +
                         "トラックの始点と終点をクリックします。曲線状の場合は途中にも点を追加してください。<p>" +
                         "各点は移動可能なアンカーポイントとして表示されます。円の中をクリックしてドラッグすると位置を微調整できます。",
      undo:              "取消し",
      undo_tooltip:      "<b>最後のポイントを取消します。</b><p>" +
                         "選択中のトラックから最後に追加したポイントを削除します。<p>" +
                         "トラックが空になった場合はトラック自体も削除されます。",
      edit:              "編集",
      edit_tooltip:      "<b>既存アンカーポイントの編集モード</b><p>" +
                         "このモードが ON の間、アンカーの円の中をクリックするとそのトラックが選択され、" +
                         "ドラッグでアンカー位置を移動調整できます。円の外をクリックしても無視され、" +
                         "新しいアンカーは<b>置かれません</b>。<p>" +
                         "始点と終点が重なって新規クリックでは別トラックになってしまう場面で、" +
                         "既存ポイントを確実に掴んで動かせます。もう一度押すと編集モードを解除します。",
      apply:             "   適用",
      apply_tooltip:     "<b>トラックをビューに適用して描画します。</b><p>" +
                         "黒塗りまたは Reference ビューとの合成のいずれかが実行されます。",
      processing:        "*** 処理中 ***",
      line_width:        "線幅",
      line_width_preset_tip: "プリセットから選択",
      line_width_edit_tip:   "数値を直接入力して Enter",

      target_select_placeholder: " 処理画像選択 ",
      target_open_file:  "--- Open File... ---",
      target_ofd_caption:  "処理するファイルを選択",
      output_folder_caption: "出力フォルダを選択",

      // --- reference view selector ---
      reference_select_placeholder: "リファレンスなし",
      reference_open_file:          "--- Open File... ---",
      reference_ofd_caption:        "リファレンス画像を開く",

      // --- preview / reference toggle ---
      preview_tip:       "<b>プレビュー表示の切替</b><p>" +
                         "チェックすると、設定した線幅でトラックがプレビューに描画されます。",
      reference_show:    "Reference",
      reference_show_tip:"<b>リファレンス画像をプレビュー画面に表示します。</b><p>" +
                         "チェックすると、ターゲット画像の代わりにリファレンス画像が" +
                         "プレビュー領域に表示されます。スクリプトを離れずに" +
                         "リファレンス画像の内容を確認できます。<p>" +
                         "チェックを外すとターゲット画像のプレビューに戻ります。",

      batch_queue_add:   "一括処理ファイル登録",
      batch_queue_tip:   "複数の画像ファイルを選択してバッチキューに登録します。",
      output_folder:     "出力フォルダ指定 ",
      output_folder_tip: "処理済みファイルの保存先フォルダを指定します。",
      not_set:           "（未設定）",
      suffix_label:      "サフィックス:",
      suffix_tip:        "出力ファイル名に付加するサフィックス。例: image001_ds.xisf",
      queue_list_tip:    "バッチキューのファイル一覧。",
      save_and_next:     "保存して次へ",
      save_and_next_tip: "トラックを適用して出力フォルダに保存し、次のファイルへ移ります。",
      skip_copy:         "スキップ（コピー）",
      skip_copy_tip:     "トラックを適用せずそのまま出力フォルダにコピー保存し、次のファイルへ移ります。",
      skip_no_copy:      "スキップ（コピーなし）",
      skip_no_copy_tip:  "このファイルを保存もコピーもせず次のファイルへ移ります。",
      batch_progress:    "%done% / %total% 完了",
      batch_done:        "バッチ処理が完了しました。",
      batch_done_title:  "バッチ処理完了",
      batch_cancel:      "バッチ中止",
      batch_cancel_tip:  "バッチ処理を即座に中止します。",
      batch_cancel_msg:  "バッチ処理を中止しました。",
      batch_cancel_title:"バッチ中止",

      channel_mismatch_title: "Channel Mismatch",
      channel_mismatch_msg:   "メイン画像と Reference のチャンネル数が異なります。\n続行しますか？",
      channel_mismatch_detail: "メイン画像と Reference のチャンネル数が異なります。\n\n" +
                               "  メイン画像 : %target% ch\n" +
                               "  Reference  : %ref% ch\n\n" +
                               "続行する場合、3ch→1ch は輝度(Rec.709)に変換され、\n" +
                               "1ch→3ch は全チャンネルに同じ値が適用されます。\n" +
                               "期待と異なる結果になる可能性があります。続行しますか？",
      reference_not_found_title: "Reference not found",
      reference_not_found_msg:   "選択された Reference ビューが見つかりません。\n選択をリセットします。",
      main_image_required:    "メイン画像が必要です。",
      main_image_required_title: "メイン画像が必要です",
      error:                  "エラー",

      // --- help ---
      help_tooltip:
         '<p><b><font size="5">人工衛星軌跡の除去</font></b><br></p>' +
         '<p><font size="4"><b>DeSatellite</b> 使い方の概要：</font><br></p>' +
         '<p>- <b>処理画像選択</b>：処理する画像ファイルを開きます</p>' +
         '<p>- <b>リファレンス選択（任意）</b>：リファレンス画像を選択</p>' +
         '<p>&nbsp;&nbsp;リファレンス画像を使うとトラック部分をリファレンス画像のピクセルで置き換えられます</p>' +
         '<p>- <b>追加</b>：新しいトラックを追加</p>' +
         '<p>- <b>取消し</b>：選択中のトラックから最後のポイントを削除</p>' +
         '<p>- <b>編集</b>：アンカーポイント移動</p>' +
         '<p>- <b>適用</b>：トラックを描画します<br></p>' +
         '<p>- <b>線幅</b>：描画するトラックの太さ指定</p>' +
         '<p>- <b>Preview</b>：トラック表示を処理後画像に切替え</p>' +
         '<p>- <b>Reference</b>：トラック表示をリファレンス画像に切り替え</p>' +
         '<p>- <b>Multi Point Mode (Curve)</b>：曲線トラックを描画</p>' +
         '<p>- <b>一括処理ファイル登録</b>：一括処理するファイルの指定</p>' +
         '<p>- <b>出力フォルダ指定</b>：出力ファルだの指定</p>' +
         '<p>- <b>サフィックス</b>：出力ファイル名に追加するサフィックスの指定</p>' +
         '<p><u><font size="4">マウス操作：</font></u></p>' +
         '<p>- 画像をクリック：画像にアンカーポイントを追加</p>' +
         '<p>- アンカー内でドラッグ：編集モードのときポイントを移動</p>' +
         '<p>- CTRL/⌘ ＋ クリック + アンカー内クリック：ポイントを削除<br></p>',

      copyright:         "(c) 2026, B.Kidani "
   }
};

// 現在言語。loadLang() で初期化される (Settings 無い場合は 'ja' デフォルト)。
var currentLang = 'ja';

// 辞書引きヘルパー。キーが無ければ英語辞書 → キーそのもの の順にフォールバック。
function T(key)
{
   var d = LANG[currentLang];
   if (d && typeof d[key] != 'undefined') return d[key];
   if (LANG.en && typeof LANG.en[key] != 'undefined') return LANG.en[key];
   return key;
}

// =====================================================================
// ComboBox の表示テキストを擬似的に中央揃えするユーティリティ。
// PJSR/Qt の標準 ComboBox は stylesheet の text-align を表示テキストに
// 反映できないため、先頭にスペースを埋めて視覚的に中央寄せする。
// 末尾スペースは左寄せ表示で見えないので、先頭側だけ計算で埋める。
// =====================================================================
function leadPadCenter(text, font, availPx)
{
   var t = String(text == null ? "" : text);
   try
   {
      var f = font || new Font("Helvetica", 9);
      var textW  = f.width(t);
      var spaceW = Math.max(1, f.width(' '));
      var pad    = Math.max(0, availPx - textW);
      var n      = Math.floor((pad / 2) / spaceW);
      var lead   = '';
      for (var i = 0; i < n; i++) lead += ' ';
      return lead + t;
   }
   catch (e) { return t; }
}

// addItem / setItemText / itemText をラップして自動的に中央寄せする。
// 既存の itemText 比較は trim() なしでも動くよう、itemText は元テキストを返す。
function applyComboCenterAlignment(combo, availPx)
{
   var origAdd      = combo.addItem;
   var origSetText  = combo.setItemText;
   var origItemText = combo.itemText;

   combo.addItem = function (text)
   {
      origAdd.call(this, leadPadCenter(text, this.font, availPx));
   };
   combo.setItemText = function (idx, text)
   {
      origSetText.call(this, idx, leadPadCenter(text, this.font, availPx));
   };
   combo.itemText = function (idx)
   {
      var v = origItemText.call(this, idx);
      // 先頭スペースだけ落として元テキストを返す (内部に含まれるスペースは保持)
      return (v == null) ? v : v.replace(/^ +/, '');
   };
}

// PixInsight Settings API で現在言語を永続化する。
function loadLang()
{
   try
   {
      var v = Settings.read(ID + "/language", DataType_String);
      if (v == 'en' || v == 'ja') return v;
   }
   catch (ex) { /* ignore */ }
   return 'ja';
}

function saveLang(lang)
{
   try
   {
      Settings.write(ID + "/language", DataType_String, lang);
   }
   catch (ex) { /* ignore */ }
}


// *****************************************************************************
//
// object to hold track points and methods for one track
//
function Track(index, bounds, trackStateCallback, trackCollection)
{
   //
   // add new point
   //
   this.addPoint = function (x, y)
   {
      this.trackPoints.push(new Point(x, y));
      this.x0 = x;
      this.y0 = y;
      this.reorder();

      for (var i = 0; i < this.trackPoints.length; i++)
      {
         var p = this.trackPoints[i];
         if (p.x == x && p.y == y)
         {
            this.pointIndex = i;
         }
      }
      this.callback(this.trackCollection, false);
   }
   //
   // remove the currently clicked point
   //
   this.removePoint = function ()
   {
      if (this.pointIndex < 0 || this.pointIndex >= this.trackPoints.length) return;
      this.trackPoints.splice(this.pointIndex, 1);
      this.callback(this.trackCollection, false);
   }
   //
   // remove the last added point (for Undo)
   //
   this.removeLastPoint = function ()
   {
      if (this.trackPoints.length == 0) return false;
      this.trackPoints.pop();
      this.callback(this.trackCollection, false);
      return true;
   }
   //
   //
   //
   this.reorder = function ()
   {
      if (this.trackPoints.length > 2)
      {
         var u = -1;
         var v = -1;
         var m = 0;
         for (var i = 0; i < this.trackPoints.length; i++)
         {
            for (var j = 0; j < this.trackPoints.length; j++)
            {
               if (i == j) continue;
               var d = dist(this.trackPoints[i], this.trackPoints[j]);
               if (d > m)
               {
                  m = d;
                  u = i;
                  v = j;
               }
            }
         }
         //
         // get points in ascending diff from point[i]
         //
         var points = [];
         points.push(this.trackPoints[u]);
         for (var i = 0; i < this.trackPoints.length; i++)
         {
            if (i != u && i != v) points.push(this.trackPoints[i]);
         }
         points.push(this.trackPoints[v]);
         //
         // now 1st and last are in their position
         //
         this.trackPoints = [...points];
         //
         var pIndex = [];
         for (var i = 0; i < this.trackPoints.length; i++)
         {
            var d = dist(this.trackPoints[0], this.trackPoints[i]);
            pIndex.push(new Point(d, i));
         }
         //
         pIndex.sort(function(a,b) {
            if( a.x == b.x) return a.y-b.y;
            return a.x-b.x;
         });
         //
         points = [];
         //
         for (var i = 0; i < pIndex.length; i++)
            points.push(this.trackPoints[pIndex[i].y]);
         this.trackPoints = [...points];
      }
   }

   function dist(tp1, tp2)
   {
      return Math.sqrt(Math.pow(tp1.x - tp2.x, 2) + Math.pow(tp1.y - tp2.y, 2));
   }

   // paint black line

   this.paintMask = function (g, lineWidth)
   {
      if (this.trackPoints.length < 2) return;

      var pen = new Pen(0xff000000, lineWidth, PenStyle_Solid, PenCap_Round);

      g.pen = pen;

      var curve = getCurvePoints(this.trackPoints);

      if (curve && curve.length > 0)
      {
         g.drawPolyline(curve);
      }
   }

      this.paintPreview = function (g, scale, mul, markerPenImg)
   {
      if (this.trackPoints.length === 0) return;

      // scale はプレビューのズーム倍率 (preview.scale)。
      // graphics には scaleTransformation が適用されているため、
      // 画面上のマーカー見かけ大きさを一定に保つには tick/radius を scale で割る。
      // mul はマーカー (十字 + ペン太さ) の拡大倍率。省略時 1。
      // markerPenImg を渡した場合はマーカー用ペン幅を画像座標で直接指定する
      // (mul のロジックを上書き。ルーペ内で screen-px 厳密指定するときに使う)。
      var s = (scale && scale > 0) ? scale : 1;
      var m = (mul && mul > 0) ? mul : 1;
      var tick   = (this.tick * m) / s;
      var radius = this.radius / s;

      // 1点以上ある場合は常にマーカー（十字 + 円）を描画
      if (markerPenImg !== undefined && markerPenImg > 0)
         g.pen = new Pen(this.penColor, markerPenImg);
      else if (m > 1)
         g.pen = new Pen(this.penColor, m / s);
      else
         g.pen = new Pen(this.penColor);

      for (var i = 0; i < this.trackPoints.length; i++)
      {
         var x = this.trackPoints[i].x;
         var y = this.trackPoints[i].y;
         g.drawLine(x - tick, y, x + tick, y);   // 横線
         g.drawLine(x, y - tick, x, y + tick);   // 縦線
         g.drawEllipse(x - radius, y - radius, x + radius, y + radius); // 円
      }

      // 2点以上ある場合のみ曲線を描画
      if (this.trackPoints.length >= 2)
      {
         var pen = new Pen(this.penColor, this.lineWidth, PenStyle_Solid, PenCap_Round);
         g.pen = pen;

         var curve = getCurvePoints(this.trackPoints);
         if (curve && curve.length > 0)
         {
            g.drawPolyline(curve);
         }
      }
   }
   //
   // check, if mouse clicked a circle
   //
   this.isPointSelected = function (x, y, scale)
   {
      // scale はプレビューのズーム倍率。画面上のクリック判定範囲を
      // マーカー見かけ大きさと同じにするため radius を scale で割る。
      var s = (scale && scale > 0) ? scale : 1;
      var hitRadius = this.radius / s;

      for (var i = 0; i < this.trackPoints.length; i++)
      {
         var dist = Math.sqrt(Math.pow(x - this.trackPoints[i].x, 2) +
                              Math.pow(y - this.trackPoints[i].y, 2));
         if (dist <= hitRadius)
         {
            this.pointIndex = i;
            return true;
         }
      }
      return false;
   }


   this.mouseDown = function (x, y)
   {
      this.x0 = x;
      this.y0 = y;
   }


      this.mouseMove = function (x, y)
   {
      var dx = x - this.x0;
      var dy = y - this.y0;

      if (this.pointIndex < 0 || this.pointIndex >= this.trackPoints.length)
         return;

      var p = this.trackPoints[this.pointIndex];

      // p が有効な Point オブジェクトであることを確認
      if (!p || typeof p.x === 'undefined' || typeof p.y === 'undefined')
         return;

      // 移動後の座標を算出してから画像範囲内にクランプする。
      // (旧実装は移動前の座標だけをクランプしていたため、dx/dy を加算した結果が bounds の外に出ていた)
      var newX = p.x + dx;
      var newY = p.y + dy;

      if (newX < this.bounds.x0) newX = this.bounds.x0;
      if (newY < this.bounds.y0) newY = this.bounds.y0;
      if (newX > this.bounds.x1) newX = this.bounds.x1;
      if (newY > this.bounds.y1) newY = this.bounds.y1;

      this.trackPoints[this.pointIndex] = new Point(newX, newY);

      this.x0 = x;
      this.y0 = y;
   }

   this.mouseUp = function (x, y)
   {
      this.reorder();
   }

   this.count = function ()
   {
      return this.trackPoints.length;
   }

   this.x0 = 0;
   this.y0 = 0;

   this.lineWidth = 1;

   this.penColor = 0;

   // マーカーの見かけサイズ (画面ピクセル換算)。従来 tick=28 / radius=24 の約 1/3。
   this.tick = 28 / 3;

   this.radius = 24 / 3;

   this.bounds = bounds;

   this.selected = false;

   this.pointIndex = -1;

   this.trackIndex = index;

   this.trackPoints = [];

   this.callback = trackStateCallback;

   this.trackCollection = trackCollection;

   this.trackID = Math.random();

   this.bounds = bounds || new Rect(0, 0, 100, 100);
}

// *****************************************************************************

function TrackCollection(bounds)
{
   this.addTrack = function ()
   {
      var index = this.tracks.length;
      this.tracks.push(new Track(index, this.bounds, setTrackState, this));
      this.selectTrack(index);
      this.saved = false;
   }


   this.removeTrack = function()
   {
      if (this.selectedTrack != null)
      {
         var index = this.selectedTrack.trackIndex;
         var temp = [];
         for (var i = 0; i < this.tracks.length; i++)
         {
            if (this.tracks[i].trackIndex != index) temp.push(this.tracks[i]);
         }
         this.tracks = temp;
         for (var i = 0; i < this.tracks.length; i++)
         {
            this.tracks[i].trackIndex = i;
         }
         if (index >= this.tracks.length) index = this.tracks.length - 1;
         if (this.tracks.length > 0) this.selectTrack(index);
         setTrackState(this, this.tracks.length == 0);
      }
   }

   this.removeLastPointFromSelectedTrack = function()
   {
      if (this.selectedTrack == null) return false;

      var result = this.selectedTrack.removeLastPoint();

      if (this.selectedTrack.count() == 0)
      {
         var index = this.selectedTrack.trackIndex;
         var temp = [];
         for (var i = 0; i < this.tracks.length; i++)
         {
            if (this.tracks[i].trackIndex != index) temp.push(this.tracks[i]);
         }
         this.tracks = temp;
         for (var i = 0; i < this.tracks.length; i++)
         {
            this.tracks[i].trackIndex = i;
         }
         if (index >= this.tracks.length) index = this.tracks.length - 1;
         if (this.tracks.length > 0)
         {
            this.selectTrack(index);
         }
         else
         {
            this.selectedTrack = null;
         }
         setTrackState(this, this.tracks.length == 0);
      }

      return result;
   }
   //
   // find a track by x, y, set selected track and pointIndex
   // Modified: prioritize selected track's points
   //
   this.detectTrack = function (x, y, scale)
   {
      if (this.selectedTrack != null)
      {
         if (this.selectedTrack.isPointSelected(x, y, scale))
         {
            for (var j = 0; j < this.tracks.length; j++)
            {
               this.tracks[j].selected = (this.tracks[j].trackIndex == this.selectedTrack.trackIndex);
            }
            this.selectedTrack.selected = true;
            this.selectedTrack.penColor = this.SelectedColor;
            this.selectedTrack.mouseDown(x, y);
            return true;
         }
      }

      for (var i = 0; i < this.tracks.length; i++)
      {
         if (this.selectedTrack != null && this.tracks[i].trackIndex == this.selectedTrack.trackIndex)
            continue;

         if (this.tracks[i].isPointSelected (x, y, scale))
         {
            for (var j = 0; j < this.tracks.length; j++)
            {
               this.tracks[j].selected = j == i;
            }
            this.tracks[i].selected = true;
            this.selectedTrack = this.tracks[i];
            this.selectedTrack.penColor = this.SelectedColor;
            this.selectedTrack.mouseDown(x, y);
            return true;
         }
      }
      return false;
   }

   this.paintMask = function (graphics, lineWidth)
   {

      for (var i = 0; i < this.tracks.length; i++)
      {
         this.tracks[i].paintMask(graphics, lineWidth);
      }
   }

   // preview paint, tracks & markers

   this.paintPreview = function (graphics, scale, mul, markerPenImg)
   {
      for (var i = 0; i < this.tracks.length; i++)
      {
         if (this.tracks[i].selected)
            this.tracks[i].penColor = this.SelectedColor;
         else
            this.tracks[i].penColor = this.DeSelectedColor;
         //
         // paint with choosen colors
         //
         this.tracks[i].paintPreview(graphics, scale, mul, markerPenImg);
      }
   }

   this.selectTrack = function (index)
   {
      //
      // de-select all
      //
      for (var i = 0; i < this.tracks.length; i++)
      {
         this.tracks[i].selected = false;
      }
      //
      if (index > -1 && this.tracks.length > 0)
      {
         this.tracks[index].selected = true;
         this.selectedTrack = this.tracks[index];
         this.selectedTrack.lineWidth = this.lineWidth;

         return true;
      }
      else
      {
         this.selectedTrack = null;
      }
      return false;
   }

   this.setLineWidth = function (width)
   {
      this.lineWidth = width;

      for (var i = 0; i < this.tracks.length; i++)
      {
         this.tracks[i].lineWidth = width;
      }
   }

   this.count = function ()
   {
      return this.tracks.length;
   }

   this.lineWidth = 1;

   this.tracks = [];     // collection of tracks

   this.bounds = bounds;

   this.selectedTrack = null;

   this.SelectedColor = 0xffff0000;
   this.DeSelectedColor = 0xffffff00;

   this.saved = false;
}

function setTrackState(trackCollection, state)
{
   trackCollection.saved = state;
}
// *****************************************************************************

// ====================== バッチ処理グローバル変数 ======================
var batchQueue     = [];
var outputFolder   = "";
var batchIndex     = 0;
var batchCancelled = false;   // バッチ処理中断フラグ
// ====================================================================

function showDialog(initialWindow)
{
   //
   // Add all properties and methods of the core Dialog object to this object.
   //
   this.__base__ = Dialog;
   this.__base__();
   this.userResizable = true;
   var dialog = this;
   this.backgroundColor = 0xff242424;
   this.foregroundColor = 0xffffffff;

   var formsScaling = this.displayPixelRatio ;

   var Screen = GetPrimaryScreenDimensions(dialog);

   var normalSize;

   var isNormalSize = true;

   this.font = new Font("Helvetica", 9);

   var drawTracksSized = false;

   var autoStretchEnabled = true;   // AutoStretch ON/OFF フラグ（デフォルトON）
   this.autoStretchEnabled = true;  // viewsSetup から参照するためプロパティとしても公開

   var offset = 12;

   var selectedTrack = null;
   // トップレベル関数からクロージャの selectedTrack を設定するためのセッター
   this.setSelectedTrack = function(track) { selectedTrack = track; };

   var initialWnd = initialWindow;

   this.multiPointMode = false;

   // Edit モード: ON のときクリックは既存アンカーの移動専用 (新規アンカーは置かない)
   this.editMode = false;

   // ウインドウ右上の × で閉じた場合も、旧 Exit ボタンと同等のクリーンアップを実行する。
   this.onHide = function ()
   {
      try
      {
         if (dialog.t && dialog.t.clearReference)
            dialog.t.clearReference();
      }
      catch (ex) { /* ignore */ }
      selectedTrack = null;
   };

   this.openTargetFile = function()
   {
      var ofd = new OpenFileDialog;
      ofd.caption = "Open Target Image";
      ofd.filters = [
         ["All supported formats", ".xisf", ".fit", ".fits", ".fts", ".jpg", ".jpeg", ".png", ".tif", ".tiff"],
         ["PixInsight XISF", ".xisf"],
         ["FITS files", ".fit", ".fits", ".fts"],
         ["JPEG images", ".jpg", ".jpeg"],
         ["PNG images", ".png"],
         ["TIFF images", ".tif", ".tiff"]
      ];

      if (!ofd.execute()) return;

      try
      {
         var filePath = ofd.fileName;

         var openedWindows = ImageWindow.open(filePath);
         if (!openedWindows || openedWindows.length === 0)
            throw new Error("Failed to open the file.");

         var targetWnd = openedWindows[0];
         targetWnd.show();
         targetWnd.zoomToOptimalFit();

         // 少し待機
         for (var i = 0; i < 40; i++) {
            processEvents();
            if (!targetWnd.isNull && !targetWnd.isClosed && !targetWnd.mainView.isNull)
               break;
         }

         var newViewId = targetWnd.mainView.id;

         // ComboBoxに追加（重複チェック）
         var alreadyExists = false;
         for (var i = 0; i < dialog.workspaceViewList.numberOfItems; i++) {
            if (dialog.workspaceViewList.itemText(i) === newViewId) {
               alreadyExists = true;
               break;
            }
         }
         if (!alreadyExists)
            dialog.workspaceViewList.addItem(newViewId);

         // 選択状態にする
         for (var i = 0; i < dialog.workspaceViewList.numberOfItems; i++) {
            if (dialog.workspaceViewList.itemText(i) === newViewId) {
               dialog.workspaceViewList.currentItem = i;
               break;
            }
         }

         dialog.t = new viewsSetup(dialog, targetWnd, dialog.previewControl);
         checkReference();
         dialog.windowTitle = TITLE + ' - ' + newViewId;

         selectedTrack = null;
         dialog.btnAdd.enabled = true;
         dialog.btnRemove.enabled = false;
         dialog.btnApply.enabled = false;
         dialog.btnEdit.enabled = false;
         // 新しいターゲットを開いたら Edit モードは解除
         dialog.editMode = false;
         if (dialog.btnEdit) { dialog.btnEdit.checked = false; dialog.btnEdit.icon = iconEditOff; }

         // 最初のポイントを置くのに Add ボタンをクリックする手間を省くため、
         // ターゲットを開いた直後に自動的に新規トラックを開始しておく。
         if (dialog.t && dialog.t.Tracks)
         {
            dialog.t.Tracks.addTrack();
            selectedTrack = dialog.t.Tracks.selectedTrack;
         }

      }
      catch (ex)
      {
         Console.writeln('Failed to open target file: ' + (ex.message || ex));
         new MessageBox("ターゲット画像のオープンに失敗しました。\n" + (ex.message || ex),
                        "Error", StdIcon_Error, StdButton_Ok).execute();
      }
   };

      // ====================== Referenceとしてファイルを開く ======================
   this.openReferenceFile = function()
   {
      if (!dialog.t || !dialog.t.view)
      {
         new MessageBox("まずメインの処理対象画像を選択してください。\n" +
                        "（上部のビュー選択リストから画像を選ぶか、Open File... で画像を開いてください）",
                        "メイン画像が必要です", StdIcon_Warning, StdButton_Ok).execute();
         return;
      }

      var ofd = new OpenFileDialog;
      ofd.caption = T("reference_ofd_caption");
      ofd.filters = [
         ["All supported formats", ".xisf", ".fit", ".fits", ".fts", ".jpg", ".jpeg", ".png", ".tif", ".tiff"],
         ["PixInsight XISF", ".xisf"],
         ["FITS files", ".fit", ".fits", ".fts"],
         ["JPEG images", ".jpg", ".jpeg"],
         ["PNG images", ".png"],
         ["TIFF images", ".tif", ".tiff"]
      ];
      ofd.multipleSelections = false;

      if (!ofd.execute())
         return;   // キャンセル

      try
      {
         var filePath = ofd.fileName;

         var openedWindows = ImageWindow.open(filePath);
         if (!openedWindows || openedWindows.length === 0)
            throw new Error("Failed to open the file.");

         var refWnd = openedWindows[0];
         refWnd.show();
         refWnd.zoomToOptimalFit();

         // ウィンドウが安定するまで少し待つ
         for (var i = 0; i < 40; i++)
         {
            processEvents();
            if (!refWnd.isNull && !refWnd.isClosed && !refWnd.mainView.isNull && refWnd.visible)
               break;
         }

         var refView = refWnd.mainView;

         // サイズチェック（必須）
         if (dialog.t.view.image.width !== refView.image.width ||
             dialog.t.view.image.height !== refView.image.height)
         {
            new MessageBox("Reference画像のサイズがメイン画像と一致しません。\n" +
                           "同じ幅・高さの画像を選択してください。",
                           "Size Mismatch", StdIcon_Warning, StdButton_Ok).execute();
            refWnd.forceClose();
            return;
         }

         // チャンネル数チェック（不一致でも続行可能だが警告する）
         var targetChannels = dialog.t.view.image.numberOfChannels;
         var refChannelsOpen = refView.image.numberOfChannels;
         if (targetChannels !== refChannelsOpen)
         {
            var msgCh = new MessageBox(
               T("channel_mismatch_detail")
                  .replace("%target%", targetChannels)
                  .replace("%ref%", refChannelsOpen),
               T("channel_mismatch_title"),
               StdIcon_Warning,
               StdButton_Yes, StdButton_No);
            if (msgCh.execute() != StdButton_Yes)
            {
               refWnd.forceClose();
               return;
            }
         }

         // ComboBoxに追加（重複チェック）
         var alreadyExists = false;
         for (var i = 0; i < dialog.cmbReferences.numberOfItems; i++)
         {
            if (dialog.cmbReferences.itemText(i) === refView.id)
            {
               alreadyExists = true;
               break;
            }
         }
         if (!alreadyExists)
            dialog.cmbReferences.addItem(refView.id);

         dialog.cmbReferences.currentItem = dialog.cmbReferences.numberOfItems - 1;

         if (typeof dialog.t.setReference === "function")
         {
            dialog.t.setReference(refView);
         }
         else
         {
            dialog.t.reference = refView;
         }

         dialog.previewControl.forceRedraw();
         dialog.btnApply.enabled = true;

      }
      catch (ex)
      {
         Console.writeln('Failed to open reference file: ' + (ex.message || ex));
         new MessageBox("Failed to open reference file \n" + (ex.message || ex),
                        "Error", StdIcon_Error, StdButton_Ok).execute();
      }
   };

   // ========================================================================
   // Helper function to check reference image compatibility
   // ========================================================================
   function checkReference()
   {
      if (dialog.t == null || dialog.t.view == null) return;

      var index = dialog.cmbReferences.currentItem;
      if (index == 0)
      {
         Console.writeln('No reference image');
         dialog.t.reference = null;
         return;
      }

      var view = null;
      var id = dialog.cmbReferences.itemText(index);
      var windows = ImageWindow.windows;
      for (var i = 0; i < windows.length; i++)
      {
         var wnd = windows[i];

         if (wnd.isNull || wnd.isClosed)
            continue;

         if (wnd.mainView.id == id)
         {
            view = wnd.mainView;
            break;
         }
      }

      // 対象の ID がワークスペースから消えていた場合の保護（閉じた等）
      if (view == null)
      {
         Console.warningln('Reference view not found: ' + id);
         new MessageBox('選択された Reference ビューが見つかりません。\n' +
               '(ウィンドウが閉じられている可能性があります)',
               'Reference not found',
               StdIcon_Warning, StdButton_Ok).execute();
         dialog.cmbReferences.currentItem = 0;
         dialog.t.reference = null;
         return;
      }

      if (view.id == dialog.t.view.id)
      {
         new MessageBox('The reference view must be different.',
         'No reference selected',
         StdIcon_Information, StdButton_Ok).execute();

         dialog.cmbReferences.currentItem = 0;

         return;
      }

      if (dialog.t.view.image.width == view.image.width &&
          dialog.t.view.image.height == view.image.height)
      {
         // チャンネル数チェック（不一致でも続行可能だが警告する）
         var targetChannels = dialog.t.view.image.numberOfChannels;
         var refChannels = view.image.numberOfChannels;
         if (targetChannels !== refChannels)
         {
            var msgCh = new MessageBox(
               T("channel_mismatch_detail")
                  .replace("%target%", targetChannels)
                  .replace("%ref%", refChannels),
               T("channel_mismatch_title"),
               StdIcon_Warning,
               StdButton_Yes, StdButton_No);
            if (msgCh.execute() != StdButton_Yes)
            {
               dialog.cmbReferences.currentItem = 0;
               dialog.t.reference = null;
               return;
            }
         }

         dialog.t.setReference( view );
         dialog.previewControl.forceRedraw();
         // ローカル selectedTrack を Tracks 側の現在選択と同期する。
         // null で潰すと、ターゲット直後に自動作成された空トラックの選択が
         // 外れて「最初のアンカーが置けない」状態になる (リファレンスを開いた
         // 直後の症状)。同期にすることで自動トラックも、ユーザーが既に
         // 編集中のトラックも維持される。
         selectedTrack = dialog.t.Tracks.selectedTrack;
         dialog.btnApply.enabled = true;
         return;
      }
      else
      {
         new MessageBox('The reference view incompatible.' +
               ' Must have same width and height.',
               'No reference selected',
               StdIcon_Information, StdButton_Ok).execute();

         dialog.cmbReferences.currentItem = 0;

         return;
      }
   }
   dialog.checkReference = checkReference;

   this.previewControl = new PreviewControl(this);
   with (this.previewControl)
   {
      this.previewControl.onCustomMouseDown = function (x, y, button, buttonState, modifiers)
      {
         if (button != MouseButton_Left) return;

      var previewScale = dialog.previewControl ? dialog.previewControl.scale : 1;

      // Edit モード: 既存アンカーの移動専用。クリックが円の中ならトラックを選択してドラッグ開始、
      // それ以外は何もしない (新規アンカーは置かない)。
      if (dialog.editMode)
      {
         if (dialog.t && dialog.t.Tracks && dialog.t.Tracks.detectTrack(x, y, previewScale))
         {
            selectedTrack = dialog.t.Tracks.selectedTrack;
            dialog.previewControl.forceRedraw();
         }
         return;
      }

               // Ctrl+Click: prioritize point removal from existing tracks
      if (modifiers == KeyModifier_Control)
      {
         if (dialog.t.Tracks.detectTrack(x, y, previewScale))
         {
            selectedTrack = dialog.t.Tracks.selectedTrack;
            selectedTrack.removePoint();

            if (selectedTrack.count() == 0)
            {
               dialog.t.Tracks.removeTrack();

               if (dialog.t.Tracks.count() == 0)
               {
                  selectedTrack = null;
               }
               else
               {
                  selectedTrack = dialog.t.Tracks.selectedTrack;
               }
            }
            dialog.previewControl.forceRedraw();
         }
         return;
      }

      // Normal click (no Ctrl): prioritize adding point to selected track
      if (selectedTrack != null)
      {
         // Check if clicking on a point of the SELECTED track
         if (selectedTrack.isPointSelected(x, y, previewScale))
         {
            // Clicked on own point - enter move mode
            dialog.t.Tracks.detectTrack(x, y, previewScale);
            dialog.previewControl.forceRedraw();
         }
         else
         {
               // 2点モード: 現在の選択トラックが既に 2 点あるなら、先に新トラックを作ってからそこへ追加する。
               // こうしておくことで、後から Undo で点を消したときに「3点目以降が置けてしまう」状態を防げる。
               // (multiPointMode のときは曲線を描くので同じトラックに追加を続ける)
               if (!dialog.multiPointMode && selectedTrack.count() >= 2)
               {
                  dialog.t.Tracks.addTrack();
                  selectedTrack = dialog.t.Tracks.selectedTrack;
               }

               // Clicked elsewhere - add new point to selected track
               selectedTrack.addPoint(x, y);
               dialog.previewControl.forceRedraw();
               dialog.btnRemove.enabled = true;
               dialog.btnApply.enabled = true;
               dialog.btnEdit.enabled = true;
         }
         return;
      }

      // No track selected - try to select an existing track
      if (dialog.t.Tracks.detectTrack(x, y, previewScale))
      {
         selectedTrack = dialog.t.Tracks.selectedTrack;
         dialog.previewControl.forceRedraw();
      }
      }

      this.previewControl.onCustomMouseMove = function( x, y, buttonState, modifiers )
      {
         if (buttonState != MouseButton_Left) return;
         if (selectedTrack != null)
         {
            selectedTrack.mouseMove(x, y);
            dialog.previewControl.forceRedraw();
         }
      }

      this.previewControl.onMouseRelease = function( x, y, button, buttonState, modifiers )
      {
         if (button != MouseButton_Left) return;
         if (selectedTrack != null)
         {
            selectedTrack.mouseUp(x, y);
         }
      }

      this.previewControl.onCustomPaint = function (graphics, x0, y0, x1, y1 )
      {
         if (!drawTracksSized)
         {
            // Previewチェックなし：通常の赤いマーカーとラインを描画
            graphics.antialiasing = true;
            if (dialog.t && dialog.t.Tracks)
               dialog.t.Tracks.paintPreview(graphics, dialog.previewControl.scale);
         }
         // Previewチェックあり：ビットマップ自体が合成済みなので上書き描画しない

         // ====================== ルーペ (拡大鏡) 描画 ======================
         // PJSR に GraphicsPath が存在しないため、矩形 (正方形) ルーペで実装。
         // clipRect で領域を限定 → 拡大変換 → drawBitmap + 拡大されたトラック → 逆変換 → クリップ解除。
         var pv = dialog.previewControl;
         var sScale = dialog.previewControl.scale;
         if (pv.loupeEnabled && pv.cursorInside && pv.cursorWasInImage && pv.image)
         {
            var s   = sScale;
            var Rpx = pv.loupeRadius;
            var mag = pv.loupeMagnification;
            var rImg = Rpx / s;
            // 実カーソル位置 (画像外でも追従)
            var rCx  = pv.cursorX;
            var rCy  = pv.cursorY;
            // 十字レチクル / クリック位置は画像端にクランプ
            var imgW = pv.image.width;
            var imgH = pv.image.height;
            var cx   = Math.max(0, Math.min(imgW, rCx));
            var cy   = Math.max(0, Math.min(imgH, rCy));
            // ルーペ中心は画像端の外側へドリフトしないようクランプする。
            // カーソルが画像端を超えた瞬間、ルーペ中心は画像端に張り付く。
            // この位置でルーペ内に見える画像領域はちょうど全体の 1/2
            // (= 残り 1/2 が黒い空白) で、画像端のアンカーは拡大鏡の中央に
            // 表示され、枠外に出ない。
            var loupeCx = Math.max(0, Math.min(imgW, rCx));
            var loupeCy = Math.max(0, Math.min(imgH, rCy));
            var t1x     = loupeCx * (1 - mag);
            var t1y     = loupeCy * (1 - mag);

            try
            {
               // 1) 矩形クリップ (正方形ルーペ) — クランプ後のルーペ中心
               graphics.clipRect = new Rect(loupeCx - rImg, loupeCy - rImg,
                                            loupeCx + rImg, loupeCy + rImg);

               // 2) 画像外領域を黒で塗りつぶす — 画像端が境界として明示される
               graphics.fillRect(loupeCx - rImg, loupeCy - rImg,
                                 loupeCx + rImg, loupeCy + rImg,
                                 new Brush(0xff000000));

               // 3) 拡大変換 (ルーペ中心が不動点)
               graphics.translateTransformation(t1x, t1y);
               graphics.scaleTransformation(mag, mag);

               // 4) 画像全体を (0,0) に描画 — クリップされて正方形内のみ表示
               graphics.drawBitmap(0, 0, pv.image);

               // 5) 既存トラックのマーカーとラインもルーペ内で拡大表示
               //    graphics には scale(s) + scale(mag) が合成されているため、
               //    paintPreview にプレビュー本来のスケール s を渡せば、
               //    十字・円が mag 倍にレンダリングされる (通常のアンカーを
               //    そのまま拡大した見た目)。
               //    第4引数で画像座標のペン幅を 2/(s*mag) に指定 → 画面上 2px。
               //    通常の cosmetic ペン (1px) の 2 倍の太さでルーペ内マーカーを描く。
               if (!drawTracksSized && dialog.t && dialog.t.Tracks)
               {
                  graphics.antialiasing = true;
                  dialog.t.Tracks.paintPreview(graphics, s, 1, 2 / (s * mag));
               }

               // 6) 変換を逆順で解除
               graphics.scaleTransformation(1 / mag, 1 / mag);
               graphics.translateTransformation(-t1x, -t1y);

               // 7) クリップを「画像 ∪ ルーペ領域」に戻す。ルーペが画像端を
               //    超えても枠と十字が切れないようにする。
               graphics.clipRect = new Rect(
                  Math.min(0,                loupeCx - rImg),
                  Math.min(0,                loupeCy - rImg),
                  Math.max(pv.image.width,   loupeCx + rImg),
                  Math.max(pv.image.height,  loupeCy + rImg));
            }
            catch (ex)
            {
               try { Console.writeln("[Loupe] draw failed: " + ex); } catch (e) {}
            }

            // 8) 正方形の縁 + 十字レティクル
            try
            {
               graphics.antialiasing = true;
               graphics.pen   = new Pen(0xffffffff, 2 / s);
               graphics.brush = new Brush(0x00000000);
               // 枠はクランプ後のルーペ中心位置に描画
               graphics.drawRect(loupeCx - rImg, loupeCy - rImg,
                                 loupeCx + rImg, loupeCy + rImg);

               // 十字レティクルは「拡大鏡内の画像端」に貼り付くよう、クランプ位置
               // (cx, cy) を拡大鏡の表示空間に変換して描画する。
               //   m = loupeC + (c - loupeC) * mag
               // これでカーソルが画像外に出ても、ルーペ内の拡大画像の端に
               // 沿って十字が滑るように見える。
               var mx = loupeCx + (cx - loupeCx) * mag;
               var my = loupeCy + (cy - loupeCy) * mag;
               var tick = 12 / s;
               graphics.pen = new Pen(0xffff4040, 1.5 / s);
               graphics.drawLine(mx - tick, my, mx + tick, my);
               graphics.drawLine(mx, my - tick, mx, my + tick);
            }
            catch (exDeco)
            {
               try { Console.writeln("[Loupe] decoration failed: " + exDeco); } catch (e) {}
            }
         }

         // ====================== カーソル追従の照準 (ルーペ OFF 時) ======================
         // ルーペが無効でも、カーソルがビューポート内にあれば照準を表示する。
         // 画像外ではクランプ位置 (画像端) に表示され、ポインターの動きに沿って端を滑る。
         if (!pv.loupeEnabled && pv.cursorInside && pv.cursorWasInImage && pv.image)
         {
            try
            {
               var imgW2 = pv.image.width;
               var imgH2 = pv.image.height;
               var ccx = Math.max(0, Math.min(imgW2, pv.cursorX));
               var ccy = Math.max(0, Math.min(imgH2, pv.cursorY));
               graphics.antialiasing = true;
               var tickC = 10 / sScale;
               graphics.pen = new Pen(0xffff4040, 1.5 / sScale);
               graphics.drawLine(ccx - tickC, ccy, ccx + tickC, ccy);
               graphics.drawLine(ccx, ccy - tickC, ccx, ccy + tickC);
            }
            catch (exC)
            {
               try { Console.writeln("[Cursor crosshair] failed: " + exC); } catch (e) {}
            }
         }
      }
   }

   // display

   this.richTextBox = new Label(this);
   with (this.richTextBox)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      useRichText = true;
      visible = false;
   }

   // assemble GUI elements

   // my ©

   this.lblCopyright = new Label(this)
   with (this.lblCopyright)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text = "© 2026, B.Kidani ";
   }

   this.btnHelp = new ToolButton(this);
   with (this.btnHelp)
   {
      icon = this.scaledResource( ":/icons/help.png" );
      setScaledFixedSize( 24, 24 );
      toolTip = T("help_tooltip")
   }

   this.toolNormal = new ToolButton(this);
   with (this.toolNormal)
   {
      icon = this.scaledResource(':/icons/window-small.png');
      setScaledFixedSize( 24, 24 );
      toolTip = 'Restore this dialog window';

      onPress = function ()
      {
         if (!isNormalSize)
         {
            dialog.move(normalSize.x0, normalSize.y0);
            dialog.resize(normalSize.width, normalSize.height);
            isNormalSize = true;
         }
      }
   }

   this.toolMax = new ToolButton(this);
   with (this.toolMax)
   {
      icon = this.scaledResource(':/icons/window.png');
      setScaledFixedSize( 24, 24 );
      toolTip = 'Maximize this window';

      onPress = function ()
      {
         if (isNormalSize)
         {
            var x0 = dialog.position.x;
            var y0 = dialog.position.y;
            var x1 = dialog.position.x + dialog.width;
            var y1 = dialog.position.y + dialog.height;
            normalSize = new Rect(x0, y0, x1, y1);
            dialog.move(0, 0);
            dialog.resize(Screen.width, Screen.height - 36 * formsScaling);
            isNormalSize = false;
         }
      }
   }

   // 親を previewControl に設定して、previewControl.buttons_Box 内に配置する。
   this.toolStretch = new ToolButton(this.previewControl);
   with (this.toolStretch)
   {
      icon = this.scaledResource(':/toolbar/image-stf-auto.png');
      setScaledFixedSize( 24, 24 );
      checkable = true;
      checked = true;   // デフォルト ON（ファイルを開いたときストレッチONと一致）
      toolTip = T("autostretch");

      onPress = function ()
      {
         // onPress は押す前の checked 値で発火するため !this.checked で次の状態を取得
         var nextState = !this.checked;
         autoStretchEnabled = nextState;
         dialog.autoStretchEnabled = nextState;

         // ビットマップだけ作り直し、トラック・参照・ズーム倍率は保持する
         if (dialog.t && dialog.t.view && typeof dialog.t.refreshBitmap === "function")
         {
            dialog.t.refreshBitmap();

            // Preview チェックがONなら合成済みプレビューに再合成
            if (drawTracksSized && dialog.t.updatePreviewWithReference)
               dialog.t.updatePreviewWithReference();

            dialog.previewControl.forceRedraw();
         }
      }
   }

   // 言語切替ボタン
   // PixInsight 環境によっては :/icons/language.png 等の地球アイコンが存在せず
   // 空ボタン化してしまうため、現在の言語 (JA / EN) をラベルとして表示する。
   // text を見ればどちらが現在有効か一目で分かり、クリックで切り替わる。
   // 親を previewControl に設定して、previewControl.buttons_Box の右端に配置する。
   this.toolLang = new PushButton(this.previewControl);
   with (this.toolLang)
   {
      backgroundColor = 0xff555555;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text = (currentLang == 'ja') ? 'JA' : 'EN';
      toolTip = T("lang_tooltip");
      // Qt 内部の min-width と padding を上書きしないと setScaledFixedWidth は効かない
      styleSheet = "QPushButton { padding: 2px 4px; min-width: 0; }";
      setScaledFixedWidth(28);

      onClick = function ()
      {
         // トグル: ja ↔ en
         var next = (currentLang == 'ja') ? 'en' : 'ja';
         currentLang = next;
         saveLang(next);

         // onHide が clearReference を呼ぶ前に状態を保存
         langRestartState = saveLangState(dialog);

         // ダイアログを再起動 (main() のループで再構築される)
         dialog.done(LANG_RESTART_CODE);
      }
   }

   // ====================== プレビュー上部ツールバーの最終レイアウト ======================
   // PreviewControl 側で buttons_Box のみ作成し、sizer は dialog 側で組み立てる。
   // 左寄せ: ZoomIn / ZoomOut / 1:1 / ルーペ / AutoStretch
   // 右寄せ: 言語切替 (JA/EN)
   {
      var bbSizer = new HorizontalSizer;
      bbSizer.margin = 0;
      bbSizer.spacing = 8;
      bbSizer.addSpacing(12);
      bbSizer.add(this.previewControl.zoomIn_Button);
      bbSizer.add(this.previewControl.zoomOut_Button);
      bbSizer.add(this.previewControl.zoom11_Button);
      bbSizer.add(this.previewControl.zoomFit_Button);
      bbSizer.add(this.previewControl.loupe_Button);
      bbSizer.add(this.toolStretch);
      bbSizer.addStretch();
      bbSizer.add(this.toolLang);
      bbSizer.addSpacing(12);
      this.previewControl.buttons_Box.sizer = bbSizer;
   }

   // ====================== Batch processing GUI ======================

   this.btnQueueFiles = new PushButton(this);
   with (this.btnQueueFiles)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/open.png');
      text = T("batch_queue_add");
      toolTip = T("batch_queue_tip");

      onClick = function()
      {
         var ofd = new OpenFileDialog;
         ofd.caption = T("target_ofd_caption");
         ofd.filters = [
            ["All supported formats", ".xisf", ".fit", ".fits", ".fts", ".jpg", ".jpeg", ".png", ".tif", ".tiff"],
            ["PixInsight XISF", ".xisf"],
            ["FITS files", ".fit", ".fits", ".fts"],
            ["JPEG images", ".jpg", ".jpeg"],
            ["PNG images", ".png"],
            ["TIFF images", ".tif", ".tiff"]
         ];
         ofd.multipleSelections = true;

         if (ofd.execute())
         {
            var files = ofd.fileNames;
            for (var i = 0; i < files.length; i++)
            {
               var fp = files[i];
               var fn = fp.substring(fp.lastIndexOf('/') + 1);
               var exists = false;
               for (var j = 0; j < batchQueue.length; j++)
               {
                  if (batchQueue[j].filePath == fp) { exists = true; break; }
               }
               if (!exists)
                  batchQueue.push({ filePath: fp, fileName: fn, status: 'waiting' });
            }
            batchUpdateList(dialog);
            batchTryStart(dialog);
         }
      }
   }

   this.btnOutputFolder = new PushButton(this);
   with (this.btnOutputFolder)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/folder.png');
      text = T("output_folder");
      toolTip = T("output_folder_tip");

      onClick = function()
      {
         var gdd = new GetDirectoryDialog;
         gdd.caption = T("output_folder_caption");
         if (outputFolder.length > 0)
            gdd.initialPath = outputFolder;

         if (gdd.execute())
         {
            outputFolder = gdd.directory;
            dialog.lblOutputPath.text = outputFolder;
            batchTryStart(dialog);
         }
      }
   }

   // btnQueueFiles と btnOutputFolder のサイズを揃える。
   //   - 幅は btnQueueFiles の自然幅に合わせる (テキストが長い方)
   //   - 高さは btnOutputFolder の自然高さに合わせる
   // adjustToContents で各ボタンの推奨サイズを確定させてから相互に適用する。
   this.btnQueueFiles.adjustToContents();
   this.btnOutputFolder.adjustToContents();
   var btnTargetWidth  = this.btnQueueFiles.width;
   var btnTargetHeight = this.btnOutputFolder.height;
   if (btnTargetWidth  > 0) this.btnOutputFolder.setFixedWidth(btnTargetWidth);
   if (btnTargetHeight > 0) this.btnQueueFiles.setFixedHeight(btnTargetHeight);


   this.lblOutputPath = new Label(this);
   with (this.lblOutputPath)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = 0xff888888;
      font = this.font;
      // 言語切替で再起動した場合も既に指定済みのパスを引き継ぐ
      text = (outputFolder && outputFolder.length > 0) ? outputFolder : T("not_set");
   }

   this.lblSuffix = new Label(this);
   with (this.lblSuffix)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text = T("suffix_label");
      // 右側の Edit ボックスに対して上辺に浮かないよう縦中央寄せ
      textAlignment = TextAlign_Left | TextAlign_VertCenter;
   }

   this.editSuffix = new Edit(this);
   with (this.editSuffix)
   {
      backgroundColor = 0xff333333;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text = '_ds';
      setScaledFixedWidth(60);
      toolTip = T("suffix_tip");
   }

   this.batchList = new TreeBox(this);
   with (this.batchList)
   {
      backgroundColor = 0xff1a1a1a;
      foregroundColor = 0xffffffff;
      font = this.font;
      numberOfColumns = 1;
      setHeaderText(0, '');
      headerVisible = false;
      setScaledFixedHeight(200);
      alternateRowColor = false;
      rootDecoration = false;
      styleSheet = this.scaledStyleSheet(
         "QTreeView { background-color: #1a1a1a; color: white;" +
         " border: 1px solid #444444; }" +
         "QTreeView::item { padding-left: 2px; }" +
         "QTreeView::branch { width: 0px; border: none; image: none; }"
      );
      toolTip = 'バッチキューのファイル一覧。';
   }

   this.lblBatchProgress = new Label(this);
   with (this.lblBatchProgress)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = 0xff00f0ff;
      font = this.font;
      text = '';
   }

   this.btnSaveNext = new PushButton(this);
   with (this.btnSaveNext)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/ok.png');
      text = T("save_and_next");
      enabled = false;
      toolTip = T("save_and_next_tip");

      onClick = function()
      {
         batchSaveAndNext(dialog);
      }
   }

   this.btnSkipNext = new PushButton(this);
   with (this.btnSkipNext)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/arrow-right.png');
      text = T("skip_copy");
      enabled = false;
      toolTip = T("skip_copy_tip");

      onClick = function()
      {
         batchSkipAndNext(dialog);
      }
   }
   this.btnSkipNoSave = new PushButton(this);
   with (this.btnSkipNoSave)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/delete.png');
      text = T("skip_no_copy");
      enabled = false;
      toolTip = T("skip_no_copy_tip");

      onClick = function()
      {
         batchSkipNoCopy(dialog);
      }
   }

   this.btnCancelBatch = new PushButton(this);
   with (this.btnCancelBatch)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/process-interface/abort.png');
      text = T("batch_cancel");
      enabled = false;
      toolTip = T("batch_cancel_tip");

      onClick = function()
      {
         batchCancelled = true;
      }
   }

   // ====================== End of Batch processing GUI ======================

this.workspaceViewList = new ComboBox(this);
   // 中央揃えラッパを最初の addItem 前に適用 (以降 addItem/setItemText は自動で
   // 先頭スペース埋め、itemText は元テキストを返す)
   applyComboCenterAlignment(this.workspaceViewList, 140);
   with (this.workspaceViewList)
   {
      font = this.font;
      setScaledFixedWidth(170);

      // 初期項目（Open File... を必ず入れる）
      addItem(T("target_select_placeholder"));
      addItem(T("target_open_file"));

      currentItem = 0;

      onItemSelected = function (index)
      {
         var selectedText = this.itemText(index);

         if (selectedText === T("target_open_file"))
         {
            dialog.openTargetFile();
            return;
         }

         if (index === 0) return;   // プレースホルダ

         // 通常のビュー選択処理
         var id = selectedText;
         var targetWnd = null;
         var windows = ImageWindow.windows;
         for (var i = 0; i < windows.length; i++)
         {
            var wnd = windows[i];
            if (wnd && !wnd.isNull && !wnd.isClosed && wnd.mainView.id === id)
            {
               targetWnd = wnd;
               break;
            }
         }

         if (!targetWnd) return;

         // 変更保存確認
         if (dialog.t != null && dialog.t.Tracks != null &&
             dialog.t.Tracks.count() > 0 && !dialog.t.Tracks.saved)
         {
            var msg = new MessageBox("現在の変更を保存しますか？",
                                     '変更があります',
                                     StdIcon_Question, StdButton_Yes, StdButton_No);
            if (msg.execute() == StdButton_Yes)
               save(dialog);
         }

         dialog.t = new viewsSetup(dialog, targetWnd, dialog.previewControl);
         checkReference();
         dialog.windowTitle = TITLE + ' - ' + targetWnd.mainView.id;

         selectedTrack = null;
         dialog.btnAdd.enabled = true;
         dialog.btnRemove.enabled = false;
         dialog.btnApply.enabled = false;
         dialog.btnEdit.enabled = false;
         dialog.btnSaveNext.enabled    = (outputFolder.length > 0 && batchQueue.length > 0);
         dialog.btnSkipNext.enabled    = (outputFolder.length > 0 && batchQueue.length > 0);
         dialog.btnSkipNoSave.enabled  = (batchQueue.length > 0);
         // 新しいターゲットを開いたら Edit モードは解除
         dialog.editMode = false;
         if (dialog.btnEdit) { dialog.btnEdit.checked = false; dialog.btnEdit.icon = iconEditOff; }

         // 最初のポイントを置くのに Add ボタンをクリックする手間を省くため、
         // ターゲットを開いた直後に自動的に新規トラックを開始しておく。
         if (dialog.t && dialog.t.Tracks)
         {
            dialog.t.Tracks.addTrack();
            selectedTrack = dialog.t.Tracks.selectedTrack;
         }
      }
   }
   this.btnAdd = new PushButton(this);
   with (this.btnAdd)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/add.png');
      text = T("add");
      toolTip = T("add_tooltip");
      setScaledFixedWidth(130);

      onClick = function ( checked )
      {
         if (dialog.t == null || dialog.t.Tracks == null) return;
         // Add ボタンで新規トラックを開始するときは Edit モードを解除 (新しい点を置くため)
         if (dialog.editMode)
         {
            dialog.editMode = false;
            if (dialog.btnEdit) { dialog.btnEdit.checked = false; dialog.btnEdit.icon = iconEditOff; }
         }
         dialog.t.Tracks.addTrack();
         selectedTrack = dialog.t.Tracks.selectedTrack;
         dialog.btnRemove.enabled = true;
         dialog.btnEdit.enabled = true;
      }
   }

   this.lastValidLineWidth = 10;   // 直前の正常な値

   this.applyLineWidth = function (value)
   {
      value = Math.max(1, Math.min(1024, value));   // 範囲制限

      this.lastValidLineWidth = value;

      // Edit ウィジェットを常に現在値と同期
      if (dialog.editLineWidth)
         dialog.editLineWidth.text = value.toString();

      if (dialog.t && dialog.t.Tracks)
      {
         dialog.t.Tracks.setLineWidth(1);
         dialog.previewControl.forceRedraw();
      }
   };

   // ====================== Line Width: ComboBox (プリセット) + Edit (手動入力) ======================
   this.lblLineWidth = new Label(this);
   with (this.lblLineWidth)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text = T("line_width");
      textAlignment = TextAlign_Left | TextAlign_VertCenter;
   }

   // プリセット選択用 ComboBox（editable は使わない）
   this.cmbLineWidth = new ComboBox(this);
   this.cmbLineWidth.addItem(" 5");
   this.cmbLineWidth.addItem("10");
   this.cmbLineWidth.addItem("15");
   this.cmbLineWidth.addItem("20");
   this.cmbLineWidth.addItem("25");
   this.cmbLineWidth.addItem("30");
   this.cmbLineWidth.addItem("40");
   this.cmbLineWidth.addItem("50");
   this.cmbLineWidth.currentItem = 1;           // Default "10"
   this.cmbLineWidth.setScaledFixedWidth(52);
   this.cmbLineWidth.toolTip = T("line_width_preset_tip");
   this.cmbLineWidth.styleSheet = this.cmbLineWidth.scaledStyleSheet(
      "QComboBox { qproperty-layoutDirection: LeftToRight; }" +
      "QComboBox QAbstractItemView { text-align: center; }" +
      "QComboBox::item { text-align: center; }"
   );

   this.cmbLineWidth.onItemSelected = function (index)
   {
      var value = parseInt(this.itemText(index), 10);
      if (!isNaN(value) && value > 0)
         dialog.applyLineWidth(value);
   };

   // 手動入力用 Edit ウィジェット
   this.editLineWidth = new Edit(this);
   this.editLineWidth.text = "10";
   this.editLineWidth.setScaledFixedWidth(28);   // 元 42 の 2/3
   this.editLineWidth.toolTip = T("line_width_edit_tip");

   this.editLineWidth.onEditCompleted = function ()
   {
      var value = parseInt(this.text.trim(), 10);
      if (!isNaN(value) && value >= 1 && value <= 1024)
         dialog.applyLineWidth(value);
      else
         this.text = dialog.lastValidLineWidth.toString();
   };


      this.btnRemove = new PushButton(this);
   with (this.btnRemove)
   {
      backgroundColor = this.backgroundColor;
      enabled = false;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = this.scaledResource(':/icons/undo.png');
      text = T("undo");
      toolTip = T("undo_tooltip");
      setScaledFixedWidth(130);

      onClick = function ( checked )
      {
         if (selectedTrack == null || dialog.t == null || dialog.t.Tracks == null)
            return;

         // Undo実行
         dialog.t.Tracks.removeLastPointFromSelectedTrack();

         var hasTracks = dialog.t.Tracks.count() > 0;

         // ボタンの有効/無効を更新
         dialog.btnRemove.enabled = hasTracks;
         dialog.btnApply.enabled = hasTracks;
         dialog.btnEdit.enabled = hasTracks;
         // トラックが無くなったら Edit モードも解除
         if (!hasTracks)
         {
            dialog.editMode = false;
            if (dialog.btnEdit) { dialog.btnEdit.checked = false; dialog.btnEdit.icon = iconEditOff; }
         }

         dialog.previewControl.forceRedraw();

         // ★★★ ラベル関連のコードをすべて削除 ★★★
         if (dialog.t.Tracks.count() > 0)
         {
            selectedTrack = dialog.t.Tracks.selectedTrack;
         }
         else
         {
            selectedTrack = null;
         }
      }
   }

   // ====================== Edit (既存アンカー編集) ボタン ======================
   // ON の間、クリックは既存アンカーの選択 + ドラッグ専用 (新規アンカーは置かない)。

   // ⨁ アイコンを Bitmap として描画。押していない=緑、押した=赤。
   function makeEditIcon(color)
   {
      var sz = 16;
      var bmp = new Bitmap(sz, sz);
      bmp.fill(0x00000000);
      var g = new Graphics(bmp);
      g.antialiasing = true;
      g.pen = new Pen(color);
      g.font = new Font("Helvetica", 10);
      g.drawText(1, 12, "⨁");
      g.end();
      return bmp;
   }
   var iconEditOff = makeEditIcon(0xff44cc44);  // 緑: 未押下
   var iconEditOn  = makeEditIcon(0xffff5555);  // 赤: 押下中
   // main() など showDialog 外のスコープからも参照できるようダイアログプロパティに保存
   this.iconEditOff = iconEditOff;
   this.iconEditOn  = iconEditOn;

   this.btnEdit = new PushButton(this);
   with (this.btnEdit)
   {
      backgroundColor = this.backgroundColor;
      enabled = false;
      foregroundColor = this.foregroundColor;
      font = this.font;
      icon = iconEditOff;
      iconWidth = 16;
      iconHeight = 16;
      text = T("edit");
      toolTip = T("edit_tooltip");
      setScaledFixedWidth(130);

      onClick = function ()
      {
         dialog.editMode = !dialog.editMode;
         dialog.btnEdit.icon = dialog.editMode ? iconEditOn : iconEditOff;
         dialog.previewControl.forceRedraw();
      }
   }

   this.cmbReferences = new ComboBox(this);
   // 中央揃えラッパを最初の addItem 前に適用
   applyComboCenterAlignment(this.cmbReferences, 140);
   with (this.cmbReferences)
   {
      font = this.font;
      addItem(T("reference_select_placeholder"));
      addItem(T("reference_open_file"));   // ファイルを開く専用項目

      // 現在開いているビューを追加
      var windows = ImageWindow.windows;
      for (var i = 0; i < windows.length; i++)
      {
         var wnd = windows[i];
         if (wnd.isNull || wnd.isClosed)
            continue;

         var v = wnd.mainView;
         if (v.isNull)
            continue;

         addItem(v.id);
      }

      setScaledFixedWidth(170);   // 幅固定

      // 常に表示
      visible = true;

      onItemSelected = function (index)
      {
         var selectedText = this.itemText(index);

         if (selectedText === T("reference_open_file"))
         {
            dialog.openReferenceFile();   // ファイルを開いてリファレンスとして登録
            return;
         }

         checkReference();   // 既存の処理 (ビュー選択時)
      }
   }

   this.cbDrawMode = new CheckBox(this)
   with (this.cbDrawMode)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text  = 'Preview';
      toolTip = T("preview_tip");

      onCheck = function (checked)
      {
         drawTracksSized = checked;
         // Preview と Reference は排他: Preview を ON にしたら Reference 表示を解除
         if (checked && dialog.cbShowReference && dialog.cbShowReference.checked)
            dialog.cbShowReference.checked = false;

         if (dialog.t && dialog.t.Tracks)
         {
            if (drawTracksSized)
            {
               if (dialog.t.updatePreviewWithReference)
                  dialog.t.updatePreviewWithReference();
            }
            else
            {
               if (dialog.t.restoreOriginalPreview)
                  dialog.t.restoreOriginalPreview();
            }
            dialog.previewControl.forceRedraw();
         }
      }
   }

   // ====================== Reference 表示チェックボックス ======================
   // ON でリファレンス画像をプレビュー領域に表示。スクリプトを離れずに
   // リファレンス画像の中身を確認できる。
   this.cbShowReference = new CheckBox(this);
   with (this.cbShowReference)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text     = T("reference_show");   // 「Reference」(日本語モードでも英語表記)
      toolTip  = T("reference_show_tip");
      checked  = false;

      onCheck = function (checked)
      {
         if (checked)
         {
            // Reference view を取得: dialog.t.reference 優先、なければ cmbReferences から直接取得
            var refView = (dialog.t && dialog.t.reference) ? dialog.t.reference : null;
            if (!refView && dialog.cmbReferences)
            {
               var idx = dialog.cmbReferences.currentItem;
               if (idx > 1)   // 0=placeholder, 1="--- Open File... ---"
               {
                  var refId = dialog.cmbReferences.itemText(idx);
                  var wins = ImageWindow.windows;
                  for (var wi = 0; wi < wins.length; wi++)
                  {
                     try
                     {
                        var w = wins[wi];
                        if (!w || w.isNull || w.isClosed) continue;
                        if (!w.mainView || w.mainView.isNull) continue;
                        if (w.mainView.id === refId)
                        {
                           refView = w.mainView;
                           break;
                        }
                     }
                     catch (we) { continue; }
                  }
               }
            }

            if (!refView)
            {
               new MessageBox(
                  (currentLang == 'ja')
                     ? "リファレンス画像が選択されていません。\n上のリファレンスドロップダウンから選択するか、\n「--- Open File... ---」でファイルを開いてください。"
                     : "No reference image selected.\nPick one from the reference dropdown above\nor open a file via \"--- Open File... ---\".",
                  (currentLang == 'ja') ? "リファレンスなし" : "No reference",
                  StdIcon_Information, StdButton_Ok).execute();
               this.checked = false;
               return;
            }

            // Preview と排他: Reference を ON にしたら Preview 描画を解除
            if (dialog.cbDrawMode && dialog.cbDrawMode.checked)
            {
               dialog.cbDrawMode.checked = false;
               drawTracksSized = false;
            }

            // リファレンス画像のビットマップを生成してプレビューに表示
            try
            {
               var refWin = copyWindow(refView.window, refView.id + '_refprev_tmp');
               var refViewCopy = refWin.mainView;
               if (dialog.autoStretchEnabled)
               {
                  ApplyAutoSTF(refViewCopy, DEFAULT_AUTOSTRETCH_SCLIP, DEFAULT_AUTOSTRETCH_TBGND);
                  ApplyHistogram(refViewCopy);
               }
               var refBitmap = refViewCopy.image.render();
               refWin.forceClose();
               var metadata = (dialog.t && dialog.t.metadata)
                  ? dialog.t.metadata
                  : new Size(refBitmap);
               dialog.previewControl.SetImage(refBitmap, metadata);
               dialog.previewControl.forceRedraw();
            }
            catch (ex)
            {
               Console.warningln("Show reference failed: " + (ex.message || ex));
               this.checked = false;
               if (dialog.t && dialog.t.restoreOriginalPreview)
                  dialog.t.restoreOriginalPreview();
            }
         }
         else
         {
            // ターゲット画像のプレビューに戻す
            if (dialog.t && dialog.t.restoreOriginalPreview)
               dialog.t.restoreOriginalPreview();
            dialog.previewControl.forceRedraw();
         }
      }
   }

   // ====================== 新規追加：Multi Point Mode ======================
      this.cbMultiPoint = new CheckBox(this);
   with (this.cbMultiPoint)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      font = this.font;
      text  = 'Multi Point Mode (Curve)';
      checked = false;                    // The default is 2-point mode
      toolTip = '<b>If you check it, it will be in curve mode.</b><p>' +
                'Off (default): When you hit two points, the start and end points, it will automatically move to the next track.<p>' +
                'If you turn it on: you can draw a curve by placing more than 3 points.';

      onCheck = function (checked)
      {
         dialog.multiPointMode = checked;
         if (dialog.t && dialog.t.Tracks)
         {
            if (dialog.t.Tracks.count() > 0)
            {
               var currentTrack = dialog.t.Tracks.selectedTrack;
               if (currentTrack && currentTrack.count() > 0)
               {
                  dialog.t.Tracks.addTrack();        // Create a new empty track
                  selectedTrack = dialog.t.Tracks.selectedTrack;
               }
            }
            dialog.previewControl.forceRedraw();
         }
      }
   }

   this.btnApply = new PushButton(this);
   with (this.btnApply)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = this.foregroundColor;
      enabled = false;
      font = this.font;
      icon = this.scaledResource(':/icons/ok.png');
      text = T("apply");
      toolTip = T("apply_tooltip");

      onClick = function ( checked )
      {
         selectedTrack = null;
         // バッチモード中（現在ファイルが処理中）は Apply = 保存して次へ
         var isBatchActive = (batchQueue.length > 0 &&
                              batchIndex < batchQueue.length &&
                              batchQueue[batchIndex].status === 'current');
         if (isBatchActive)
         {
            if (outputFolder.length === 0)
            {
               new MessageBox('出力フォルダが指定されていません。',
                  'エラー', StdIcon_Error, StdButton_Ok).execute();
               return;
            }
            batchSaveAndNext(dialog);
         }
         else
         {
            save(dialog);
         }
      }
   }

   this.lblProcessing = new Label(this);
   with (this.lblProcessing)
   {
      backgroundColor = this.backgroundColor;
      foregroundColor = 0xff00f0ff;
      font = new Font("Helvetica", 10);
      font.bold = true;
      text = T("processing");
      visible = false;
   }


// Frames
   this.frame0 = new Frame(this);
   with (this.frame0)
   {
      backgroundColor = 0xff555555;

      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 0;
         addSpacing(offset);
         add(this.btnHelp);
         addSpacing(4);
         addStretch();
         // toolStretch / toolLang は previewControl.buttons_Box に移動
         add(this.toolNormal);
         addSpacing(4);
         add(this.toolMax);
     }
   }
   //
   this.frame1 = new Frame(this);
   with (this.frame1)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         add(this.workspaceViewList);
     }
   }

   //
   this.frame2 = new Frame(this);
   with (this.frame2)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 0;
         addSpacing(20);
         add(this.btnAdd);
         addStretch();
     }
   }
   //
   this.frame4 = new Frame(this);
   with (this.frame4)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 0;
         addSpacing(20);
         add(this.btnRemove);
         addStretch();
     }
   }
   // frame4 と同じスタイル。Undo の真下に Edit ボタンを配置。
   this.frameEdit = new Frame(this);
   with (this.frameEdit)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 0;
         addSpacing(20);
         add(this.btnEdit);
         addStretch();
     }
   }
   // ==================== frame5 の修正（中央揃えバージョン） ====================
this.frame5 = new Frame(this);
with (this.frame5)
{
   var sizer = new VerticalSizer();
   with (sizer)
   {
      addSpacing(4);

      // ComboBoxを中央揃えにするためのHorizontalSizer
      var refSizer = new HorizontalSizer();
      with (refSizer)
      {
         addStretch();                    // 左側の余白
         add(this.cmbReferences);         // ComboBox本体
         addStretch();                    // 右側の余白
      }
      add(refSizer);

      addSpacing(4);
   }
}
   //
         this.frame6 = new Frame(this);
   with (this.frame6)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 8;
         addSpacing(offset);
         add(dialog.lblLineWidth);
         addSpacing(8);
         add(dialog.cmbLineWidth);
         addSpacing(4);
         add(dialog.editLineWidth);
         addStretch();
      }
   }
   //
   this.frame7 = new Frame(this);
   with (this.frame7)
   {
      var sizer = new VerticalSizer();
      with (sizer)
      {
         margin = 8;
         var rowPv = new HorizontalSizer();
         with (rowPv)
         {
            addSpacing(offset);
            add(dialog.cbDrawMode);
            addStretch();
         }
         add(rowPv);
         addSpacing(2);
         var rowRef = new HorizontalSizer();
         with (rowRef)
         {
            addSpacing(offset);
            add(dialog.cbShowReference);
            addStretch();
         }
         add(rowRef);
         addSpacing(2);
         var rowMulti = new HorizontalSizer();
         with (rowMulti)
         {
            addSpacing(offset);
            add(dialog.cbMultiPoint);
            addStretch();
         }
         add(rowMulti);
     }
   }
   //
   this.frame8 = new Frame(this);
   with (this.frame8)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 0;
         addSpacing(20);
         add(this.btnApply);
         addSpacing(8);
         add(this.lblProcessing);
         addStretch();
     }
   }

   //

      this.frameBatchQueue = new Frame(this);
   with (this.frameBatchQueue)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 8;
         addSpacing(offset);
         add(dialog.btnQueueFiles);
         addStretch();
      }
   }

   this.frameBatchOutput = new Frame(this);
   with (this.frameBatchOutput)
   {
      var sizer = new VerticalSizer();
      with (sizer)
      {
         // frame4 (Undo) と同じスタイル: margin=0 + addSpacing(offset+8)=20
         // これで btnOutputFolder の先頭位置が btnQueueFiles / 追加・取消しと揃う
         margin = 0;
         var btnOutputSizer = new HorizontalSizer();
         with (btnOutputSizer)
         {
            addSpacing(offset + 8);
            add(dialog.btnOutputFolder);
            addStretch();
         }
         add(btnOutputSizer);
         addSpacing(4);
         var lblOutputSizer = new HorizontalSizer();
         with (lblOutputSizer)
         {
            addSpacing(offset + 8);
            add(dialog.lblOutputPath);
            addStretch();
         }
         add(lblOutputSizer);
      }
   }

   this.frameBatchSuffix = new Frame(this);
   with (this.frameBatchSuffix)
   {
      var sizer = new HorizontalSizer();
      with (sizer)
      {
         margin = 8;
         addSpacing(offset);
         add(dialog.lblSuffix);
         addSpacing(8);
         add(dialog.editSuffix);
         addStretch();
      }
   }

   this.frameBatchList = new Frame(this);
   with (this.frameBatchList)
   {
      var sizer = new VerticalSizer();
      with (sizer)
      {
         margin = 4;
         add(dialog.batchList);
         addSpacing(4);
         add(dialog.lblBatchProgress);
      }
   }

   this.frameBatchButtons = new Frame(this);
   with (this.frameBatchButtons)
   {
      var sizer = new VerticalSizer();
      with (sizer)
      {
         margin = 8;
         add(dialog.btnSaveNext);
         addSpacing(6);
         add(dialog.btnSkipNext);
         addSpacing(6);
         add(dialog.btnSkipNoSave);
         addSpacing(6);
         add(dialog.btnCancelBatch);
      }
   }


  // 上部エリア
      this.frameTop = new Frame(this);
   with (this.frameTop)
   {
      var sizer = new VerticalSizer();
      with (sizer)
      {
         margin = 4;
         add(this.frame1);           // ドロップダウンリスト
         addSpacing(8);
         add(this.frame5);           // Reference ComboBox
         addSpacing(8);
         add(this.frame2);           // Add
         addSpacing(2);
         add(this.frame4);           // Undo
         addSpacing(2);
         add(this.frameEdit);        // Edit
         addSpacing(2);
         add(this.frame8);           // Apply
         addSpacing(4);
         add(this.frame6);           // Line width
         addSpacing(4);
         add(this.frame7);           // Preview / Reference / Multi Point
         addSpacing(8);
         add(this.frameBatchQueue);
         addSpacing(2);
         add(this.frameBatchOutput);
         addSpacing(4);
         add(this.frameBatchSuffix);
         addSpacing(4);
         add(this.frameBatchList);
         addSpacing(4);
         add(this.frameBatchButtons);
         addStretch();
      }
   }

   // 下部エリア（常に下に固定）
   this.frameBottom = new Frame(this);
   with (this.frameBottom)
   {
      var sizer = new VerticalSizer();
      with (sizer)
      {
         margin = 4;
         add(this.lblCopyright);
      }
   }

   //
   this.leftFrame = new Frame(this);
   with (this.leftFrame)
   {
      setScaledFixedWidth(200);

      var sizer = new VerticalSizer();
      with (sizer)
      {
         add(this.frame0);
         add(this.frameTop);
         add(this.frameBottom);
      }
   }
   //
   this.rightFrame = new Frame(this);
   with (this.rightFrame)
   {
      backgroundColor = 0xff000000;
      sizer = new VerticalSizer();
      sizer.margin = 0;
      sizer.spacing = 0;
      sizer.add(this.previewControl)
      sizer.add(this.richTextBox);
   }
   //
   this.fullFrame = new Frame(this);
   with (this.fullFrame )
   {
      setScaledMinWidth(1200);
      setScaledMinHeight(800);
      sizer = new HorizontalSizer();
      sizer.add(this.leftFrame);
      sizer.add(this.rightFrame);
   }
   //
   this.sizer = new Sizer();
   this.sizer.add(this.fullFrame);

   this.userResizable = true;

   // ================ Initial state: Nothing is displayed ================
   this.t = {
      view: null,
      Tracks: new TrackCollection(new Rect(0,0,100,100)),
      hasReference: function() { return false; },
      clearReference: function() {},
      bitmap: new Bitmap(100, 100)
   };
   this.windowTitle = TITLE;
   this.btnAdd.enabled    = false;
   this.btnApply.enabled  = false;
   this.btnRemove.enabled = false;
   this.btnEdit.enabled   = false;
   // ====================================================================

   this.adjustToContents();
   processEvents();
}
// ====================== Batch processing function ======================

function batchUpdateList(dialog)
{
   dialog.batchList.clear();
   for (var i = 0; i < batchQueue.length; i++)
   {
      var st = batchQueue[i].status;
      var icon = '';
      if      (st == 'done')    icon = '✓';
      else if (st == 'skipped') icon = '→';
      else if (st == 'current') icon = '▶';
      else                      icon = '□';

      var name = batchQueue[i].fileName;
      var displayName = (name.length > 22) ? name.substring(0, 20) + '..' : name;

      var item = new TreeBoxNode(dialog.batchList);
      item.setText(0, icon + ' ' + displayName);
      item.setTextColor(0, 0xffffffff);
      item.setToolTip(0, batchQueue[i].fileName);
   }

   // Progress label update
   var done = 0;
   for (var i = 0; i < batchQueue.length; i++)
      if (batchQueue[i].status == 'done' || batchQueue[i].status == 'skipped') done++;
   if (batchQueue.length > 0)
      dialog.lblBatchProgress.text = done + ' / ' + batchQueue.length + ' 完了';
   else
      dialog.lblBatchProgress.text = '';
}

// ファイルリストと出力フォルダが両方揃っていれば、まだ開始していない場合にバッチを開始する。
function batchTryStart(dialog)
{
   if (batchQueue.length === 0 || outputFolder.length === 0) return;
   // すでに処理中のアイテムがあれば開始しない
   for (var i = 0; i < batchQueue.length; i++)
      if (batchQueue[i].status === 'current') return;
   // 既に開いているターゲットを破棄してからキュー処理を開始する
   if (dialog.t != null && dialog.t.view != null)
   {
      try
      {
         if (dialog.t.clearReference) dialog.t.clearReference();
         var oldWnd = dialog.t.view.window;
         dialog.t = null;
         if (!oldWnd.isNull && !oldWnd.isClosed)
            oldWnd.forceClose();
         processEvents();
      }
      catch (ex) { /* ignore */ }
   }
   batchIndex = 0;
   batchLoadNext(dialog);
}

function batchLoadNext(dialog)
{
   // 中断要求があればキュー処理をクリーンアップして抜ける
   if (batchCancelled)
   {
      batchCancelled = false;
      for (var i = 0; i < batchQueue.length; i++)
         if (batchQueue[i].status == 'waiting' || batchQueue[i].status == 'current')
            batchQueue[i].status = 'skipped';
      batchUpdateList(dialog);
      dialog.btnSaveNext.enabled    = false;
      dialog.btnSkipNext.enabled    = false;
      dialog.btnSkipNoSave.enabled  = false;
      dialog.btnCancelBatch.enabled = false;
      new MessageBox(T("batch_cancel_msg"),
         T("batch_cancel_title"), StdIcon_Information, StdButton_Ok).execute();
      return;
   }

   // Progress label update
   var found = -1;
   for (var i = batchIndex; i < batchQueue.length; i++)
   {
      if (batchQueue[i].status == 'waiting')
      {
         found = i;
         break;
      }
   }

   if (found < 0)
   {
      // All completed
      new MessageBox(T("batch_done"),
         T("batch_done_title"), StdIcon_Information, StdButton_Ok).execute();
      dialog.btnSaveNext.enabled    = false;
      dialog.btnSkipNext.enabled    = false;
      dialog.btnSkipNoSave.enabled  = false;
      dialog.btnCancelBatch.enabled = false;
      batchQueue = [];
      batchUpdateList(dialog);
      return;
   }

   batchIndex = found;
   batchQueue[batchIndex].status = 'current';
   batchUpdateList(dialog);

   var filePath = batchQueue[batchIndex].filePath;

   try
   {
      // Close the existing window
      if (dialog.t != null && dialog.t.view != null)
      {
         if (dialog.t.clearReference) dialog.t.clearReference();
         var oldWnd = dialog.t.view.window;
         dialog.t = null;
         if (!oldWnd.isNull && !oldWnd.isClosed)
            oldWnd.forceClose();
         processEvents();
      }

      var openedWindows = ImageWindow.open(filePath);
      if (!openedWindows || openedWindows.length === 0)
         throw new Error('ImageWindow.open() returned no windows');

      var targetWnd = openedWindows[0];
      targetWnd.show();
      targetWnd.zoomToOptimalFit();

      // Waiting for display
      for (var i = 0; i < 60; i++)
      {
         processEvents();
         if (!targetWnd.isNull && !targetWnd.isClosed &&
             !targetWnd.mainView.isNull && targetWnd.visible)
            break;
      }

      dialog.t = new viewsSetup(dialog, targetWnd, dialog.previewControl);
      dialog.windowTitle = TITLE + ' - ' + targetWnd.mainView.id +
                           '  [' + (batchIndex + 1) + '/' + batchQueue.length + ']';

      dialog.setSelectedTrack(null);
      dialog.btnAdd.enabled = true;
      dialog.btnRemove.enabled = false;
      dialog.btnApply.enabled = false;
      dialog.btnEdit.enabled = false;
      dialog.btnSaveNext.enabled    = (outputFolder.length > 0);
      dialog.btnSkipNext.enabled    = (outputFolder.length > 0);
      dialog.btnSkipNoSave.enabled  = true;
      dialog.btnCancelBatch.enabled = true;
      // 次のバッチファイルを開いたら Edit モードは解除
      dialog.editMode = false;
      if (dialog.btnEdit) { dialog.btnEdit.checked = false; dialog.btnEdit.icon = dialog.iconEditOff; }
      updateViewLists(dialog);
      if (dialog.checkReference) dialog.checkReference();

      // onItemSelected などの遅延イベントをフラッシュし、その後トラックをリセットして
      // 確実に1つの空トラックを選択状態にする。
      processEvents();
      if (dialog.t && dialog.t.Tracks)
      {
         dialog.t.Tracks.tracks = [];
         dialog.t.Tracks.selectedTrack = null;
         dialog.t.Tracks.addTrack();
         dialog.setSelectedTrack(dialog.t.Tracks.selectedTrack);
      }

   }
   catch (ex)
   {
      Console.writeln('Batch: failed to open ' + filePath + '\n' + ex);
      new MessageBox('Failed to open file:\n' + filePath + '\n\n' + (ex.message || ex),
         'エラー', StdIcon_Error, StdButton_Ok).execute();
      // Skip the error file and go to the next
      batchQueue[batchIndex].status = 'skipped';
      batchIndex++;
      batchLoadNext(dialog);
   }
}

function batchSaveFile(dialog, doApply)
{
   if (outputFolder.length === 0)
   {
      new MessageBox('出力フォルダが指定されていません。',
         'エラー', StdIcon_Error, StdButton_Ok).execute();
      return false;
   }

   var srcPath  = batchQueue[batchIndex].filePath;
   var fileName = batchQueue[batchIndex].fileName;

   // 拡張子とベース名を分離
   var dotPos  = fileName.lastIndexOf('.');
   var baseName = (dotPos >= 0) ? fileName.substring(0, dotPos) : fileName;
   var ext      = (dotPos >= 0) ? fileName.substring(dotPos)    : '';

   // Acquire a saffix (treat it as '' if it's empty)
   var suffix = dialog.editSuffix.text.trim();

   var outFileName = baseName + suffix + ext;
   var outPath     = outputFolder + '/' + outFileName;

   try
   {
      if (doApply)
      {
         // Apply the track
         save(dialog);
         processEvents();

         // Export the applied image to a file
         var view = dialog.t.view;
         var fmt  = ext.toLowerCase().replace('.', '');

         // FileFormat名のマッピング
         var fmtName;
         if      (fmt == 'xisf')                    fmtName = 'XISF';
         else if (fmt == 'fit' || fmt == 'fits' || fmt == 'fts') fmtName = 'FITS';
         else if (fmt == 'jpg' || fmt == 'jpeg')    fmtName = 'JPEG';
         else if (fmt == 'png')                     fmtName = 'PNG';
         else if (fmt == 'tif' || fmt == 'tiff')    fmtName = 'TIFF';
         else                                       fmtName = 'XISF';

         var fileFormat = new FileFormat(fmtName, false, true);
         if (fileFormat.isNull)
            throw new Error('FileFormat not available: ' + fmtName);

        var wnd = view.window;
         if (!wnd.saveAs(outPath, false, false, false, false))
            throw new Error('saveAs failed for: ' + outPath);

         Console.writeln('Batch: saved (applied) ' + outPath);

      }
      else
      {
         // Skip: Copy the file as it is
         File.copyFile(outPath, srcPath);
         Console.writeln('Batch: copied ' + srcPath + ' -> ' + outPath);
      }
      return true;
   }
   catch (ex)
   {
      Console.writeln('Batch: save failed\n' + ex);
      new MessageBox('Save failed:\n' + (ex.message || ex),
         'エラー', StdIcon_Error, StdButton_Ok).execute();
      return false;
   }
}

function batchSaveAndNext(dialog)
{
   if (dialog.t == null || dialog.t.view == null) return;

   var ok = batchSaveFile(dialog, true);
   if (ok)
      batchQueue[batchIndex].status = 'done';
   else
      batchQueue[batchIndex].status = 'skipped';

   batchIndex++;
   batchUpdateList(dialog);
   processEvents();
   batchLoadNext(dialog);
}

function batchSkipAndNext(dialog)
{
   if (batchQueue.length === 0) return;

   var ok = batchSaveFile(dialog, false);
   if (ok)
      batchQueue[batchIndex].status = 'skipped';
   else
      batchQueue[batchIndex].status = 'skipped';

   batchIndex++;
   batchUpdateList(dialog);
   processEvents();
   batchLoadNext(dialog);
}

function batchSkipNoCopy(dialog)
{
   if (batchQueue.length === 0) return;

   Console.writeln('Batch: skipping (no copy) ' + batchQueue[batchIndex].fileName);
   batchQueue[batchIndex].status = 'skipped';
   batchIndex++;
   batchUpdateList(dialog);
   processEvents();
   batchLoadNext(dialog);
}
// =================== End of the batch processing function ===================

function refreshPreviewBitmap(dialog)
{
   if (!dialog.t || !dialog.t.view || dialog.t.view.isNull) return;
   try
   {
      var tempWin = copyWindow(dialog.t.view.window, dialog.t.view.id + "_pv_refresh");
      var copyView = tempWin.mainView;
      if (dialog.autoStretchEnabled)
      {
         ApplyAutoSTF(copyView, DEFAULT_AUTOSTRETCH_SCLIP, DEFAULT_AUTOSTRETCH_TBGND);
         ApplyHistogram(copyView);
      }
      dialog.t.bitmap   = copyView.image.render();
      dialog.t.metadata = new Size(dialog.t.bitmap);
      tempWin.forceClose();
   }
   catch (ex) { Console.writeln('refreshPreviewBitmap: ' + ex); }
}

function save(dialog)
{
   try
   {
      dialog.btnApply.visible = false;
      dialog.lblProcessing.visible = true;
      processEvents();

      var mask = createMask(dialog);

      if (dialog.t.hasReference())
      {
         Console.writeln('\nFill track(s) with pixels from a reference frame');
         Console.writeln('=================================================\n');

         var fittedReference = dialog.t.getFittedReference();

         processImageWithMask(dialog.t.view, fittedReference, mask);

         dialog.t.clearFittedReference();
         Console.writeln('Pixel from reference image merged');
      }
      else
      {
         Console.writeln('\nFill track(s) with black color');
         Console.writeln('==============================\n');

         processImageWithMask(dialog.t.view, null, mask);
         Console.writeln('Black pixel merged');
      }

      Console.writeln('Close mask ' + mask.id);
      mask.window.forceClose();
      setTrackState(dialog.t.Tracks, true);

      // 適用済みトラックを消去し、処理後の画像をプレビューに反映する
      dialog.t.Tracks.tracks = [];
      dialog.t.Tracks.selectedTrack = null;
      dialog.setSelectedTrack(null);
      refreshPreviewBitmap(dialog);

      dialog.btnApply.visible = true;
      dialog.lblProcessing.visible = false;
      dialog.btnApply.enabled  = false;
      dialog.btnRemove.enabled = false;
      dialog.btnEdit.enabled   = false;
      processEvents();
      dialog.previewControl.forceRedraw();
   }
   catch (ex)
   {
      Console.writeln('Save failed\n' +ex);
      dialog.btnApply.visible = true;
      dialog.lblProcessing.visible = false;
   }
}

function createMask(dialog)
{
   var maskBitmap = new Bitmap(dialog.t.bitmap.width, dialog.t.bitmap.height);
   var g = new Graphics(maskBitmap);
   // 二値マスクを保証するためアンチエイリアス OFF
   // （Rejection Low で確実に弾くため、縁のピクセルも完全に 0 になる必要がある）
   g.antialiasing = false;
   g.fillRect(new Rect(0, 0, maskBitmap.width, maskBitmap. height),
      new Brush(0xffffffff));
   dialog.t.Tracks.paintMask(g, dialog.lastValidLineWidth);
   g.end();

   var image = new Image(maskBitmap.width, maskBitmap.height);
   image.blend(maskBitmap);

   var maskWin = new ImageWindow(dialog.t.bitmap.width, dialog.t.bitmap.height,
      1, 32, true, false, dialog.t.maskId);
   maskWin.mainView.beginProcess(UndoFlag_NoSwapFile);
   maskWin.mainView.image.apply(image);
   maskWin.mainView.endProcess();

   return maskWin.mainView;
}

function viewsSetup(dialog, Window, previewControl)
{
   this.editView = Window.mainView;

   this.meanOfMain = this.editView.image.mean();

   this.view = this.editView;

   var window = copyWindow(Window, Window.mainView.id + "_tracks");

   this.maskId = this.view.id + "_trackMask"

   var copyOfview = window.mainView;

   if (dialog.autoStretchEnabled)
   {
      ApplyAutoSTF(copyOfview, DEFAULT_AUTOSTRETCH_SCLIP,
         DEFAULT_AUTOSTRETCH_TBGND);
      ApplyHistogram(copyOfview);
   }

   this.bitmap = copyOfview.image.render();

   this.metadata = new Size(this.bitmap);

   window.forceClose();

   this.setReference = function (view)
   {
      this.clearReference();
      this.reference = view;
   }

   this.getFittedReference = function ()
   {
      if (this.reference == null) return null;

      if (fittedReference == null)
      {
         fittedReference = copyView(this.reference, '_reference');

         try
         {
            var P = new LinearFit;
            P.referenceViewId = this.editView.id;
            P.rejectLow = 0.000000;
            P.rejectHigh = 0.999;
            P.executeOn(fittedReference);
         }
         catch (ex)
         {
            // LinearFit が失敗しても処理自体は続行可能だが、
            // 輝度スケールが合わないと埋め込み部分に継ぎ目が出る可能性が高い。
            // ユーザーに必ず通知する。
            var msg = 'LinearFit failed: ' + (ex.message || ex);
            Console.warningln(msg);
            Console.warningln('Reference brightness will NOT be matched to the target. ' +
               'Filled trail area may show visible seams.');
            try
            {
               new MessageBox(
                  "LinearFit (輝度合わせ) に失敗しました。\n\n" +
                  "詳細: " + (ex.message || ex) + "\n\n" +
                  "このまま続行すると、Reference 画像との輝度差により、\n" +
                  "埋め込んだ軌跡部分に継ぎ目が見える可能性があります。\n" +
                  "Reference 画像が同じ被写体・近いコンディションで\n" +
                  "撮影されているか確認してください。",
                  "LinearFit Warning",
                  StdIcon_Warning, StdButton_Ok).execute();
            }
            catch (ex2)
            {
               // MessageBox 自体が失敗してもログは既に出ているので静かに続行
            }
         }
      }
      return fittedReference;
   }

   this.clearReference = function ()
   {
      if (fittedReference != null)
      {
         fittedReference.window.forceClose();
         fittedReference = null;
      }
      if (this.reference != null)
      {
         this.reference = null;
      }
   }

   this.clearFittedReference = function ()
   {
      if (fittedReference != null)
      {
         fittedReference.window.forceClose();
         fittedReference = null;
      }
   }

   this.hasReference = function ()
   {
      return this.reference != null;
   }

   this.reference = null;

   var fittedReference = null;

   this.Tracks = new TrackCollection(new Rect(0, 0, this.bitmap.width, this.bitmap.height));

   this.originalBitmap = this.bitmap;

   this.updatePreviewWithReference = function()
   {
      if (this.reference == null)
      {
         var testMask = new Bitmap(this.originalBitmap.width, this.originalBitmap.height);
         var tg = new Graphics(testMask);
         tg.fillRect(new Rect(0, 0, testMask.width, testMask.height), new Brush(0xffffffff));
         this.Tracks.paintMask(tg, dialog.lastValidLineWidth);
         tg.end();
         var w = this.originalBitmap.width;
         var h = this.originalBitmap.height;
         var maskBitmap = new Bitmap(w, h);
         var g = new Graphics(maskBitmap);
         g.fillRect(new Rect(0, 0, w, h), new Brush(0xffffffff));
         this.Tracks.paintMask(g, dialog.lastValidLineWidth);
         g.end();

         var resultBitmap = new Bitmap(w, h);
         var gc2 = new Graphics(resultBitmap);
         gc2.drawBitmap(0, 0, this.originalBitmap);
         gc2.end();
         // Use Graphics to directly synthesise masks into resultBitmap
         var gc3 = new Graphics(resultBitmap);
         gc3.pen = new Pen(0xff000000, dialog.lastValidLineWidth, PenStyle_Solid, PenCap_Round);
         gc3.brush = new Brush(0xff000000);
         var curve = [];
         for (var ti = 0; ti < this.Tracks.tracks.length; ti++)
         {
            var pts = getCurvePoints(this.Tracks.tracks[ti].trackPoints);
            if (pts.length > 0)
            {
               gc3.pen = new Pen(0xff000000, dialog.lastValidLineWidth, PenStyle_Solid, PenCap_Round);
               gc3.drawPolyline(pts);
            }
         }
         gc3.end();

         previewControl.SetImage(resultBitmap, this.metadata);
         return;
      }



      try
      {
         var w = this.bitmap.width;
         var h = this.bitmap.height;

         // Get the AutoSTF bitmap of Reference
         var refWin = copyWindow(this.reference.window, this.reference.id + '_prev_tmp');
         var refView = refWin.mainView;
         if (dialog.autoStretchEnabled)
         {
            ApplyAutoSTF(refView, DEFAULT_AUTOSTRETCH_SCLIP, DEFAULT_AUTOSTRETCH_TBGND);
            ApplyHistogram(refView);
         }
         var refBitmap = refView.image.render();
         refWin.forceClose();

         // Copy the original bitmap
         var resultBitmap = new Bitmap(w, h);
         var gc1 = new Graphics(resultBitmap);
         gc1.drawBitmap(0, 0, this.originalBitmap);
         gc1.end();  // ← ここでGraphicsを閉じてからsetPixelを使う

         // Make a truck-shaped mask (white = track part)
         var maskBitmap = new Bitmap(w, h);
         var gm = new Graphics(maskBitmap);
         gm.fillRect(new Rect(0, 0, w, h), new Brush(0xff000000));
         gm.pen = new Pen(0xffffffff, dialog.lastValidLineWidth, PenStyle_Solid, PenCap_Round);
         for (var ti = 0; ti < this.Tracks.tracks.length; ti++)
         {
            var pts = getCurvePoints(this.Tracks.tracks[ti].trackPoints);
            if (pts.length > 0)
               gm.drawPolyline(pts);
         }
         gm.end();

         // The track part is overwritten with refBitmap (setPixel is possible after closing Graphics)
         for (var py = 0; py < h; py++)
         {
            for (var px = 0; px < w; px++)
            {
               if ((maskBitmap.pixel(px, py) & 0x00ffffff) > 0)
                  resultBitmap.setPixel(px, py, refBitmap.pixel(px, py));
            }
         }

         previewControl.SetImage(resultBitmap, this.metadata);
      }
      catch (ex)
      {
         Console.writeln('Preview with reference failed: ' + ex);
         previewControl.SetImage(this.originalBitmap, this.metadata);
      }
    }

   this.restoreOriginalPreview = function()
   {
      previewControl.SetImage(this.originalBitmap, this.metadata);
   }

   // AutoStretch の切替などで、トラック・参照・ズーム倍率を保持したまま
   // プレビュー用ビットマップだけ再生成する
   this.refreshBitmap = function ()
   {
      var tmpWindow = copyWindow(Window, Window.mainView.id + "_tracks_refresh");
      var tmpView = tmpWindow.mainView;

      if (dialog.autoStretchEnabled)
      {
         ApplyAutoSTF(tmpView, DEFAULT_AUTOSTRETCH_SCLIP,
            DEFAULT_AUTOSTRETCH_TBGND);
         ApplyHistogram(tmpView);
      }

      this.bitmap = tmpView.image.render();
      this.originalBitmap = this.bitmap;
      this.metadata = new Size(this.bitmap);

      tmpWindow.forceClose();

      // 現在のズーム倍率を保ったままプレビュー更新
      previewControl.SetImage(this.bitmap, this.metadata, previewControl.zoom);
   };

   previewControl.SetImage(this.bitmap, this.metadata);
   // 新規ターゲット読み込み時のみカーソル可視状態をリセット (SetImage は
   // AutoStretch トグルなどでも呼ばれるため、リセットはここで明示的に実行)。
   previewControl.resetCursorVisibility();

   dialog.windowTitle = TITLE + ' - ' + Window.mainView.id;
}

function processColorImage(view, reference, mask)
{
   var w = view.image.width;
   var h = view.image.height;
   var numChannels = view.image.numberOfChannels;
   var rect = new Rect(0, 0, w, h);
   var m = new Float32Array(w * h);
   mask.image.getSamples(m, rect);

   // マスク値が 1.0 (純白) 以外はすべて「線の一部」とみなす。
   // Rejection Low 用途では、縁の部分被覆ピクセルも 0 / リファレンス値で
   // 確実に埋めないと中間値が Rejection をすり抜けるため。
   if (reference != null)
   {
      var refChannels = reference.image.numberOfChannels;

      for (var c = 0; c < numChannels; c++)
      {
         var v = new Float32Array(w * h);
         view.image.getSamples(v, rect, c);

         var refChannelIndex = (refChannels == 1) ? 0 : Math.min(c, refChannels - 1);
         var r = new Float32Array(w * h);
         reference.image.getSamples(r, rect, refChannelIndex);

         for (var i = 0; i < v.length; i++)
         {
            if (m[i] < 1.0) v[i] = r[i];
         }

         view.image.setSamples(v, rect, c);
      }
   }
   else
   {
      for (var c = 0; c < numChannels; c++)
      {
         var v = new Float32Array(w * h);
         view.image.getSamples(v, rect, c);

         for (var i = 0; i < v.length; i++)
         {
            if (m[i] < 1.0) v[i] = 0;
         }

         view.image.setSamples(v, rect, c);
      }
   }
}

function processImageWithMask(view, reference, mask)
{
   view.beginProcess();

   if (view.image.numberOfChannels == 1)
   {
      mergeReference(view, reference, mask);
   }
   else
   {
      processColorImage(view, reference, mask);
   }

   view.endProcess();
}

function mergeReference(view, reference, mask)
{
   var w = view.image.width;
   var h = view.image.height;
   var rect = new Rect(0, 0, w, h);

   var v = new Float32Array(w * h);
   view.image.getSamples(v, rect);

   var m = new Float32Array(w * h);
   mask.image.getSamples(m, rect);

   // マスク値が 1.0 (純白) 以外はすべて「線の一部」とみなす (縁残り防止)
   if (reference != null)
   {
      var refChannels = reference.image.numberOfChannels;
      var r = new Float32Array(w * h);

      if (refChannels == 1)
      {
         reference.image.getSamples(r, rect, 0);
      }
      else
      {
         // 3ch 参照 → 1ch ターゲット: Rec.709 輝度で合成
         var r0 = new Float32Array(w * h);
         var r1 = new Float32Array(w * h);
         var r2 = new Float32Array(w * h);
         reference.image.getSamples(r0, rect, 0);
         reference.image.getSamples(r1, rect, 1);
         reference.image.getSamples(r2, rect, 2);
         for (var i = 0; i < r.length; i++)
            r[i] = 0.2126 * r0[i] + 0.7152 * r1[i] + 0.0722 * r2[i];
      }

      for (var i = 0; i < v.length; i++)
      {
         if (m[i] < 1.0) v[i] = r[i];
      }
   }
   else
   {
      for (var i = 0; i < v.length; i++)
      {
         if (m[i] < 1.0) v[i] = 0;
      }
   }

   var image = new Image(v, w, h);
   view.image.apply(image);
}

function copyView(view, newName)
{
   var win = new ImageWindow(view.image.width, view.image.height,
                             view.image.numberOfChannels,
                             view.image.bitsPerSample, view.image.isReal,
                             view.image.isColor,
                             newName);
   win.hide();
   win.mainView.beginProcess(UndoFlag_NoSwapFile);
   win.mainView.image.apply(view.image);
   win.mainView.endProcess();
   return win.mainView;
}

function copyWindow( window, newName)
{
   var view = window.mainView;

   var win = new ImageWindow(view.image.width, view.image.height,
                             view.image.numberOfChannels,
                             view.image.bitsPerSample, view.image.isReal,
                             view.image.isColor,
                             newName);
   win.hide();
   win.mainView.beginProcess(UndoFlag_NoSwapFile);
   win.mainView.image.apply(view.image);
   win.mainView.endProcess();
   return win;
}

function GetPrimaryScreenDimensions(dialog)
{
   // クロスプラットフォーム対応:
   // まず dialog.availableScreenRect (PJSR 標準 API) を試し、
   // 次に Windows 環境限定のレジストリ風 INI を読む。
   // どちらも失敗した場合は 1920x1080 のデフォルトにフォールバックする。
   var x = 0;
   var y = 0;
   var w = 1920;
   var h = 1080;

   // 1) PJSR の availableScreenRect (macOS / Linux / Windows いずれでも動作)
   try
   {
      if (dialog && dialog.availableScreenRect)
      {
         var r = dialog.availableScreenRect;
         if (r.width > 0 && r.height > 0)
         {
            return {
               left:   (typeof r.x0 != 'undefined') ? r.x0 : 0,
               top:    (typeof r.y0 != 'undefined') ? r.y0 : 0,
               width:  r.width,
               height: r.height
            };
         }
      }
   }
   catch (ex) { /* fallthrough */ }

   // 2) Windows の PixInsight.ini (存在する場合のみ)
   try
   {
      var roamingDir = File.homeDirectory + '/AppData/Roaming/Pleiades';
      var ini = roamingDir + '/PixInsight.ini';
      if (File.exists(ini))
      {
         var n = 0;
         var iniStrings = File.readLines(ini);
         for (var i = 0; i < iniStrings.length; i++)
         {
            var s = iniStrings[i];
            var a = s.split('=');

            var k = a[0];
            var v = a[1];

            if (k == 'MainWindow\\Geometry\\Top')          { y = v.toInt(); n++; }
            else if (k == 'MainWindow\\Geometry\\Left')    { x = v.toInt(); n++; }
            else if (k == 'MainWindow\\Geometry\\DesktopWidth')  { w = v.toInt(); n++; }
            else if (k == 'MainWindow\\Geometry\\DesktopHeight') { h = v.toInt(); n++; }

            if (n == 4) break;
         }
      }
   }
   catch (ex) { /* fallthrough */ }

   return {left:x,top:y,width:w,height:h};
}

function Size(bitmap)
{
   this.width = bitmap.width;
   this.height = bitmap.height;
}

function getCurvePoints(points, tension, isClosed, numOfSegments)
{
   // ポイントが2つ未満の場合は空配列を返してエラーを防止
   if (!points || points.length < 2)
   {
      return [];
   }

   var pts = [];
   for (var i = 0; i < points.length; i++)
   {
      pts.push(points[i].x);
      pts.push(points[i].y);
   }

   tension = (typeof tension != 'undefined') ? tension : 0.5;
   isClosed = isClosed ? isClosed : false;
   numOfSegments = numOfSegments ? numOfSegments : 16;

   var _pts = [], res = [],
       x, y,
       t1x, t2x, t1y, t2y,
       c1, c2, c3, c4,
       st, t, i;

   _pts = pts.slice(0);

   if (isClosed)
   {
      _pts.unshift(pts[pts.length - 1]);
      _pts.unshift(pts[pts.length - 2]);
      _pts.unshift(pts[pts.length - 1]);
      _pts.unshift(pts[pts.length - 2]);
      _pts.push(pts[0]);
      _pts.push(pts[1]);
   }
   else
   {
      // 安全に処理（ポイント数が2以上の場合は pts[1] が存在する）
      _pts.unshift(pts[1]);
      _pts.unshift(pts[0]);
      _pts.push(pts[pts.length - 2]);
      _pts.push(pts[pts.length - 1]);
   }

   // カーブ計算（少なくとも4点以上必要）
   for (i = 2; i < (_pts.length - 4); i += 2)
   {
      for (t = 0; t <= numOfSegments; t++)
      {
         t1x = (_pts[i+2] - _pts[i-2]) * tension;
         t2x = (_pts[i+4] - _pts[i]) * tension;

         t1y = (_pts[i+3] - _pts[i-1]) * tension;
         t2y = (_pts[i+5] - _pts[i+1]) * tension;

         st = t / numOfSegments;

         c1 =  2 * Math.pow(st, 3) - 3 * Math.pow(st, 2) + 1;
         c2 = -2 * Math.pow(st, 3) + 3 * Math.pow(st, 2);
         c3 =     Math.pow(st, 3) - 2 * Math.pow(st, 2) + st;
         c4 =     Math.pow(st, 3) -     Math.pow(st, 2);

         x = c1 * _pts[i]    + c2 * _pts[i+2] + c3 * t1x + c4 * t2x;
         y = c1 * _pts[i+1]  + c2 * _pts[i+3] + c3 * t1y + c4 * t2y;

         res.push(new Point(x, y));
      }
   }

   return res;
}


function ApplyAutoSTF( view, shadowsClipping, targetBackground, rgbLinked )
{
   var stf = new ScreenTransferFunction;

   var n = view.image.isColor ? 3 : 1;

   var median = view.computeOrFetchProperty( "Median" );

   var mad = view.computeOrFetchProperty( "MAD" );
   mad.mul( 1.4826 );

   if ( rgbLinked )
   {
      var invertedChannels = 0;
      for ( var c = 0; c < n; ++c )
         if ( median.at( c ) > 0.5 )
            ++invertedChannels;

      if ( invertedChannels < n )
      {
         var c0 = 0, m = 0;
         for ( var c = 0; c < n; ++c )
         {
            if ( 1 + mad.at( c ) != 1 )
               c0 += median.at( c ) + shadowsClipping * mad.at( c );
            m  += median.at( c );
         }
         c0 = Math.range( c0/n, 0.0, 1.0 );
         m = Math.mtf( targetBackground, m/n - c0 );

         stf.STF = [
                     [c0, 1, m, 0, 1],
                     [c0, 1, m, 0, 1],
                     [c0, 1, m, 0, 1],
                     [0, 1, 0.5, 0, 1] ];
      }
      else
      {
         var c1 = 0, m = 0;
         for ( var c = 0; c < n; ++c )
         {
            m  += median.at( c );
            if ( 1 + mad.at( c ) != 1 )
               c1 += median.at( c ) - shadowsClipping * mad.at( c );
            else
               c1 += 1;
         }
         c1 = Math.range( c1/n, 0.0, 1.0 );
         m = Math.mtf( c1 - m/n, targetBackground );

         stf.STF = [
                     [0, c1, m, 0, 1],
                     [0, c1, m, 0, 1],
                     [0, c1, m, 0, 1],
                     [0, 1, 0.5, 0, 1] ];
      }
   }
   else
   {
      var A = [
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1] ];

      for ( var c = 0; c < n; ++c )
      {
         if ( median.at( c ) < 0.5 )
         {
            var c0 = (1 + mad.at( c ) != 1) ? Math.range( median.at( c ) + shadowsClipping * mad.at( c ), 0.0, 1.0 ) : 0.0;
            var m  = Math.mtf( targetBackground, median.at( c ) - c0 );
            A[c] = [c0, 1, m, 0, 1];
         }
         else
         {
            var c1 = (1 + mad.at( c ) != 1) ? Math.range( median.at( c ) - shadowsClipping * mad.at( c ), 0.0, 1.0 ) : 1.0;
            var m  = Math.mtf( c1 - median.at( c ), targetBackground );
            A[c] = [0, c1, m, 0, 1];
         }
      }

      stf.STF = A;
   }

   stf.executeOn( view );
}

function ApplyHistogram(view)
{
   var stf = view.stf;

   var H = [[  0, 0.0, 1.0, 0, 1.0],
            [  0, 0.5, 1.0, 0, 1.0],
            [  0, 0.5, 1.0, 0, 1.0],
            [  0, 0.5, 1.0, 0, 1.0],
            [  0, 0.5, 1.0, 0, 1.0]];

   if (view.image.isColor)
   {
      for (var c = 0; c < 3; c++)
      {
         H[c][0] = stf[c][1];
         H[c][1] = stf[c][0];
      }
   }
   else
   {
      H[3][0] = stf[0][1];
      H[3][1] = stf[0][0];
   }

   var STF = new ScreenTransferFunction;

   view.stf =  [
   [0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
   [0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
   [0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
   [0.00000, 1.00000, 0.50000, 0.00000, 1.00000]
   ];

   STF.executeOn(view)

   var HT = new HistogramTransformation;
   HT.H = H;
   HT.executeOn(view)
}

/*
 * Preview Control
 * Copyright (C) 2013-2020, Andres del Pozo
 * Contributions (C) 2019-2020, Juan Conejero (PTeam)
 * All rights reserved.
 */

#include <pjsr/ButtonCodes.jsh>
#include <pjsr/StdCursor.jsh>
function PreviewControl( parent )
{
   this.__base__ = Frame;
   this.__base__( parent );

   // ====================== ルーペ機能の状態 ======================
   this.loupeEnabled       = false;
   this.loupeMagnification = 4;       // プレビュー scale からさらに掛ける倍率
   this.loupeRadius        = 60;      // 画面座標での半径 (px)
   this.cursorX            = 0;       // image 座標でのカーソル位置 (画像外の値もそのまま保持)
   this.cursorY            = 0;
   this.cursorInside       = false;   // ビューポート上にカーソルがあるか
   this.cursorInImage      = false;   // imageRect 内にカーソルがあるか
   this.cursorWasInImage   = false;   // 画像読み込み後、一度でも画像内にカーソルが入ったか
                                      // (ターゲットを開いた直後の「画像端にいきなり十字が出る」現象を抑制)

   this.SetImage = function( image, metadata, zoom )
   {
      this.image = image;
      this.imageRect = new Rect(0, 0, image.width, image.height);
      this.metadata = metadata;
      this.scaledImage = null;
      this.SetZoomOutLimit();
      if (zoom === undefined) zoom = -100;
      this.UpdateZoom( zoom );
   };

   // 新規画像を読み込んだ直後の「カーソルが既に画像端の外にある状態」では
   // 十字/ルーペが画像端に張り付いて見えてしまうので、明示的にカーソル可視
   // 状態をリセットして、次に onMouseMove が画像内で発火するまで描画させない。
   // SetImage は AutoStretch トグル等でも呼ばれるため、リセットはここでは行わず
   // 新規ターゲットを開く側 (viewsSetup 構築時など) からこのメソッドを呼ぶ。
   this.resetCursorVisibility = function ()
   {
      this.cursorInside     = false;
      this.cursorInImage    = false;
      this.cursorWasInImage = false;
   };

   this.UpdateZoom = function( newZoom, refPoint )
   {
      newZoom = Math.max( this.zoomOutLimit, Math.min( 4, newZoom ) );
      if ( newZoom == this.zoom && this.scaledImage )
         return;

      if ( refPoint == null )
         refPoint = new Point( this.scrollbox.viewport.width/2, this.scrollbox.viewport.height/2 );

      let imgx = null;
      if ( this.scrollbox.maxHorizontalScrollPosition > 0 )
         imgx = (refPoint.x + this.scrollbox.horizontalScrollPosition)/this.scale;

      let imgy = null;
      if ( this.scrollbox.maxVerticalScrollPosition > 0 )
         imgy = (refPoint.y + this.scrollbox.verticalScrollPosition)/this.scale;

      this.zoom = newZoom;
      this.scaledImage = null;
      gc( true );

      if ( this.zoom > 0 )
      {
         this.scale = this.zoom;
         this.zoomVal_Label.text = format( "%d:1", this.zoom );
      }
      else
      {
         this.scale = 1/(-this.zoom + 2);
         this.zoomVal_Label.text = format( "1:%d", -this.zoom + 2 );
      }

      if ( this.image )
         this.scaledImage = this.image.scaled( this.scale );
      else
         this.scaledImage = {
            width: this.metadata.width * this.scale,
            height: this.metadata.height * this.scale
         };

      this.scrollbox.maxHorizontalScrollPosition = Math.max( 0, this.scaledImage.width - this.scrollbox.viewport.width );
      this.scrollbox.maxVerticalScrollPosition = Math.max( 0, this.scaledImage.height - this.scrollbox.viewport.height );

      if ( this.scrollbox.maxHorizontalScrollPosition > 0 && imgx != null )
         this.scrollbox.horizontalScrollPosition = imgx*this.scale - refPoint.x;
      if ( this.scrollbox.maxVerticalScrollPosition > 0 && imgy != null )
         this.scrollbox.verticalScrollPosition = imgy*this.scale - refPoint.y;

      this.scrollbox.viewport.update();
   };

   this.zoomIn_Button = new ToolButton( this );
   this.zoomIn_Button.icon = this.scaledResource( ":/icons/zoom-in.png" );
   this.zoomIn_Button.setScaledFixedSize( 24, 24 );
   this.zoomIn_Button.toolTip = "Zoom In";
   this.zoomIn_Button.onMousePress = function()
   {
      this.parent.parent.UpdateZoom( this.parent.parent.zoom + 1 );
   };

   this.zoomOut_Button = new ToolButton( this );
   this.zoomOut_Button.icon = this.scaledResource( ":/icons/zoom-out.png" );
   this.zoomOut_Button.setScaledFixedSize( 24, 24 );
   this.zoomOut_Button.toolTip = "Zoom Out";
   this.zoomOut_Button.onMousePress = function()
   {
      this.parent.parent.UpdateZoom( this.parent.parent.zoom - 1 );
   };

   this.zoom11_Button = new ToolButton( this );
   this.zoom11_Button.icon = this.scaledResource( ":/icons/zoom-1-1.png" );
   this.zoom11_Button.setScaledFixedSize( 24, 24 );
   this.zoom11_Button.toolTip = "Zoom 1:1";
   this.zoom11_Button.onMousePress = function()
   {
      this.parent.parent.UpdateZoom( 1 );
   };

   // Fit to Window — 画像がプレビュー枠にちょうど収まる倍率にする
   this.zoomFit_Button = new ToolButton( this );
   this.zoomFit_Button.icon = this.scaledResource( ":/icons/window.png" );
   this.zoomFit_Button.setScaledFixedSize( 24, 24 );
   this.zoomFit_Button.toolTip = "Fit to Window";
   this.zoomFit_Button.onMousePress = function()
   {
      var preview = this.parent.parent;
      // ビューポートサイズが変わっている可能性があるので再計算
      preview.SetZoomOutLimit();
      preview.UpdateZoom( preview.zoomOutLimit );
   };

   // ルーペ (拡大鏡) トグル — カーソル位置の画像を丸型に拡大表示する
   this.loupe_Button = new ToolButton( this );
   this.loupe_Button.icon = this.scaledResource( ":/icons/find.png" );
   this.loupe_Button.setScaledFixedSize( 24, 24 );
   this.loupe_Button.checkable = true;
   this.loupe_Button.toolTip = T("loupe_tooltip");
   this.loupe_Button.onClick = function( checked )
   {
      var preview = this.parent.parent;
      preview.loupeEnabled = checked;
      preview.forceRedraw();
   };

   this.buttons_Box = new Frame(this);
   this.buttons_Box.backgroundColor = 0xff555555;
   // sizer は dialog 側で構成する (toolStretch / toolLang が dialog スコープにあるため)
   // → dialog.setupPreviewToolbar() で完成する

   this.setScaledMinSize( 600, 400 );
   this.zoom = 1;
   this.scale = 1;
   this.zoomOutLimit = -5;
   this.scrollbox = new ScrollBox( this );
   this.scrollbox.autoScroll = true;
   this.scrollbox.tracking = true;
   this.scrollbox.cursor = new Cursor( StdCursor_Arrow );
   // 高ズーム時にスクロールバーのつまみが極端に小さくなって掴みにくいのを防ぐため、
   // つまみ (handle) に最小サイズを設定する。Qt のスタイルシート経由。
   // 端まで動かすのに必要なポインター移動量も短くする。
   this.scrollbox.styleSheet =
      "QScrollBar::handle:horizontal { min-width: 90px; }" +
      "QScrollBar::handle:vertical   { min-height: 90px; }";



   this.scroll_Sizer = new HorizontalSizer;
   this.scroll_Sizer.add( this.scrollbox );

   this.SetZoomOutLimit = function()
   {
      let scaleX = Math.ceil( this.metadata.width / this.scrollbox.viewport.width );
      let scaleY = Math.ceil( this.metadata.height / this.scrollbox.viewport.height );
      let scale = Math.max( scaleX, scaleY );
      this.zoomOutLimit = -scale + 2;
   };

   this.scrollbox.onHorizontalScrollPosUpdated = function( newPos )
   {
      this.viewport.update();
   };

   this.scrollbox.onVerticalScrollPosUpdated = function( newPos )
   {
      this.viewport.update();
   };

   this.forceRedraw = function()
   {
      this.scrollbox.viewport.update();
   };

   this.scrollbox.viewport.onMouseWheel = function( x, y, delta, buttonState, modifiers )
   {
      let preview = this.parent.parent;
      preview.UpdateZoom( preview.zoom + ((delta > 0) ? -1 : 1), new Point( x, y ) );
   };

   this.scrollbox.viewport.onMousePress = function( x, y, button, buttonState, modifiers )
   {
      let preview = this.parent.parent;

      {
         if(preview.onCustomMouseDown)
         {
            var p =  preview.transform(x, y, preview);
            // 画像外でクリックされた場合は画像端にクランプしてアンカーを置く。
            // 表示中の十字レチクル位置と一致させる。
            if (preview.image)
            {
               p.x = Math.max(0, Math.min(preview.image.width,  p.x));
               p.y = Math.max(0, Math.min(preview.image.height, p.y));
            }
            preview.onCustomMouseDown.call(this, p.x, p.y, button, buttonState, modifiers )
         }
      }

      this.cursor = new Cursor( StdCursor_ClosedHand );
   };

   this.transform = function(x, y, preview)
   {
      var scrollbox = preview.scrollbox;
      var ox = 0;
      var oy = 0;
      ox = scrollbox.maxHorizontalScrollPosition>0 ? -scrollbox.horizontalScrollPosition : (scrollbox.viewport.width-preview.scaledImage.width)/2;
      oy = scrollbox.maxVerticalScrollPosition>0 ? -scrollbox.verticalScrollPosition: (scrollbox.viewport.height-preview.scaledImage.height)/2;
      var coordPx = new Point((x - ox) / preview.scale, (y - oy) / preview.scale);
      return new Point(coordPx.x, coordPx.y);
   }


   this.scrollbox.viewport.onMouseMove = function( x, y, buttonState, modifiers )
   {
      let preview = this.parent.parent;
      if ( preview.scrolling )
      {
         preview.scrollbox.horizontalScrollPosition = preview.scrolling.orgScroll.x - (x - preview.scrolling.orgCursor.x);
         preview.scrollbox.verticalScrollPosition = preview.scrolling.orgScroll.y - (y - preview.scrolling.orgCursor.y);
      }

      let ox = (this.parent.maxHorizontalScrollPosition > 0) ?
                  -this.parent.horizontalScrollPosition : (this.width - preview.scaledImage.width)/2;
      let oy = (this.parent.maxVerticalScrollPosition > 0) ?
                  -this.parent.verticalScrollPosition : (this.height - preview.scaledImage.height)/2;
      let coordPx = new Point( (x - ox)/preview.scale, (y - oy)/preview.scale );

      // 画像外でも実カーソル位置を保持し、ルーペは「ビューポート内にあるか」で判定する。
      // これにより画像端を超えた瞬間にルーペが消えず、画像端が境界線としてルーペ内に
      // 残るようになる。十字レチクルとクリック位置は画像端にクランプして使う。
      var inImage = preview.imageRect.includes(coordPx);
      preview.cursorX       = coordPx.x;
      preview.cursorY       = coordPx.y;
      preview.cursorInside  = true;
      preview.cursorInImage = inImage;
      // 画像内に一度入ったらフラグを立てる。次に画像端を出てもルーペ/十字を維持。
      // ターゲットを開いた直後 (=フラグ false) はルーペ/十字を出さない。
      if (inImage)
         preview.cursorWasInImage = true;

      if (inImage)
      {
         preview.Xval_Label.text = coordPx.x.toFixed(0);
         preview.Yval_Label.text = coordPx.y.toFixed(0);

         if(preview.onCustomMouseMove)
         {
            var p =  preview.transform(x, y, preview);
            preview.onCustomMouseMove.call(this, p.x, p.y, buttonState, modifiers );
         }
      }
      else
      {
         // ドラッグ動作は画像外でフリーズさせる従来挙動を維持
         try
         {
            if(preview.onCustomMouseMove)
            {
               var p =  preview.transform(x, y, preview);
               preview.onCustomMouseMove.call(this, -1, -1, MouseButton_Unknown, KeyModifier_Control );
            }
            preview.Xval_Label.text = format( "%8.2f", coordPx.x );
            preview.Yval_Label.text = format( "%8.2f", coordPx.y );
         }
         catch ( ex )
         {
            preview.Xval_Label.text = "---";
            preview.Yval_Label.text = "---";
         }
      }

      preview.forceRedraw();
   };

   this.scrollbox.viewport.onMouseRelease = function( x, y, button, buttonState, modifiers )
   {
      let preview = this.parent.parent;
      if ( preview.scrolling && button == MouseButton_Left )
      {
         preview.scrollbox.horizontalScrollPosition = preview.scrolling.orgScroll.x - (x - preview.scrolling.orgCursor.x);
         preview.scrollbox.verticalScrollPosition = preview.scrolling.orgScroll.y - (y - preview.scrolling.orgCursor.y);
         preview.scrolling = null;
         this.cursor = new Cursor( StdCursor_Arrow  );
      }
      else
      {
         this.cursor = new Cursor( StdCursor_Arrow  );
      }

      if ( preview.onMouseRelease )
      {
         var p =  preview.transform(x, y, preview);
         preview.onMouseRelease.call(this, p.x, p.y, button, buttonState, modifiers );
      }
   };

   this.scrollbox.viewport.onResize = function( wNew, hNew, wOld, hOld )
   {
      let preview = this.parent.parent;
      if (!preview.metadata || !preview.scaledImage) return;
      if ( preview.metadata && preview.scaledImage )
      {
         this.parent.maxHorizontalScrollPosition = Math.max( 0, preview.scaledImage.width - wNew );
         this.parent.maxVerticalScrollPosition = Math.max( 0, preview.scaledImage.height - hNew );
         preview.SetZoomOutLimit();
         preview.UpdateZoom( preview.zoom );
      }
      this.update();
   };

   this.scrollbox.viewport.onPaint = function( x0, y0, x1, y1 )
   {
      let preview = this.parent.parent;
      if (!preview.scaledImage || !preview.image)
      {
         let graphics = new VectorGraphics( this );
         graphics.fillRect( x0, y0, x1, y1, new Brush( 0xff202020 ) );
         graphics.end();
         return;
      }
      let graphics = new VectorGraphics( this );

      graphics.fillRect( x0, y0, x1, y1, new Brush( 0xff202020 ) );

      let offsetX = (this.parent.maxHorizontalScrollPosition > 0) ?
            -this.parent.horizontalScrollPosition : ( this.width - preview.scaledImage.width ) / 2;
      let offsetY = (this.parent.maxVerticalScrollPosition > 0) ?
            -this.parent.verticalScrollPosition : ( this.height - preview.scaledImage.height ) / 2;
      graphics.translateTransformation( offsetX, offsetY );


      preview.offsetX = offsetX;
      preview.offsetY = offsetY;

      if ( preview.image )
         graphics.drawBitmap( 0, 0, preview.scaledImage );
      else
         graphics.fillRect( 0, 0, preview.scaledImage.width, preview.scaledImage.height, new Brush( 0xff000000 ) );

      graphics.pen = new Pen( 0x80ffffff, 0 );
      graphics.drawRect( -1, -1, preview.scaledImage.width + 1, preview.scaledImage.height + 1 );

      if ( preview.onCustomPaint )
      {
         graphics.scaleTransformation( preview.scale, preview.scale );
         preview.onCustomPaint.call( preview.onCustomPaint,
            graphics, 0, 0, preview.scaledImage.width, preview.scaledImage.height );
      }

      graphics.end();
   };

   this.offsetX = 0;
   this.offsetY = 0;

   this.getOffset = function()
   {
      return new Point(this.offsetX, this.offsetY);
   }

   this.zoomLabel_Label = new Label( this );
   this.zoomLabel_Label.text = "Zoom:";
   this.zoomVal_Label = new Label( this );
   this.zoomVal_Label.text = "1:1";
   this.zoomLabel_Label.foregroundColor = this.parent.foregroundColor;
   this.zoomLabel_Label.backgroundColor = this.parent.backgroundColor;
   this.zoomVal_Label.foregroundColor = this.parent.foregroundColor;
   this.zoomVal_Label.backgroundColor = this.parent.backgroundColor;


   this.Xlabel_Label = new Label( this );
   this.Xlabel_Label.text = "X:";
   this.Xval_Label = new Label( this );
   this.Xval_Label.text = "---";
   this.Xlabel_Label.foregroundColor = this.parent.foregroundColor;
   this.Xlabel_Label.backgroundColor = this.parent.backgroundColor;
   this.Xval_Label.foregroundColor = this.parent.foregroundColor;
   this.Xval_Label.backgroundColor = this.parent.backgroundColor;

   this.Ylabel_Label = new Label( this );
   this.Ylabel_Label.text = "Y:";
   this.Yval_Label = new Label( this );
   this.Yval_Label.text = "---";
   this.Ylabel_Label.foregroundColor = this.parent.foregroundColor;
   this.Ylabel_Label.backgroundColor = this.parent.backgroundColor;
   this.Yval_Label.foregroundColor = this.parent.foregroundColor;
   this.Yval_Label.backgroundColor = this.parent.backgroundColor;


   this.coords_Frame = new Frame( this );

   this.coords_Frame.foregroundColor = this.parent.foregroundColor;
   this.coords_Frame.font = this.parent.font;

   this.coords_Frame.styleSheet = this.scaledStyleSheet(
      "QLabel { font-family: Hack; background: white; }" );
   this.coords_Frame.backgroundColor = this.parent.backgroundColor;
   this.coords_Frame.sizer = new HorizontalSizer;
   this.coords_Frame.sizer.margin = 4;
   this.coords_Frame.sizer.spacing = 8;
   this.coords_Frame.sizer.add( this.zoomLabel_Label );
   this.coords_Frame.sizer.add( this.zoomVal_Label );
   this.coords_Frame.sizer.addSpacing( 20 );
   this.coords_Frame.sizer.add( this.Xlabel_Label );
   this.coords_Frame.sizer.add( this.Xval_Label );
   this.coords_Frame.sizer.addSpacing( 20 );
   this.coords_Frame.sizer.add( this.Ylabel_Label );
   this.coords_Frame.sizer.add( this.Yval_Label );
   this.coords_Frame.sizer.addStretch();


   this.sizer = new VerticalSizer;
   this.sizer.add( this.buttons_Box );
   this.sizer.add( this.scroll_Sizer );
   this.sizer.add( this.coords_Frame );
   // PreviewControl - Add to the end of the constructor
   this.image = null;
   this.metadata = { width: 100, height: 100 };  // ← A dummy
   this.scaledImage = { width: 100, height: 100 };  // ← A dummy
   this.imageRect = new Rect(0, 0, 100, 100);
}
PreviewControl.prototype = new Frame;



showDialog.prototype = new Dialog;

function updateViewLists(dialog)
{

   if (!dialog || !dialog.workspaceViewList) return;

   var currentSelection = dialog.workspaceViewList.currentItem;
   var currentText = (currentSelection >= 0) ? dialog.workspaceViewList.itemText(currentSelection) : '';

   dialog.workspaceViewList.clear();
   dialog.workspaceViewList.addItem(T("target_select_placeholder"));
   dialog.workspaceViewList.addItem(T("target_open_file"));

   var windows = ImageWindow.windows;
   var added = 0;

   for (var i = 0; i < windows.length; i++)
   {
      var wnd = windows[i];
      if (!wnd || wnd.isNull || wnd.isClosed || !wnd.visible || wnd.mainView.isNull)
         continue;

      var viewId = wnd.mainView.id;
      if (viewId.length === 0) continue;

      // 重複チェック
      var exists = false;
      for (var j = 0; j < dialog.workspaceViewList.numberOfItems; j++)
      {
         if (dialog.workspaceViewList.itemText(j) === viewId)
         {
            exists = true;
            break;
         }
      }
      if (!exists)
      {
         dialog.workspaceViewList.addItem(viewId);
         added++;
      }
   }

   if (currentText === T("target_open_file") || currentText === T("target_select_placeholder"))
   {
      dialog.workspaceViewList.currentItem = (currentText === T("target_open_file")) ? 1 : 0;
   }
   else
   {
      for (var k = 0; k < dialog.workspaceViewList.numberOfItems; k++)
      {
         if (dialog.workspaceViewList.itemText(k) === currentText)
         {
            dialog.workspaceViewList.currentItem = k;
            break;
         }
      }
   }
}

// 言語切替時に引き継ぐ状態 (onHide の前に保存、新ダイアログで復元)
var langRestartState = null;

function saveLangState(dialog)
{
   var state = {
      lineWidth:   dialog.lastValidLineWidth,
      suffix:      (dialog.editSuffix) ? dialog.editSuffix.text : '',
      currentWnd:  null,
      tracks:      [],
      selectedIdx: -1,
      refViewId:   null
   };

   if (dialog.t && dialog.t.view && !dialog.t.view.isNull)
   {
      state.currentWnd = dialog.t.view.window;

      if (dialog.t.reference && !dialog.t.reference.isNull)
         state.refViewId = dialog.t.reference.id;

      var tracks = dialog.t.Tracks.tracks;
      for (var i = 0; i < tracks.length; i++)
      {
         var pts = [];
         for (var j = 0; j < tracks[i].trackPoints.length; j++)
            pts.push({ x: tracks[i].trackPoints[j].x, y: tracks[i].trackPoints[j].y });
         state.tracks.push(pts);
         if (dialog.t.Tracks.selectedTrack &&
             dialog.t.Tracks.selectedTrack.trackIndex == i)
            state.selectedIdx = i;
      }
   }
   return state;
}

function restoreLangState(dialog, state)
{
   // 線幅・サフィックス
   dialog.applyLineWidth(state.lineWidth);
   if (dialog.editSuffix && state.suffix != null)
      dialog.editSuffix.text = state.suffix;

   // 出力フォルダ表示 (outputFolder はグローバルなので値は保持済み)
   if (dialog.lblOutputPath)
      dialog.lblOutputPath.text = (outputFolder.length > 0) ? outputFolder : T("not_set");

   // バッチキュー (batchQueue はグローバルなので値は保持済み)
   batchUpdateList(dialog);

   if (state.currentWnd == null || state.currentWnd.isNull || state.currentWnd.isClosed)
      return;

   // ウインドウ再接続
   dialog.t = new viewsSetup(dialog, state.currentWnd, dialog.previewControl);
   dialog.windowTitle = TITLE + ' - ' + state.currentWnd.mainView.id;

   // workspaceViewList で該当ウインドウを選択
   var viewId = state.currentWnd.mainView.id;
   for (var i = 0; i < dialog.workspaceViewList.numberOfItems; i++)
   {
      if (dialog.workspaceViewList.itemText(i) === viewId)
      {
         dialog.workspaceViewList.currentItem = i;
         break;
      }
   }

   // トラックを復元
   dialog.t.Tracks.tracks = [];
   dialog.t.Tracks.selectedTrack = null;
   for (var i = 0; i < state.tracks.length; i++)
   {
      if (state.tracks[i].length == 0) continue;
      dialog.t.Tracks.addTrack();
      var track = dialog.t.Tracks.tracks[dialog.t.Tracks.tracks.length - 1];
      track.trackPoints = [];
      for (var j = 0; j < state.tracks[i].length; j++)
         track.trackPoints.push(new Point(state.tracks[i][j].x, state.tracks[i][j].y));
      track.reorder();
   }
   if (state.selectedIdx >= 0 && state.selectedIdx < dialog.t.Tracks.count())
      dialog.t.Tracks.selectTrack(state.selectedIdx);

   // リファレンスを復元
   if (state.refViewId != null)
   {
      var wins = ImageWindow.windows;
      for (var i = 0; i < wins.length; i++)
      {
         var w = wins[i];
         if (!w.isNull && !w.isClosed && w.mainView.id == state.refViewId)
         {
            dialog.t.setReference(w.mainView);
            dialog.cmbReferences.addItem(state.refViewId);
            dialog.cmbReferences.currentItem = dialog.cmbReferences.numberOfItems - 1;
            break;
         }
      }
   }

   // ボタン状態
   var hasTracks = dialog.t.Tracks.count() > 0;
   dialog.btnAdd.enabled    = true;
   dialog.btnRemove.enabled = hasTracks;
   dialog.btnApply.enabled  = hasTracks;
   dialog.btnEdit.enabled   = hasTracks;
   dialog.btnSaveNext.enabled    = (outputFolder.length > 0);
   dialog.btnSkipNext.enabled    = (outputFolder.length > 0);
   dialog.btnSkipNoSave.enabled  = (batchQueue.length > 0);
   dialog.btnCancelBatch.enabled = (batchQueue.length > 0);

   dialog.previewControl.forceRedraw();
}

function main()
{
   // 起動時に保存済みの言語設定を反映
   currentLang = loadLang();

   // 言語切替ボタンで dialog.done(LANG_RESTART_CODE) が呼ばれたら
   // ダイアログを再生成するためのループ。
   var restart = true;
   while (restart)
   {
      restart = false;

      var windows = ImageWindow.windows;
      var openWindows = 0;
      var activeWnd = null;

      for (var i = 0; i < windows.length; i++)
      {
         var wnd = windows[i];
         if (!wnd.isNull && !wnd.isClosed && wnd.visible)
         {
            openWindows++;
            if (wnd.isActiveWindow)
               activeWnd = wnd;
         }
      }

      var dialog;

      if (openWindows === 0)
      {
         dialog = new showDialog(null);

         updateViewLists(dialog);

         if (dialog.btnAdd)    dialog.btnAdd.enabled = false;
         if (dialog.btnApply)  dialog.btnApply.enabled = false;
         if (dialog.btnRemove) dialog.btnRemove.enabled = false;
         if (dialog.btnEdit)   dialog.btnEdit.enabled = false;
         dialog.editMode = false;
         if (dialog.btnEdit) { dialog.btnEdit.checked = false; dialog.btnEdit.icon = dialog.iconEditOff; }

         if (dialog.previewControl && typeof dialog.previewControl.clear === "function")
            dialog.previewControl.clear();
      }
      else
      {
         if (activeWnd == null && openWindows > 0)
            activeWnd = windows[0];

         dialog = new showDialog(null);
         updateViewLists(dialog);
      }

      // 言語切替による再起動の場合、処理中の状態を復元する
      if (langRestartState != null)
      {
         restoreLangState(dialog, langRestartState);
         langRestartState = null;
      }

      var ret = dialog.execute();

      // 言語切替ボタンが押された場合はもう一度ダイアログを開く
      if (ret == LANG_RESTART_CODE)
         restart = true;
   }
}

main();
