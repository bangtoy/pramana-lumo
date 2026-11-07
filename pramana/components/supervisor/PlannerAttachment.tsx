"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileText, ImageIcon, LoaderCircle, X } from "lucide-react";
import type { ChatMessage } from "@/lib/contracts";
import { api } from "@/lib/client";
import "./planner-ui.css";

export type PlannerMessage = ChatMessage & { pendingFile?: File };
type Attachment = NonNullable<ChatMessage["files"]>[number];
type FileMeta = { name: string; mime: string };

function Preview({ src, mime, name }: { src?: string; mime: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const image = mime.startsWith("image/");
  return <span className="planner-attachment-preview">
    {image && src && !failed ? <img src={src} alt={`Preview of ${name}`} className="planner-attachment-image" onError={() => setFailed(true)}/> : image ? <ImageIcon size={24} strokeWidth={1.5} aria-hidden="true"/> : <FileText size={24} strokeWidth={1.5} aria-hidden="true"/>}
  </span>;
}

function AttachmentCard({ src, name, mime, size, pending, onRemove, disabled, removeLabel = "Remove attachment" }: {
  src?: string; name: string; mime: string; size?: number; pending?: boolean; onRemove?: () => void; disabled?: boolean; removeLabel?: string;
}) {
  const type = mime === "application/pdf" ? "PDF document" : mime.startsWith("image/") ? `${mime.split("/")[1].toUpperCase()} image` : "Attachment";
  const fileSize = size === undefined ? "" : ` · ${size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`}`;
  return <div className="planner-attachment-card">
    <a href={src} target="_blank" rel="noreferrer" className="planner-attachment-link" aria-label={`Preview ${name}`}>
      <Preview key={src} src={src} mime={mime} name={name}/>
      <span className="min-w-0 flex-1">
        <span className="t-body font-medium planner-attachment-name" title={name}>{name}</span>
        <span className="t-body-sm muted block mt-1">{type}{fileSize}</span>
        <span className="t-body-sm planner-attachment-status">{pending ? <><LoaderCircle size={13} className="motion-safe:animate-spin" aria-hidden="true"/>Processing attachment…</> : onRemove ? "Ready to send" : <>View attachment<ArrowUpRight size={13} aria-hidden="true"/></>}</span>
      </span>
    </a>
    {onRemove && <button type="button" className="planner-icon-button planner-remove-attachment" aria-label={removeLabel} disabled={disabled} onClick={onRemove}><X size={14} aria-hidden="true"/></button>}
  </div>;
}

export function LocalPlannerAttachment({ file, pending, onRemove, disabled, removeLabel }: { file: File; pending?: boolean; onRemove?: () => void; disabled?: boolean; removeLabel?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return <AttachmentCard src={url} name={file.name} mime={file.type} size={file.size} pending={pending} onRemove={onRemove} disabled={disabled} removeLabel={removeLabel}/>;
}

export function SavedPlannerAttachment({ attachment }: { attachment: Attachment }) {
  const metadata = useQuery({ queryKey: ["file-meta", attachment.id], queryFn: () => api<FileMeta>(`/api/files/${encodeURIComponent(attachment.id)}/meta`), staleTime: Infinity });
  return <AttachmentCard src={`/api/files/${encodeURIComponent(attachment.id)}`} name={metadata.data?.name || "Spec Sheet"} mime={metadata.data?.mime || attachment.mime || ""}/>;
}
