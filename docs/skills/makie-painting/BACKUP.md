# 這是備份，不是來源

- **來源**：這台機器的 `~/.claude/skills/makie-painting/`。規則只改那裡。
- **這份**：2026-11-18 從來源複製的副本，放進版本庫是為了換機器、雲端工作階段或資料夾遺失時還找得到定案版（使用者 2026-11-18 同意）。
- **不要直接改這裡的檔**。來源改了之後，在 repo 根目錄重新複製一次再提交：

```bash
cp ~/.claude/skills/makie-painting/*.md docs/skills/makie-painting/
```

- **兩邊不一致時以來源為準**。檢查有沒有落後：

```bash
diff -rq ~/.claude/skills/makie-painting docs/skills/makie-painting
```

（只會列出這個 `BACKUP.md` 才是同步的。）
- 外部代理（子代理、Codex、Gemini、雲端）讀不到 `~/.claude/skills/`：派工時把用得到的段落貼進派工單，可以從這份副本取。
- 來源遺失時：把這個資料夾（不含 `BACKUP.md`）複製回 `~/.claude/skills/makie-painting/`。
