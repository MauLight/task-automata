// import { useRef, useState, type RefObject } from "react";

// interface RecognitionProps { lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; stop: () => void; onresult: (e: any) => void; onend: () => void; start: () => void }

// export function useSpeechRecognition() {
//     const [transcript, setTranscript] = useState<string | null>(null)
//     const [isListening, setIsListening] = useState<boolean>(false)

//     const recognitionRef: RefObject<RecognitionProps | null> = useRef<RecognitionProps | null>(null)

//     let recognition: RecognitionProps

//     const startRecognition = async () => {
//         setIsListening(true)

//         recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)()
//         recognition.lang = 'en-US'
//         recognition.interimResults = true
//         recognition.continuous = true
//         recognition.maxAlternatives = 1

//         recognition.onresult = (event) => {
//             console.log(event.results[0][0].transcript)
//             let text = "";
//             for (let i = 0; i < event.results.length; i++) {
//                 text += event.results[i][0].transcript;
//             }
//             setTranscript(text)
//         }

//         recognition.start();
//         recognitionRef.current = recognition
//     }

//     const stopRecognition = () => {
//         if (recognitionRef.current) recognitionRef.current.stop()
//         setIsListening(false)
//         console.log('Recognition stopped due to inactivity.')
//     }

//     return {
//         isListening,
//         startRecognition,
//         stopRecognition
//     }
// }