import { useState, useRef, type RefObject } from 'react'

export function useAudioRecorder() {

    const [isRecording, setIsRecording] = useState<boolean>(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [error, setError] = useState<string | null>(null)

    const mediaRecorderRef: RefObject<MediaRecorder | null> = useRef(null)
    const chunksRef: RefObject<Blob[]> = useRef([])

    const startRecording = async () => {
        setError(null)
        setAudioBlob(null)

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)

            chunksRef.current = []
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" })
                setAudioBlob(blob)
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error("Failed to start recording:", err)
            setError("Microphone access denied or unavailable.")
        }
    }

    const stopRecording = () => {
        if (!mediaRecorderRef.current) return

        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
    }

    return {
        isRecording,
        audioBlob,
        error,
        startRecording,
        stopRecording
    }
}