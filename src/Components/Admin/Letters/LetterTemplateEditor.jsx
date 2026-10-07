import React, { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Icon } from "@iconify/react";
import "./LetterTemplateEditor.css";

// ─── Custom FontSize Extension ────────────────────────────────────────────────
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ─── Custom LineHeight Extension ──────────────────────────────────────────────
const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem"],
      defaultLineHeight: null,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
          ({ chain, commands }) => {
            this.options.types.forEach((type) => {
              try {
                commands.updateAttributes(type, { lineHeight });
              } catch (e) { }
            });
            return chain().setMark("textStyle", { lineHeight }).run();
          },
      unsetLineHeight:
        () =>
          ({ chain, commands }) => {
            this.options.types.forEach((type) => {
              try {
                commands.resetAttributes(type, "lineHeight");
              } catch (e) { }
            });
            return chain().setMark("textStyle", { lineHeight: null }).removeEmptyTextStyle().run();
          },
    };
  },
});

// ─── Placeholder Definitions ──────────────────────────────────────────────────
const PLACEHOLDERS_BY_TYPE = {
  internship: ["{employeeName}", "{designation}", "{department}", "{officeLocation}", "{internshipStartDate}", "{internshipEndDate}", "{internshipDuration}", "{stipend}", "{reportingTo}", "{workingHours}", "{dateOfJoining}", "{jobType}"],
  appointment: ["{employeeName}", "{designation}", "{Position}", "{department}", "{officeLocation}", "{dateOfJoining}", "{startDate}", "{start Date}", "{reportingTo}", "{monthlySalary}", "{ctc}", "{probationPeriod}", "{jobType}", "{job type}", "{INR amount /-}"],
  "intern-to-fulltime": ["{employeeName}", "{designation}", "{department}", "{officeLocation}", "{convertedJoiningDate}", "{startDate}", "{start Date}", "{job type}", "{jobType}", "{reportingTo}", "{monthlySalary}", "{convertedCtc}", "{probationPeriod}", "{INR amount /-}"],
  "additional-info": ["{employeeName}", "{designation}", "{department}"],
  increment: ["{employeeName}", "{designation}", "{department}", "{dateOfIssue}", "{effectiveFrom}", "{previousSalary}", "{incrementPercentage}", "{newSalary}", "{incrementAmount}", "{allowancesTable}"],
  termination: ["{employeeName}", "{designation}", "{department}", "{dateOfIssue}", "{effectiveDate}", "{noticePeriod}", "{reason}", "{settlementStatus}", "{signatoryName}", "{signatoryTitle}"],
};

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Calibri", value: "Calibri, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { label: "Courier New", value: '"Courier New", monospace' },
];

const FONT_SIZES = ["10px", "11px", "12px", "13px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_SPACINGS = ["1.0", "1.15", "1.25", "1.5", "1.75", "2.0", "2.5"];

// ─── Toolbar Primitives ───────────────────────────────────────────────────────
const TBtn = ({ onClick, active, disabled, title, children }) => (
  <button type="button" title={title} disabled={!!disabled} onClick={onClick}
    className={`lte-tb-btn${active ? " lte-tb-btn--on" : ""}${disabled ? " lte-tb-btn--off" : ""}`}>
    {children}
  </button>
);
const TDivider = () => <span className="lte-tb-divider" />;

const sanitizeHtmlContent = (html) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s*on\w+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, "")
    .replace(/href\s*=\s*(["'])javascript:[\s\S]*?\1/gi, 'href="#"');
};

const cleanHtmlForEditor = (raw) => {
  if (!raw) return "";
  let html = raw;
  if (typeof html === "string" && (html.includes("&lt;") || html.includes("&gt;"))) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    html = doc.body.textContent || html;
  }
  return sanitizeHtmlContent(html);
};


// ─── Main Editor Component ────────────────────────────────────────────────────
const LetterTemplateEditor = ({
  letterType,
  initialHtml,
  subjectValue,
  isCustomized = false,
  onSave,
  onPreview,
  onReset,
  onBack
}) => {
  const [subject, setSubject] = useState(subjectValue || "");
  const [selectedTableSize, setSelectedTableSize] = useState("11px");

  const parsedContent = React.useMemo(() => cleanHtmlForEditor(initialHtml), [initialHtml]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content: parsedContent || "",
    editorProps: { attributes: { class: "lte-editor-area", spellcheck: "true" } },
  });

  // Sync content when initialHtml changes (reset / letter type switch)
  useEffect(() => {
    if (editor && !editor.isDestroyed && parsedContent !== undefined) {
      editor.commands.setContent(parsedContent || "", false);
    }
  }, [parsedContent]); // eslint-disable-line

  useEffect(() => { setSubject(subjectValue || ""); }, [subjectValue]);

  const insertPlaceholder = useCallback((text) => {
    editor?.chain().focus().insertContent(text).run();
  }, [editor]);

  if (!editor) return null;

  const placeholders = PLACEHOLDERS_BY_TYPE[letterType] || [];
  const typeName =
    letterType === "internship" ? "Internship Letter"
      : letterType === "appointment" ? "Direct Appointment Letter"
        : letterType === "additional-info" ? "Additional Information"
          : letterType === "increment" ? "Increment Letter"
            : "Intern → Full-time Letter";

  const curColor = editor.getAttributes("textStyle").color || "#000000";
  const curHL = editor.getAttributes("highlight").color || "#ffff00";
  const curFF = editor.getAttributes("textStyle").fontFamily || "";
  const curFS = editor.getAttributes("textStyle").fontSize || "";
  const curLH =
    editor.getAttributes("textStyle").lineHeight ||
    editor.getAttributes("paragraph").lineHeight ||
    editor.getAttributes("heading").lineHeight ||
    "";

  return (
    <div className="lte-root">

      {/* Header */}
      <div className="lte-header">
        <button className="lte-back-btn" type="button" onClick={onBack}>
          <Icon icon="lucide:arrow-left" width="15" /> Back to Templates
        </button>
        <div className="lte-header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 className="lte-header-title" style={{ margin: 0 }}>
              <Icon icon="lucide:file-edit" width="18" /> Editing: {typeName}
            </h3>
            {isCustomized ? (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#4338ca", backgroundColor: "#e0e7ff", padding: "2px 8px", borderRadius: "12px" }}>
                Customized Version Active
              </span>
            ) : (
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#15803d", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: "12px" }}>
                Default Template Active
              </span>
            )}
          </div>
          <p className="lte-header-hint">
            Custom edits are saved separately. Default template is always preserved. Use <kbd>{"{placeholders}"}</kbd> for dynamic data.
          </p>
        </div>
      </div>

      {/* Subject */}
      {/* <div className="lte-subject-row">
        <label className="lte-subject-label">Letter Subject / Title</label>
        <input className="lte-subject-input" type="text" value={subject}
          onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Appointment Letter" />
      </div> */}

      {/* Toolbar */}
      <div className="lte-toolbar">
        <TBtn title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Icon icon="lucide:undo-2" width="14" />
        </TBtn>
        <TBtn title="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Icon icon="lucide:redo-2" width="14" />
        </TBtn>
        <TDivider />

        <select className="lte-tb-select lte-sel-block" title="Block Type"
          value={editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "p"}
          onChange={(e) => { const v = e.target.value; v === "p" ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: parseInt(v) }).run(); }}>
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <select className="lte-tb-select lte-sel-font" title="Font Family" value={curFF}
          onChange={(e) => e.target.value ? editor.chain().focus().setFontFamily(e.target.value).run() : editor.chain().focus().unsetFontFamily().run()}>
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <select className="lte-tb-select lte-sel-size" title="Font Size" value={curFS}
          onChange={(e) => e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run()}>
          <option value="">Size</option>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace("px", "")}</option>)}
        </select>

        <select
          className="lte-tb-select lte-sel-spacing"
          title="Line Spacing"
          value={curLH}
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setLineHeight(e.target.value).run()
              : editor.chain().focus().unsetLineHeight().run()
          }
        >
          <option value="">Line Spacing</option>
          {LINE_SPACINGS.map((ls) => (
            <option key={ls} value={ls}>
              {ls}
            </option>
          ))}
        </select>
        <TDivider />

        <TBtn title="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Icon icon="lucide:bold" width="14" />
        </TBtn>
        <TBtn title="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Icon icon="lucide:italic" width="14" />
        </TBtn>
        <TBtn title="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Icon icon="lucide:underline" width="14" />
        </TBtn>
        <TBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Icon icon="lucide:strikethrough" width="14" />
        </TBtn>
        <TDivider />

        <label className="lte-color-label" title="Text Color">
          <Icon icon="lucide:type" width="14" style={{ color: curColor }} />
          <input type="color" className="lte-color-input" value={curColor}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
        </label>
        <label className="lte-color-label" title="Highlight Color">
          <Icon icon="lucide:highlighter" width="14" style={{ color: curHL }} />
          <input type="color" className="lte-color-input" value={curHL}
            onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()} />
        </label>
        <TDivider />

        <TBtn title="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <Icon icon="lucide:align-left" width="14" />
        </TBtn>
        <TBtn title="Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <Icon icon="lucide:align-center" width="14" />
        </TBtn>
        <TBtn title="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <Icon icon="lucide:align-right" width="14" />
        </TBtn>
        <TBtn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <Icon icon="lucide:align-justify" width="14" />
        </TBtn>
        <TDivider />

        <TBtn title="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <Icon icon="lucide:list" width="14" />
        </TBtn>
        <TBtn title="Numbered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <Icon icon="lucide:list-ordered" width="14" />
        </TBtn>
        <TDivider />

        <TBtn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Icon icon="lucide:minus" width="14" />
        </TBtn>
        <TBtn title="Clear Formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <Icon icon="lucide:eraser" width="14" />
        </TBtn>
      </div>

      {/* Body */}
      <div className="lte-body">
        <div className="lte-editor-panel">
          <div className="lte-page-wrap">
            <EditorContent editor={editor} />
          </div>
        </div>

        <aside className="lte-ph-panel">
          <div className="lte-ph-title"><Icon icon="lucide:braces" width="14" /> Placeholders</div>
          <p className="lte-ph-hint">Click to insert at cursor</p>
          <div className="lte-ph-list">
            {placeholders.map((ph) => (
              <button key={ph} type="button" className="lte-ph-chip"
                onClick={() => insertPlaceholder(ph)} title={`Insert ${ph}`}>{ph}</button>
            ))}
          </div>

          {/* Insert Allowances Table — increment letter only */}
          {letterType === "increment" && (
            <div className="lte-ph-table-insert">
              <div className="lte-ph-table-label">
                <Icon icon="lucide:table" width="13" /> Allowances Table Option
              </div>
              <p className="lte-ph-table-hint">
                Select table text size and insert the allowances table into your template.
              </p>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "4px" }}>
                  Table Text Size:
                </label>
                <select
                  value={selectedTableSize}
                  onChange={(e) => setSelectedTableSize(e.target.value)}
                  style={{ width: "100%", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", padding: "0 8px", fontSize: "12px", background: "#fff", cursor: "pointer" }}
                >
                  <option value="9px">9px (Very Small)</option>
                  <option value="10px">10px (Small)</option>
                  <option value="11px">11px (Medium / Default)</option>
                  <option value="12px">12px (Regular)</option>
                  <option value="13px">13px (Large)</option>
                  <option value="14px">14px (Extra Large)</option>
                </select>
              </div>

              <button
                type="button"
                className="lte-ph-table-btn"
                onClick={() => insertPlaceholder(`<p style="font-size: ${selectedTableSize};">{allowancesTable}</p>`)}
                title="Insert Allowances Table with selected text size"
              >
                <Icon icon="lucide:table-2" width="14" /> Insert Table ({selectedTableSize})
              </button>
            </div>
          )}

          <div className="lte-ph-note">
            <Icon icon="lucide:info" width="12" /> Replaced during Preview &amp; PDF only.
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="lte-footer">
        <button
          type="button"
          className="common-modal-btn btn-small-cancel"
          onClick={async () => {
            if (onReset) {
              const resData = await onReset();
              if (resData && editor) {
                const defContent = resData.defaultHtml || resData.html || "";
                editor.commands.setContent(cleanHtmlForEditor(defContent), false);
                if (resData.subject !== undefined) {
                  setSubject(resData.subject);
                }
              }
            }
          }}
        >
          <Icon icon="lucide:rotate-ccw" width="14" /> Reset to Default
        </button>
        <div className="lte-footer-actions">
          <button type="button" className="common-modal-btn btn-small-cancel" onClick={onBack}>Cancel</button>
          <button type="button" className="lte-btn lte-btn-preview"
            onClick={() => onPreview({ subject, html: editor.getHTML() })}>
            <Icon icon="lucide:eye" width="14" /> Preview
          </button>
          <button type="button" className="common-modal-btn btn-update "
            onClick={() => {
              let html = editor.getHTML();
              if (html === "<p></p>" || html === "<p><br></p>" || html.trim() === "") {
                html = "";
              }
              onSave({
                subject,
                html
              });
            }}>
            <Icon icon="lucide:save" width="14" /> Save Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default LetterTemplateEditor;
