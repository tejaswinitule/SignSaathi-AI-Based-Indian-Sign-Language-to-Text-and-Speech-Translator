import { useEffect, useRef, useState } from 'react'
import {
  Camera, CameraOff, RotateCcw, Volume2, VolumeX,
  Copy, Trash2, Plus, Hand, AlertCircle, Brain
} from 'lucide-react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { translatorApi } from '../services/api'

const NUM_FRAMES = 30
const FEATURES_PER_FRAME = 126
const FRAME_INTERVAL_MS = 100
const LOW_CONFIDENCE_THRESHOLD = 0.60
const DUPLICATE_WINDOW_MS = 2500

const SUPPORTED_GESTURES = [
  'Drink', 'Eat', 'Father', 'Food', 'Friend', 'Go', 'He',
  'Hello', 'Help', 'Hospital', 'Market', 'Mother', 'No',
  'Please', 'School', 'She', 'Sister', 'Sit', 'Student',
  'Tea', 'Teacher', 'Thank You', 'Today', 'Water', 'What',
  'Where', 'Yes', 'You'
]

export default function Translator() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const landmarkerRef = useRef(null)
  const captureTimerRef = useRef(null)
  const sequenceRef = useRef([])
  const lastAddedPredictionRef = useRef({ text: '', time: 0 })

  const [cameraError, setCameraError] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [sentence, setSentence] = useState([])
  const [word, setWord] = useState('')
  const [apiState, setApiState] = useState('Model not checked')
  const [prediction, setPrediction] = useState(null)
  const [modelName, setModelName] = useState('BiLSTM ISL-40')

  useEffect(() => {
    return () => {
      if (captureTimerRef.current) window.clearInterval(captureTimerRef.current)
      streamRef.current?.getTracks().forEach(track => track.stop())
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      window.speechSynthesis?.cancel()
    }
  }, [])

  async function loadLandmarker() {
    if (landmarkerRef.current) return landmarkerRef.current

    setApiState('Loading MediaPipe hand detector…')
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    )

    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5
    })

    landmarkerRef.current = landmarker
    return landmarker
  }

  async function startCamera() {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable. Open this app on localhost or HTTPS.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      setApiState('Camera ready. Hold one of the 28 supported gestures and recognize it.')
    } catch (error) {
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in browser settings.'
          : error.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : 'Unable to start camera. Check that it is connected and not used by another app.'
      )
    }
  }

  function stopCapture() {
    if (captureTimerRef.current) {
      window.clearInterval(captureTimerRef.current)
      captureTimerRef.current = null
    }
    sequenceRef.current = []
    setIsCapturing(false)
  }

  function stopCamera() {
    stopCapture()
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  function reset() {
    stopCapture()
    setWord('')
    setSentence([])
    setPrediction(null)
    setCameraError('')
    lastAddedPredictionRef.current = { text: '', time: 0 }
    setApiState('Ready for the next gesture.')
  }

  function speak(text) {
    if (!text) return
    if (!('speechSynthesis' in window)) {
      setCameraError('Text-to-speech is not supported by this browser.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    window.speechSynthesis.speak(utterance)
  }

  function addWord() {
    const value = word.trim()
    if (value) setSentence(current => [...current, value])
    setWord('')
  }

  function frameToFeatures(result) {
    const features = new Array(FEATURES_PER_FRAME).fill(0)
    const landmarks = result?.landmarks || []
    const handedness = result?.handedness || []

    for (let handIndex = 0; handIndex < landmarks.length; handIndex += 1) {
      const category = handedness[handIndex]?.[0]?.categoryName?.toLowerCase()
      const slot = category === 'left' ? 0 : category === 'right' ? 1 : -1
      if (slot < 0) continue

      const points = landmarks[handIndex]
      if (!points || points.length !== 21) continue

      const offset = slot * 63
      points.forEach((point, pointIndex) => {
        features[offset + pointIndex * 3] = point.x
        features[offset + pointIndex * 3 + 1] = point.y
        features[offset + pointIndex * 3 + 2] = point.z
      })
    }

    return features
  }

  async function startRecognition() {
    if (!cameraOn || !videoRef.current) {
      setCameraError('Start the camera before recognizing a gesture.')
      return
    }
    if (isCapturing || isPredicting) return

    setCameraError('')
    setPrediction(null)
    sequenceRef.current = []

    try {
      const landmarker = await loadLandmarker()
      setIsCapturing(true)
      setApiState('Capturing 30 frames. Hold one gesture clearly in view…')

      let lastTimestamp = 0
      captureTimerRef.current = window.setInterval(() => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return

        const timestamp = Math.max(performance.now(), lastTimestamp + 1)
        lastTimestamp = timestamp

        const result = landmarker.detectForVideo(video, timestamp)
        sequenceRef.current.push(frameToFeatures(result))

        if (sequenceRef.current.length >= NUM_FRAMES) {
          window.clearInterval(captureTimerRef.current)
          captureTimerRef.current = null
          setIsCapturing(false)
          submitSequence(sequenceRef.current.slice(0, NUM_FRAMES))
        } else {
          setApiState(`Capturing gesture… ${sequenceRef.current.length}/${NUM_FRAMES} frames`)
        }
      }, FRAME_INTERVAL_MS)
    } catch (error) {
      stopCapture()
      setCameraError(`Unable to load hand detector: ${error.message}`)
      setApiState('MediaPipe initialization failed')
    }
  }

  async function submitSequence(sequence) {
    setIsPredicting(true)
    setApiState('Sending landmarks to BiLSTM ISL-40 model…')
    try {
      const response = await translatorApi.predict({ sequence })
      const result = response?.data ?? response
      const recognized = result?.recognized_text
      if (!recognized) throw new Error('The backend did not return a recognized gesture.')

      const confidence = Number(result.confidence)
      const safeConfidence = Number.isFinite(confidence) ? confidence : null
      const isLowConfidence = safeConfidence !== null &&
        safeConfidence < LOW_CONFIDENCE_THRESHOLD

      setModelName(result.model_name || 'BiLSTM ISL-40')
      setPrediction({
        text: recognized,
        confidence: safeConfidence,
        lowConfidence: isLowConfidence
      })

      if (isLowConfidence) {
        setApiState('Low-confidence prediction. Try again with your hand clearly visible.')
      } else {
        const now = Date.now()
        const previous = lastAddedPredictionRef.current
        const isQuickDuplicate =
          previous.text.toLowerCase() === recognized.toLowerCase() &&
          now - previous.time < DUPLICATE_WINDOW_MS

        if (isQuickDuplicate) {
          setApiState(`${recognized} recognized. Duplicate word was not added again.`)
        } else {
          setSentence(current => [...current, recognized])
          lastAddedPredictionRef.current = { text: recognized, time: now }
          setApiState('Gesture recognized and saved to translation history.')
        }
      }
    } catch (error) {
      setCameraError(error.message || 'Prediction failed.')
      setApiState('Prediction failed. Check backend status and try again.')
    } finally {
      setIsPredicting(false)
    }
  }

  async function requestPrediction() {
    setApiState('Checking backend…')
    try {
      const response = await translatorApi.modelStatus?.()
      if (response) {
        const result = response?.data ?? response
        setModelName(result.model_name || 'BiLSTM ISL-40')
        setApiState(result.available
          ? `${result.model_name || 'BiLSTM ISL-40'} is ready (${result.classes || 28} classes).`
          : result.message)
      } else {
        setApiState('Status check is not configured in the API client. Gesture recognition can still be tested.')
      }
    } catch (error) {
      setApiState(error.message?.includes('Failed to fetch')
        ? 'Backend is offline.'
        : `Backend status: ${error.message}`)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(sentence.join(' '))
    } catch {
      setCameraError('Clipboard access was blocked by the browser.')
    }
  }

  const confidenceText = prediction?.confidence == null
    ? 'Confidence: unavailable'
    : `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">AI TRANSLATION STUDIO</div>
        <h1 className="page-title">Live Translator</h1>
        <p className="mt-2 text-sm text-slate-500">
          Capture an Indian Sign Language gesture, recognize it with the BiLSTM ISL-40 model and listen to the result.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="panel-title">Camera input</h2>
              <p className="panel-subtitle">Allow browser access to start your camera</p>
            </div>
            <span className={`status-pill ${cameraOn ? 'status-live' : ''}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {cameraOn ? 'Camera active' : 'Camera stopped'}
            </span>
          </div>

          <div className="camera-stage mt-5">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
              playsInline
              muted
            />
            <div className={`${cameraOn ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center text-center`}>
              <div className="rounded-2xl bg-white/10 p-5 text-white">
                <Camera size={42} strokeWidth={1.3} />
              </div>
              <div className="mt-4 font-semibold text-white">Camera preview</div>
              <p className="mt-1 text-xs text-white/60">Your live video will appear here</p>
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/40 px-3 py-1.5 text-xs text-white">
              Live camera feed
            </div>
          </div>

          {cameraError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {cameraError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={startCamera} disabled={cameraOn}>
              <Camera size={16} /> Start camera
            </button>
            <button className="btn-secondary" onClick={stopCamera} disabled={!cameraOn}>
              <CameraOff size={16} /> Stop camera
            </button>
            <button className="btn-secondary" onClick={reset}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          <div className="mt-5 rounded-xl bg-brand-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <Hand size={17} /> Hand landmark detection
            </div>
            <p className="mt-1 text-xs leading-5 text-brand-700">
              Hold one gesture clearly in view while 30 frames are captured. This model supports 28 selected ISL words.
            </p>
            <details className="mt-2 text-xs text-brand-700">
              <summary className="cursor-pointer font-semibold">View supported gestures</summary>
              <p className="mt-2 leading-6">{SUPPORTED_GESTURES.join(', ')}</p>
            </details>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-primary"
                onClick={startRecognition}
                disabled={!cameraOn || isCapturing || isPredicting}
              >
                <Brain size={16} />
                {isCapturing ? 'Capturing…' : isPredicting ? 'Predicting…' : 'Recognize gesture'}
              </button>
              <button className="btn-secondary" onClick={requestPrediction}>
                Check backend status
              </button>
            </div>
            <div className="mt-2 text-xs text-brand-700">{apiState}</div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="panel">
            <h2 className="panel-title">Recognition result</h2>
            <p className="panel-subtitle">Latest {modelName} prediction</p>
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-xs text-slate-400">PREDICTED WORD</div>
              <div className={`mt-2 text-2xl font-extrabold ${prediction ? 'text-brand-700' : 'text-slate-400'}`}>
                {prediction?.text || 'Waiting for gesture'}
              </div>
              <div className="mt-3 text-xs text-slate-400">{confidenceText}</div>
              {prediction?.lowConfidence && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800">
                  <AlertCircle size={14} />
                  Low confidence. Please perform the gesture again.
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle size={14} />
              Predictions are experimental; accuracy depends on the dataset and signing conditions.
            </div>

            <div className="mt-4 flex gap-2">
              <input
                className="field flex-1"
                value={word}
                onChange={event => setWord(event.target.value)}
                placeholder="Enter a word to test sentence builder"
                onKeyDown={event => event.key === 'Enter' && addWord()}
              />
              <button className="btn-primary" onClick={addWord}>
                <Plus size={16} /> Add
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Manual entry is for testing sentence construction; it is not an AI prediction.
            </p>
          </div>

          <div className="panel">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="panel-title">Your sentence</h2>
                <p className="panel-subtitle">Build and edit translated text</p>
              </div>
              <span className="count-pill">{sentence.length} words</span>
            </div>

            <div className="mt-4 min-h-28 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              {sentence.length
                ? sentence.map((item, index) => (
                    <button
                      key={`${item}-${index}`}
                      onClick={() => setSentence(current => current.filter((_, i) => i !== index))}
                      title="Remove word"
                      className="mr-2 mb-1 inline-flex items-center gap-1 rounded-lg bg-brand-100 px-2 py-1 text-brand-800"
                    >
                      {item}<span>×</span>
                    </button>
                  ))
                : <span className="text-slate-400">Your sentence will appear here…</span>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => speak(sentence.join(' '))} disabled={!sentence.length}>
                <Volume2 size={16} /> Play audio
              </button>
              <button className="btn-secondary" onClick={() => window.speechSynthesis?.cancel()}>
                <VolumeX size={16} /> Stop audio
              </button>
              <button className="btn-secondary" onClick={copy} disabled={!sentence.length}>
                <Copy size={16} /> Copy
              </button>
              <button className="btn-danger" onClick={() => setSentence([])} disabled={!sentence.length}>
                <Trash2 size={16} /> Clear
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
