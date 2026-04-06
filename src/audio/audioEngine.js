// Shared audio processing chain: all sources → bus → dry/reverb/delay → master → destination
let ctx = null
let bus = null
let dryGain = null
let wetGain = null
let convolver = null
let masterGain = null
let delayNode = null
let delayFeedback = null
let delayWet = null

export function getAudioContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    initChain()
  }
  return ctx
}

function initChain() {
  masterGain = ctx.createGain()
  masterGain.gain.value = 0.8
  masterGain.connect(ctx.destination)

  dryGain = ctx.createGain()
  dryGain.gain.value = 1.0
  dryGain.connect(masterGain)

  convolver = ctx.createConvolver()
  wetGain = ctx.createGain()
  wetGain.gain.value = 0
  convolver.connect(wetGain)
  wetGain.connect(masterGain)

  // Delay effect
  delayNode = ctx.createDelay(2.0)
  delayNode.delayTime.value = 0.35
  delayFeedback = ctx.createGain()
  delayFeedback.gain.value = 0.3
  delayWet = ctx.createGain()
  delayWet.gain.value = 0
  delayNode.connect(delayFeedback)
  delayFeedback.connect(delayNode)
  delayNode.connect(delayWet)
  delayWet.connect(masterGain)

  bus = ctx.createGain()
  bus.gain.value = 1.0
  bus.connect(dryGain)
  bus.connect(convolver)
  bus.connect(delayNode)

  // Generate reverb impulse response
  const rate = ctx.sampleRate
  const length = rate * 2.5
  const impulse = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
    }
  }
  convolver.buffer = impulse
}

export function getOutputNode() {
  getAudioContext()
  return bus
}

// Direct to master, bypassing effects (for metronome etc.)
export function getDryOutputNode() {
  getAudioContext()
  return masterGain
}

export function setVolume(val) {
  getAudioContext()
  masterGain.gain.value = val
}

export function setReverbMix(val) {
  getAudioContext()
  wetGain.gain.value = val * 0.7
  dryGain.gain.value = 1 - val * 0.3
}

export function setDelayMix(val) {
  getAudioContext()
  delayWet.gain.value = val * 0.6
  delayFeedback.gain.value = 0.2 + val * 0.35
}
