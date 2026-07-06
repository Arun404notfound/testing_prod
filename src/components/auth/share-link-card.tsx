"use client";
import { useState } from "react";
import { Check, Copy, Link2, Mail, MessageCircle, X } from "lucide-react";

export function ShareLinkCard({ message, link }: { message: string; link: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);
  const fullMessage = `${message}\n${link}`;
  async function copy() { await navigator.clipboard.writeText(fullMessage); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  function close() {
    setOpen(false);
    const url = new URL(window.location.href);
    for (const key of ["invite", "token", "name", "email", "reviewed", "status"]) url.searchParams.delete(key);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="share-link-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]"><Link2 size={18}/></span><div><p id="share-link-title" className="font-bold text-[#0F172A]">Share password link</p><p className="text-xs text-[#64748B]">This secure link expires in 48 hours</p></div></div>
        <button type="button" onClick={close} aria-label="Close share dialog" className="rounded-full p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"><X size={18}/></button>
      </div>
      <div className="p-5">
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#475569]">{message}</p>
        <div className="mt-4 break-all rounded-xl border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-3 font-mono text-xs leading-5 text-[#2563EB]">{link}</div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <button type="button" onClick={copy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(fullMessage)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"><MessageCircle size={15}/> WhatsApp</a>
          <a href={`mailto:?subject=${encodeURIComponent("Set your AptIQ password")}&body=${encodeURIComponent(fullMessage)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC]"><Mail size={15}/> Email</a>
        </div>
      </div>
    </div>
  </div>;
}
