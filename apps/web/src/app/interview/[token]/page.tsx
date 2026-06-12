'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Video, Loader2, Circle, Square, RotateCcw, ArrowRight, CheckCircle2, Upload } from 'lucide-react';
import { trpc } from '@/trpc/react';
import { Input, Label } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export default function InterviewRecordPage() {
  const { token } = useParams<{ token: string }>();
  const iv = trpc.videoInterviews.getByToken.useQuery({ token }, { retry: false });
  const presign = trpc.videoInterviews.presignVideo.useMutation();
  const submit = trpc.videoInterviews.submitResponse.useMutation();

  const [phase, setPhase] = useState<'intro' | 'record' | 'done'>('intro');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idx, setIdx] = useState(0);
  const [blobs, setBlobs] = useState<(Blob | null)[]>([]);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [uploading, setUploading] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveRef = useRef<HTMLVideoElement>(null);

  const questions = iv.data?.questions ?? [];

  const stopTracks = useCallback(() => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }, []);
  useEffect(() => () => stopTracks(), [stopTracks]);

  // Re-attach live preview when moving to a fresh (not-yet-recorded) question.
  useEffect(() => {
    if (phase === 'record' && !blobs[idx] && streamRef.current && liveRef.current) {
      liveRef.current.srcObject = streamRef.current;
      liveRef.current.play().catch(() => {});
    }
  }, [phase, idx, blobs]);

  async function startCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not available on this browser. Open the link in Chrome or Safari.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveRef.current) { liveRef.current.srcObject = stream; await liveRef.current.play().catch(() => {}); }
    } catch {
      toast.error('Camera/microphone access is required to record.');
    }
  }

  async function begin() {
    if (name.trim().length < 1) { toast.error('Please enter your name'); return; }
    setBlobs(new Array(questions.length).fill(null));
    setPhase('record');
    setIdx(0);
    await startCamera();
  }

  const stopRecording = useCallback(() => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    setRecording(false);
  }, []);

  // countdown auto-stop
  useEffect(() => {
    if (!recording || secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [recording, secs]);
  useEffect(() => { if (recording && secs === 0) stopRecording(); }, [recording, secs, stopRecording]);

  function startRecording() {
    if (typeof MediaRecorder === 'undefined') { toast.error('Video recording is not supported on this browser.'); return; }
    if (!streamRef.current) { void startCamera(); return; }
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setBlobs((b) => b.map((x, i) => (i === idx ? blob : x)));
    };
    recorderRef.current = mr;
    mr.start();
    setRecording(true);
    setSecs(questions[idx]?.timeLimitSec ?? 60);
  }

  async function finish() {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < questions.length; i++) {
        const blob = blobs[i];
        if (!blob) { toast.error(`Please record question ${i + 1}`); setUploading(false); return; }
        const { uploadUrl, publicUrl } = await presign.mutateAsync({ token, questionIndex: i });
        const put = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'video/webm' } });
        if (!put.ok) throw new Error('Upload failed');
        urls.push(publicUrl);
      }
      await submit.mutateAsync({ token, applicantName: name, applicantEmail: email || undefined, answers: questions.map((qq, i) => ({ questionText: qq.text, videoUrl: urls[i]! })) });
      stopTracks();
      setPhase('done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (iv.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-teal-500" /></div>;
  if (iv.error || !iv.data) return <div className="mx-auto max-w-md p-10 text-center text-navy-700/70">This interview link is not available or has been closed.</div>;

  if (phase === 'done') return (
    <div className="mx-auto max-w-md p-10 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Thank you, {name}!</h1>
      <p className="mt-2 text-navy-700/70">Your video responses have been submitted. The employer will be in touch.</p>
    </div>
  );

  if (phase === 'intro') return (
    <div className="mx-auto max-w-md p-6">
      <div className="flex items-center gap-2"><Video className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">{iv.data.title}</h1></div>
      <p className="mt-2 text-navy-700/70">A {questions.length}-question video interview. You&apos;ll record one answer per question — each has a time limit. Make sure your camera and microphone work.</p>
      <div className="mt-6 space-y-3 rounded-xl border bg-white p-5">
        <div className="space-y-1.5"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Button className="w-full" onClick={begin}>Start interview <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  // record phase
  const recorded = blobs[idx];
  const isLast = idx === questions.length - 1;
  return (
    <div className="mx-auto max-w-2xl p-6">
      <p className="text-sm text-navy-700/60">Question {idx + 1} of {questions.length}</p>
      <h2 className="mt-1 font-display text-xl font-bold text-navy-900">{questions[idx]?.text}</h2>

      <div className="mt-4 overflow-hidden rounded-xl border bg-navy-900">
        {recorded ? (
          <video src={URL.createObjectURL(recorded)} controls className="aspect-video w-full" />
        ) : (
          <video ref={liveRef} muted playsInline className="aspect-video w-full" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!recorded && !recording && <Button onClick={startRecording}><Circle className="h-4 w-4 fill-red-500 text-red-500" /> Record ({questions[idx]?.timeLimitSec}s)</Button>}
        {recording && <Button variant="outline" onClick={stopRecording}><Square className="h-4 w-4 fill-current" /> Stop · {secs}s</Button>}
        {recorded && !recording && <Button variant="outline" onClick={() => { setBlobs((b) => b.map((x, i) => (i === idx ? null : x))); void startCamera(); }}><RotateCcw className="h-4 w-4" /> Re-record</Button>}
        {recorded && !isLast && <Button onClick={() => { setIdx(idx + 1); }}>Next question <ArrowRight className="h-4 w-4" /></Button>}
        {recorded && isLast && <Button onClick={finish} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : <Upload className="h-4 w-4" />} Submit interview</Button>}
      </div>
      <p className="mt-3 text-xs text-navy-700/50">Recording stops automatically at the time limit. You can re-record before moving on.</p>
    </div>
  );
}
