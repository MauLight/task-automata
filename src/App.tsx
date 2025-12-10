
import { AnimatePresence, motion } from 'motion/react'
import { MicrophoneIcon } from '@heroicons/react/24/outline'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { XCircleIcon } from '@heroicons/react/24/outline'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

interface User {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string
  title: string
}

interface RecognitionProps { lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; stop: () => void; onresult: (e: any) => void; onend: () => void; start: () => void }

function App() {

  const [user, setUser] = useState<User | null>(null)
  const [sprint, setSprint] = useState<string | null>(null)
  const [group, setGroup] = useState<Group | null>(null)

  function saveSelectedUser(value: User) {
    try {
      localStorage.setItem(
        "automata-selected-user",
        JSON.stringify(value)
      )
    } catch (err) {
      console.error("Error saving selected user:", err)
    }
  }

  function getSelectedUser() {
    try {
      const stored = localStorage.getItem("automata-selected-user")
      if (!stored) return null
      setUser(JSON.parse(stored))
    } catch (err) {
      console.error("Error reading selected user:", err)
    }
  }

  function saveSelectedGroup(value: Group) {
    try {
      localStorage.setItem(
        "automata-selected-group",
        JSON.stringify(value)
      )
    } catch (err) {
      console.error("Error saving selected group:", err)
    }
  }

  function getSelectedGroup() {
    try {
      const stored = localStorage.getItem("automata-selected-group")
      if (!stored) return null
      setGroup(JSON.parse(stored))
    } catch (err) {
      console.error("Error reading selected group:", err)
    }
  }

  function selectUser(user: User) {
    setUser(user)
    saveSelectedUser(user)
  }

  function selectSprint(id: string) {
    setSprint(id)
  }

  function selectGroup(group: Group) {
    setGroup(group)
    saveSelectedGroup(group)
  }

  const [transcript, setTranscript] = useState<string | null>(null)
  const [isListening, setIsListening] = useState<boolean>(false)

  const [sending, setSending] = useState<boolean>(false)
  const [counter, setCounter] = useState<number>(5)
  const intervalRef = useRef<number | null>(null)
  const transcriptRef = useRef<string | null>(null)

  const [sendStatus, setSendStatus] = useState<'cancel' | 'error' | 'recording' | 'editing' | 'preparing' | 'sending' | 'success' | 'idle'>('idle')

  const recognitionRef: RefObject<RecognitionProps | null> = useRef<RecognitionProps | null>(null)
  let recognition: RecognitionProps
  let stopTimer: ReturnType<typeof setTimeout> | null = null

  const startRecognition = async () => {
    setIsListening(true)

    recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {

      if (stopTimer) clearTimeout(stopTimer)
      stopTimer = setTimeout(stopRecognition, 2000)

      let text = ""
      for (let i = 0; i < event.results.length; i++) {

        text += event.results[i][0].transcript
      }
      setTranscript(text)
      transcriptRef.current = text
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopRecognition = () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setIsListening(false)

    if (transcriptRef.current && transcriptRef.current.length > 0) setSendStatus('preparing')

    console.log('Recognition stopped due to inactivity.')
  }

  function handleEditUpload() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSendStatus('editing')
    setCounter(5)
  }

  function handleCancelUpload() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSendStatus('idle')
    setTranscript(null)
    setCounter(5)
  }

  async function handleSendMessage() {
    try {
      setSending(true)
      setSendStatus('sending')
      const { data } = await axios.post("/.netlify/functions/send-to-teams", { text: transcriptRef.current, userId: user?.id, username: user?.name, sprint, groupId: group?.id })
      console.log(data)
      setSendStatus('success')
      setTimeout(() => {
        setSendStatus('idle')
        setSending(false)
      }, 3000)
      setTranscript(null)
      if (intervalRef.current) clearInterval(intervalRef.current)
    } catch (err) {
      console.error(err)
      setSendStatus('error')
    }

  }

  function handleCounter() {
    let remaining = 5
    intervalRef.current = setInterval(() => {
      remaining -= 1
      setCounter(prev => prev - 1)

      if (remaining === 0) {
        setSending(true)
        setSendStatus('sending')
        clearInterval(intervalRef.current as number)
        setTimeout(() => {
          setCounter(5)
          handleSendMessage()
        }, 500)
      }
    }, 1000)
  }

  useLayoutEffect(() => {
    getSelectedUser()
    getSelectedGroup()
  }, [])

  useEffect(() => {
    if (sendStatus === 'preparing') handleCounter()
  }, [sendStatus])

  return (
    <div className='w-screen h-screen pt-[200px]'>
      <div className="w-[800px] flex flex-col justify-center items-center gap-y-5 mx-auto">
        {
          sending ? (
            <div className="w-full h-[200px] flex justify-center items-center">
              {
                sendStatus === 'sending' && (
                  <div className="w-full flex justify-center items-center gap-x-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: 'loop'
                      }}
                    >
                      <CloudArrowUpIcon className='w-10 h-10 text-indigo-500' />
                    </motion.div>
                    <h1 className='text-xl'>Sending Task to Monday and Teams</h1>
                  </div>
                )
              }
              {
                sendStatus === 'success' && (
                  <div className="w-full flex justify-center items-center gap-x-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                    >
                      <CloudArrowUpIcon className='w-10 h-10 text-green-500' />
                    </motion.div>
                    <h1 className='text-xl'>Task added succesfully</h1>
                  </div>
                )
              }
              {
                sendStatus === 'error' && (
                  <div className="w-full flex justify-center items-center gap-x-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                    >
                      <CloudArrowUpIcon className='w-10 h-10 text-red-500' />
                    </motion.div>
                    <h1 className='text-xl'>There was an error sending the task</h1>
                    <button
                      className='min-w-[100px] p-4 border border-red-500 rounded-full flex gap-x-1 justify-center items-center outline-0 ml-10'
                      onClick={() => { window.location.reload() }}>Retry</button>
                  </div>
                )
              }
            </div>
          )
            :
            (
              <div className='w-full h-[300px] flex flex-col justify-center-center'>
                {
                  (sendStatus === 'preparing') && (
                    <div className='w-full h-10'>
                      <p className='text-white/70'>Sending task in <b className='text-cyan-500'>{counter}</b> seconds</p>
                    </div>
                  )
                }
                {
                  (sendStatus === 'editing') && (
                    <div className='w-full h-10' />
                  )
                }


                <>
                  {
                    (sendStatus === 'idle' || sendStatus === 'recording') && (
                      <div className='w-full flex flex-col p-5 gap-y-5 items-center justify-center'>
                        <p
                          className={`grow px-2 h-10 text-white text-balance`}
                        >
                          {transcript}
                        </p>
                        <RecordingButton
                          isListening={isListening}
                          startRecognition={startRecognition}
                          stopRecognition={stopRecognition}
                        />
                      </div>
                    )
                  }
                  {
                    transcript && (sendStatus === 'preparing' || sendStatus === 'editing') && (
                      <div className="w-full flex justify-between items-center gap-x-10">
                        <input
                          disabled={!(sendStatus === 'editing')}
                          type="text"
                          value={transcript}
                          onChange={({ target }) => { setTranscript(target.value) }}
                          className={`grow px-2 h-10 text-white text-balance ${sendStatus === 'editing' ? 'border border-gray-500 rounded-lg' : ''}`}
                        />
                        {
                          !isListening && (
                            <div className="flex gap-x-2">
                              {
                                sendStatus === 'editing' ? (
                                  <button
                                    onClick={handleSendMessage}
                                    className='min-w-[100px] p-4 border border-[#292929] rounded-full flex gap-x-1 justify-center items-center outline-0'
                                  >
                                    <CloudArrowUpIcon className='w-6 h-6 text-indigo-500' />
                                    Upload
                                  </button>
                                )
                                  :
                                  (
                                    <button
                                      disabled={isListening}
                                      onClick={handleEditUpload}
                                      className={`min-w-[100px] p-4 border border-[#292929] rounded-full flex gap-x-1 justify-center items-center outline-0 ${isListening ? 'text-gray-600' : ''}`}
                                    >
                                      <PencilSquareIcon className={`w-6 h-6 ${isListening ? 'text-gray-500' : 'text-indigo-500'}`} />
                                      Edit
                                    </button>
                                  )
                              }
                              <button
                                onClick={handleCancelUpload}
                                className='p-4 border border-[#292929] rounded-full flex gap-x-1 justify-center items-center outline-0'
                              >
                                <XCircleIcon className='w-6 h-6 text-red-500' />
                                Cancel
                              </button>
                            </div>
                          )
                        }
                      </div>
                    )
                  }

                  {
                    sendStatus === 'idle' && (
                      <div className='w-full h-10 flex justify-start items-center gap-x-5 mt-10'>
                        <UserPicker
                          user={user ? user : null}
                          selectUser={selectUser}
                        />
                        <SprintPicker selectSprint={selectSprint} />
                        <GroupPicker group={group} selectGroup={selectGroup} />
                      </div>
                    )
                  }
                </>


              </div>
            )
        }

      </div>
    </div>
  )
}

export default App

function RecordingButton({ isListening, startRecognition, stopRecognition }: { isListening: boolean, startRecognition: () => void, stopRecognition: () => void }) {

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={isListening ? stopRecognition : startRecognition}
        className='w-[140px] h-[140px] border border-[#292929] rounded-full flex flex-col gap-y-2 justify-center items-center outline-0'>
        <MicrophoneIcon
          style={{
            color: isListening ? '#EF4444' : ''
          }}
          className='w-9 h-9'
        />
        {isListening ? 'Recording' : 'Record'}
      </motion.button>
    </>
  )
}

function UserPicker({ user, selectUser }: { user: User | null, selectUser: (user: User) => void }) {

  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    <div className='relative w-[250px]'>
      <button onClick={() => { setIsOpen((prev) => !prev) }} className='w-full h-full border border-[#595959] rounded-lg'>{user ? user.name : 'Select user'}</button>
      <AnimatePresence>
        {
          isOpen && (
            <motion.div
              initial={{ top: -20, opacity: 0 }}
              animate={{ top: 30, opacity: 1 }}
              exit={{ top: -20, opacity: 0 }}
              className='absolute top-10 left-0 w-full h-[300px] overflow-y-auto p-2 border rounded-lg overflow-hidden'>
              {
                users.map((elem) => (
                  <button
                    key={elem.id}
                    onClick={() => { selectUser(elem); setIsOpen(false) }}
                    className='h-10 w-full text-start line-clamp-1'>{elem.name}</button>
                ))
              }
            </motion.div>
          )
        }
      </AnimatePresence>
    </div>
  )
}

function SprintPicker({ selectSprint }: { selectSprint: (sprint: string) => void }) {

  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [sprints, setSprints] = useState<{ id: string; name: string }[] | null>(null)
  const [currWeek, setCurrWeek] = useState<number | null>(null)
  const [currSprint, setCurrSprint] = useState<{ id: string; name: string } | null>(null)

  async function fetchSprints() {
    const res = await fetch("/.netlify/functions/get-sprints")
    const data = await res.json()
    setSprints(data)
  }

  function getCurrentWeekNumber() {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000)
    const oneWeek = 1000 * 60 * 60 * 24 * 7

    setCurrWeek(Math.floor(diff / oneWeek) + 1)
  }

  function findSprintByWeek() {
    if (sprints) {
      for (const sprint of sprints) {
        const match = sprint.name.match(/Q\d-(\d+):(\d+)/);
        if (!match) continue;

        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);

        if (currWeek && (currWeek >= start) && (currWeek <= end)) {
          setCurrSprint(sprint)
        }
      }
    }
  }

  useLayoutEffect(() => {
    getCurrentWeekNumber()
    fetchSprints()
  }, [])

  useEffect(() => {
    if (sprints && sprints.length > 0) findSprintByWeek()
  }, [sprints])

  useEffect(() => {
    if (currSprint) selectSprint(currSprint.id)
  }, [currSprint])

  return (

    <div className='relative w-[250px]'>
      <button onClick={() => { setIsOpen((prev) => !prev) }} className='w-full h-full border border-[#595959] rounded-lg'>{currSprint ? currSprint.name : 'Select sprint'}</button>
      <AnimatePresence>
        {
          isOpen && (
            <motion.div
              initial={{ top: -20, opacity: 0 }}
              animate={{ top: 30, opacity: 1 }}
              exit={{ top: -20, opacity: 0 }}
              className='absolute top-10 left-0 w-full h-[300px] overflow-y-auto p-2 border rounded-lg overflow-hidden'>
              {
                currWeek && sprints && sprints.map((elem) => (
                  <button
                    key={elem.id}
                    onClick={() => { setCurrSprint(elem); setIsOpen(false) }}
                    className='h-10 w-full text-start line-clamp-1'>{elem.name}</button>
                ))
              }
            </motion.div>
          )
        }
      </AnimatePresence>
    </div>

  )
}

function GroupPicker({ group, selectGroup }: { group: Group | null, selectGroup: (group: Group) => void }) {

  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [groups, setGroups] = useState<{ id: string; title: string }[] | null>(null)

  async function fetchGroups() {
    const res = await fetch("/.netlify/functions/get-groups")
    const data = await res.json()
    setGroups(data)
  }

  useLayoutEffect(() => {
    fetchGroups()
  }, [])

  return (

    <div className='relative w-[250px]'>
      <button onClick={() => { setIsOpen((prev) => !prev) }} className='w-full h-full border border-[#595959] rounded-lg'>{group ? group.title : 'Select group'}</button>
      <AnimatePresence>
        {
          isOpen && (
            <motion.div
              initial={{ top: -20, opacity: 0 }}
              animate={{ top: 30, opacity: 1 }}
              exit={{ top: -20, opacity: 0 }}
              className='absolute top-10 left-0 w-full h-[300px] overflow-y-auto p-2 border rounded-lg overflow-hidden'>
              {
                groups && groups.map((elem) => (
                  <button
                    key={elem.id}
                    onClick={() => { selectGroup(elem); setIsOpen(false) }}
                    className='h-10 w-full text-start line-clamp-1'>{elem.title}</button>
                ))
              }
            </motion.div>
          )
        }
      </AnimatePresence>
    </div>

  )
}

const users = [
  { id: "43918785", name: "Peter Ippolito", email: "peter@english4kidsonline.com" },
  { id: "43919958", name: "Andrea Penate", email: "andrea@english4kidsonline.com" },
  { id: "43920312", name: "Rob Ippolito", email: "r.ippolito@english4kidsonline.com" },
  { id: "43956294", name: "Francisco Torres", email: "francisco.torres@e4cc.net" },
  { id: "44373725", name: "Sofía García", email: "sofia.garcia@english4kidsonline.com" },
  { id: "47875759", name: "Laura Cardoza", email: "laura.cardoza@english4kidsonline.com" },
  { id: "47941466", name: "Paola Huezo", email: "paola.huezo@english4kidsonline.com" },
  { id: "48502715", name: "Stephen Ippolito", email: "steve@english4kidsonline.com" },
  { id: "58219852", name: "Leandro Campero", email: "leandro@english4kidsonline.com" },
  { id: "62498617", name: "Valentina Munoz", email: "valentina.munoz@english4kidsonline.com" },
  { id: "64449453", name: "Daniel Wilson", email: "daniel.wilson@english4kidsonline.com" },
  { id: "64822749", name: "Yesenia Aguiluz", email: "yesenia.aguiluz@english4kidsonline.com" },
  { id: "67048844", name: "edgardo josue puente herrera", email: "edgardo.herrera@english4kidsonline.com" },
  { id: "67049876", name: "Wilber Fabricio Guzman Sanchez", email: "wilber.guzman@english4kidsonline.com" },
  { id: "69361503", name: "Daniel Guillen", email: "daniel.guillen@english4kidsonline.com" },
  { id: "71279118", name: "Alejandro Barrera", email: "alejandro.barrera@english4kidsonline.com" },
  { id: "71279133", name: "Eduardo Cruz", email: "eduardo.cruz@english4kidsonline.com" },
  { id: "75246532", name: "Rodrigo Silva", email: "rodrigo.silva@english4kidsonline.com" },
  { id: "75959541", name: "Lucia Fernandez", email: "lucia.fernandez@english4kidsonline.com" },
  { id: "75959793", name: "Mau Ulisse Luz", email: "mau.luz@english4kidsonline.com" },
  { id: "75967586", name: "Maria Camila Martinez", email: "camila.martinez@english4kidsonline.com" },
  { id: "78822560", name: "Federico Tissera", email: "federico.tissera@english4kidsonline.com" },
  { id: "78827052", name: "Daniel Edgardo Flores", email: "daniel.flores@english4kidsonline.com" }
]