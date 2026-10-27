"use client"

import * as React from "react"
import { EmojiPicker } from "@ferrucc-io/emoji-picker"
import {
  X,
  Wand2Icon,
  ImagePlus,
  SmileIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Separator } from "./ui/separator"
import { Spinner } from "./ui/spinner"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { ImageObject } from "@/types/post.type"
import { sanitizeRichTextContent } from "@/lib/rich-text"

interface ContentTextareaProps {
  value: string
  onChange: (value: string) => void
  title?: string
  onTitleChange?: (value: string) => void
  showTitleInput?: boolean
  titlePlaceholder?: string
  placeholder?: string
  contentClass?: string
  minHeight?: number
  showAIAssistant?: boolean
  onAIAssistantClick?: () => void
  showHashtag?: boolean
  className?: string
  images?: ImageObject[]
  onImagesChange?: (images: ImageObject[]) => void
  renderToolbarRight?: React.ReactNode
  renderContent?: React.ReactNode
  disabled?: boolean
}

const toolButtons = [
  { label: "Gras", command: "bold", icon: Bold },
  { label: "Italique", command: "italic", icon: Italic },
  { label: "Souligné", command: "underline", icon: Underline },
  { label: "Barré", command: "strikeThrough", icon: Strikethrough },
  { label: "Liste", command: "insertUnorderedList", icon: List },
  { label: "Numérotation", command: "insertOrderedList", icon: ListOrdered },
  { label: "Citer", command: "formatBlock", value: "blockquote", icon: Quote },
]

const ContentTextarea = ({
  value,
  onChange,
  title = "",
  onTitleChange,
  showTitleInput = false,
  titlePlaceholder = "Titre de la publication",
  placeholder = "À quoi pensez-vous ?",
  contentClass,
  minHeight = 280,
  showAIAssistant = false,
  onAIAssistantClick,
  className,
  images = [],
  onImagesChange,
  renderToolbarRight,
  renderContent,
  disabled = false,
}: ContentTextareaProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const editorRef = React.useRef<HTMLDivElement>(null)
  const titleEditorRef = React.useRef<HTMLDivElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [emojiOpen, setEmojiOpen] = React.useState(false)

  const syncEditorContent = React.useCallback(() => {
    const root = editorRef.current
    if (!root) return

    const sanitized = sanitizeRichTextContent(root.innerHTML)
    if (sanitized !== value) {
      onChange(sanitized)
    }
  }, [onChange, value])

  // Only rehydrate the editor from external changes when it is not focused,
  // so typing, formatting and the caret are never clobbered.
  React.useEffect(() => {
    const root = editorRef.current
    if (!root) return
    if (document.activeElement === root) return

    const sanitizedValue = sanitizeRichTextContent(value || "")
    if (root.innerHTML !== sanitizedValue) {
      root.innerHTML = sanitizedValue || ""
    }
  }, [value])

  const syncTitleContent = React.useCallback(() => {
    const el = titleEditorRef.current
    if (!el) return

    const sanitized = sanitizeRichTextContent(el.innerHTML)
    if (sanitized !== title) {
      onTitleChange?.(sanitized)
    }
  }, [onTitleChange, title])

  React.useEffect(() => {
    const el = titleEditorRef.current
    if (!el) return
    if (document.activeElement === el) return

    const sanitized = sanitizeRichTextContent(title || "")
    if (el.innerHTML !== sanitized) {
      el.innerHTML = sanitized || ""
    }
  }, [title])

  const toggleTitleBold = () => {
    if (disabled) return

    const el = titleEditorRef.current
    if (!el) return

    const selection = window.getSelection()
    const insideTitle = !!selection && selection.rangeCount > 0 && !!selection.anchorNode && el.contains(selection.anchorNode)

    el.focus()

    // When there is no selection (or it is outside the title), bold the whole title.
    if (!insideTitle || (selection && selection.isCollapsed)) {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }

    document.execCommand("styleWithCSS", false, "false")
    document.execCommand("bold", false)
    syncTitleContent()
  }

  const insertEmoji = (emoji: string) => {
    if (disabled) return
    const editor = editorRef.current
    if (!editor) {
      onChange(`${value}${emoji}`)
      setEmojiOpen(false)
      return
    }

    editor.focus()
    document.execCommand("insertText", false, emoji)
    syncEditorContent()
    setEmojiOpen(false)
  }

  const applyFormat = (command: string, valueArg?: string) => {
    if (disabled) return

    const editor = editorRef.current
    if (!editor) {
      onChange(value)
      return
    }

    editor.focus()
    document.execCommand("styleWithCSS", false, "false")
    document.execCommand(command, false, valueArg)
    syncEditorContent()
  }

  const handleInsertLink = () => {
    if (disabled) return

    const url = window.prompt("Ajouter un lien", "https://")
    if (!url) return

    applyFormat("createLink", url)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newImages = [...images]

    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const result = await response.json()
      const uploadedImages = Array.isArray(result.images)
        ? result.images
        : result.image
          ? [result.image]
          : []

      if (uploadedImages.length > 0) {
        newImages.push(
          ...uploadedImages.map((image: { url: string; key: string }) => ({
            url: image.url,
            key: image.key,
          }))
        )
      }

      onImagesChange?.(newImages)
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    onImagesChange?.(images.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="mb-2 flex items-center gap-1 border-b border-border/70 pb-2">
        {toolButtons.map(({ label, command, value: valueArg, icon: Icon }) => (
          <Button
            key={command}
            type="button"
            aria-label={label}
            variant="ghost"
            size="icon"
            className="size-8"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat(command, valueArg)}
            disabled={disabled}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}

        <Button
          type="button"
          aria-label="Ajouter un lien"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleInsertLink}
          disabled={disabled}
          title="Ajouter un lien"
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button size="icon" className="cursor-pointer" variant="ghost" disabled={disabled}>
              <SmileIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] p-0!">
            <EmojiPicker
              onEmojiSelect={(emoji) => insertEmoji(String(emoji))}
              className="w-full! rounded-lg bg-popover ring-0!"
              emojisPerRow={6}
              emojiSize={36}
            >
              <EmojiPicker.Header className="border-b border-border pb-2">
                <EmojiPicker.Input
                  placeholder="Rechercher un emoji"
                  autoFocus
                  className="h-8 border border-border! bg-background ring-0!"
                />
              </EmojiPicker.Header>
              <EmojiPicker.Group>
                <EmojiPicker.List hideStickyHeader containerHeight={320} />
              </EmojiPicker.Group>
            </EmojiPicker>
          </PopoverContent>
        </Popover>
      </div>

      {showTitleInput && (
        <div className={cn(
          "mb-3 flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2 transition-colors focus-within:border-primary",
          disabled && "cursor-not-allowed opacity-60"
        )}>
          <div
            ref={titleEditorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            data-placeholder={titlePlaceholder}
            onInput={syncTitleContent}
            onBlur={syncTitleContent}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                editorRef.current?.focus()
                return
              }
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
                event.preventDefault()
                toggleTitleBold()
              }
            }}
            className={cn(
              "min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-2 text-sm font-medium text-foreground outline-none",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/70 empty:before:pointer-events-none"
            )}
          />
          <Button
            type="button"
            aria-label="Mettre le titre en gras"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleTitleBold}
            disabled={disabled}
            title="Gras"
          >
            <Bold className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={syncEditorContent}
        onBlur={syncEditorContent}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            if (event.shiftKey) {
              document.execCommand("insertLineBreak", false)
            } else {
              document.execCommand("insertParagraph", false)
            }
            syncEditorContent()
            return
          }

          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
            event.preventDefault()
            applyFormat("bold")
          }
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
            event.preventDefault()
            applyFormat("italic")
          }
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "u") {
            event.preventDefault()
            applyFormat("underline")
          }
        }}
        className={cn(
          "min-w-0 w-full overflow-y-auto outline-none text-sm leading-7 text-foreground",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
          disabled && "cursor-not-allowed opacity-60",
          contentClass,
        )}
        style={{ minHeight: `${minHeight}px`, maxHeight: `${minHeight}px` }}
      />

      <div className="shrink-0 space-y-0 mt-3">
        <div className="flex items-center gap-3">
          <div
            onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
            className={cn(
              `group shrink-0 w-full max-w-[240px] border border-dashed border-muted-foreground/25
               rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer
               hover:border-primary/60 hover:bg-primary/5 transition-all mb-3 px-3 py-4 shadow-sm`,
              (isUploading || disabled) && "opacity-50 cursor-not-allowed",
              disabled && "grayscale"
            )}
          >
            {isUploading ? <Spinner /> : <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
              {isUploading ? "Envoi..." : "Ajouter une image ou une vidéo"}
            </span>
            <span className="text-[11px] text-muted-foreground/80">JPG, PNG, MP4, MOV</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />

          {images.length > 0 && (
            <div className="flex gap-3 w-full max-w-[460px] overflow-x-auto pb-2">
              {images.map((image, index) => (
                <div
                  key={image.key || index}
                  className="shrink-0 relative size-24 rounded-lg overflow-hidden border"
                >
                  <img
                    src={image.url}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {showAIAssistant && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-7 gap-1.5 text-sm"
                onClick={onAIAssistantClick}
                disabled={disabled}
              >
                <Wand2Icon className="h-3.5 w-3.5" />
                Assistant IA
              </Button>
            )}
          </div>
          {renderToolbarRight && <div className="flex items-center gap-2">{renderToolbarRight}</div>}
        </div>

        {renderContent && <>{renderContent}</>}
      </div>
    </div>
  )
}

export default ContentTextarea