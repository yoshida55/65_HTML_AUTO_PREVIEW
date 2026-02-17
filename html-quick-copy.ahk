; ========================================
; HTML自動プレビューツール用 AutoHotkey補助スクリプト
; ========================================
; 
; 機能: AIが生成したHTMLコードを簡単にコピー
; 使い方: Alt+H を押すだけ
; 
; 動作:
;   1. 現在のテキストを全選択
;   2. クリップボードにコピー
;   3. 元に戻す（Undo）
;   4. clipboard-watch.jsが自動検知して保存＆ブラウザ表示
; ========================================

; ホットキー: Alt+H (HTML Quick Copy)
!h::
{
    ; 全選択
    Send ^a
    Sleep 100
    
    ; コピー
    Send ^c
    Sleep 100
    
    ; 元に戻す（テキストを消さない）
    Send ^z
    
    ; 完了通知（オプション: コメントアウトして無効化可能）
    ToolTip, ✅ HTMLコードをコピーしました
    SetTimer, RemoveToolTip, 1000
    Return
}

RemoveToolTip:
SetTimer, RemoveToolTip, Off
ToolTip
Return

; ========================================
; 別の方法: カット（切り取り）バージョン
; ホットキー: Alt+X (HTML Quick Cut)
; ========================================
!x::
{
    ; 全選択
    Send ^a
    Sleep 100
    
    ; カット（切り取り）
    Send ^x
    
    ; 完了通知
    ToolTip, ✅ HTMLコードを切り取りました
    SetTimer, RemoveToolTip, 1000
    Return
}
