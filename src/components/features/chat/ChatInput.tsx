import { useRef } from 'react'
import { Paperclip, Image as ImageIcon, Video, Square, Mic, Send } from 'lucide-react'

export function ChatInput({
  newMessage,
  onNewMessageChange,
  onSend,
  onFileClick,
  fileType,
  onFileUpload,
  isRecording,
  onStartRecording,
  onStopRecording,
  uploading,
  fileInputRef
}: {
  newMessage: string
  onNewMessageChange: (val: string) => void
  onSend: (e: React.FormEvent) => void
  onFileClick: (type: string) => void
  fileType: string
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <form onSubmit={onSend} className="chat-input-area border-t">
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept={fileType}
        onChange={onFileUpload}
      />
      
      <button type="button" className="btn-icon btn-ghost text-muted" onClick={() => onFileClick('*/*')}>
        <Paperclip size={20} />
      </button>
      <button type="button" className="btn-icon btn-ghost text-muted" onClick={() => onFileClick('image/*')}>
        <ImageIcon size={20} />
      </button>
      <button type="button" className="btn-icon btn-ghost text-muted" onClick={() => onFileClick('video/*')}>
        <Video size={20} />
      </button>
      
      <div className="voice-record-container">
        {isRecording ? (
          <button type="button" className="btn-icon btn-danger pulse" onClick={onStopRecording}>
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button type="button" className="btn-icon btn-ghost text-primary" onClick={onStartRecording}>
            <Mic size={20} />
          </button>
        )}
      </div>
      
      <input 
        type="text" 
        className="chat-input" 
        placeholder="Escribe un mensaje..." 
        value={newMessage}
        onChange={(e) => onNewMessageChange(e.target.value)}
        disabled={uploading}
      />
      
      <button 
        type="submit" 
        className={`btn-icon ${newMessage.trim() ? 'btn-primary' : 'btn-secondary text-muted'}`}
        disabled={!newMessage.trim() || uploading}
      >
        <Send size={18} />
      </button>
    </form>
  )
}
