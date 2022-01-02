import React, { useEffect, useRef, useState } from 'react'
import '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import { Howl } from 'howler'
import './App.css'
import soundURL from './sounds/sound-voice.aac'
import clsx from 'clsx'
import { initNotifications, notify } from '@mycv/f8-notification';

var sound = new Howl({
  src: [soundURL]
})

const NOT_TOUCH_LABEL = 'not_touch'
const TOUCHED_LABEL = 'touched'
const TRAINING_TIMES = 50
const TOUCHED_CONFIDENCE = 0.8

function App() {
  const video = useRef()
  const classifier = useRef()
  const canPlaySound = useRef(true)
  const mobilenetModule = useRef()
  const [touched, setTouched] = useState(false)

  const init = async () => {
    console.log('init...');
    await setupCamera()

    console.log('setup camera success');

    classifier.current = knnClassifier.create()

    mobilenetModule.current = await mobilenet.load() 

    console.log('setup done');
    console.log('Không chạm tay lên mặt và bấm Train 1!');

    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia 
      || navigator.webkitGetUserMedia 
      || navigator.mozGetUserMedia 
      || navigator.msGetUserMedia

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      } else {
        reject()
      }
    })
  }

  const train = async label => {
    console.log(`[${label}] Đang train cho máy gương mặt không góc sống của bạn...`)
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`)
    
      await training(label)
    }
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer (
        video.current,
        true
      )
      classifier.current.addExample(embedding, label)
      await sleep(100)
      resolve()
    })
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer (
      video.current,
      true
    )
    const result = await classifier.current.predictClass(embedding)

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
      ) {
        console.log('Touched');
        if (canPlaySound.current) {
          canPlaySound.current = false
          sound.play()
        }
        sound.play()
        notify('Bỏ tay ra!', { body: 'Bạn vừa chạm tay vào mặt!' })
        setTouched(true)
    } else {
        console.log('Not Touched');
        setTouched(false)
    }

    await sleep(200)

    run()
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  useEffect(() => {
    init()

    sound.on('end', function() {
      canPlaySound.current = true
    })

    return () => {
      console.log('remove init...');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video 
        ref={video}
        className="video"
        autoPlay  
      />

      <div className="control">
        <button className='btn' onClick={() => train(NOT_TOUCH_LABEL)}>Bắt đầu lần Train 1</button>
        <button className='btn' onClick={() => train(TOUCHED_LABEL)}>Bắt đầu lần Train 2</button>
        <button className='btn' onClick={() => run()}>Khời động</button>
      </div>
    </div>
  );
}

export default App;
