import React, { useState, useEffect } from "react";
import { Button } from "antd";

const RandomEmoji = () => {

  const emojiSet = "🚀,🎖,💵,🎉,🍾,🎊,😬,⏳";

  function randEmoji () {
    return emojiSet.split(',')[Math.floor(Math.random() * (6 - 0 + 0))];
  }

  return (
  <span>
    {randEmoji()} {randEmoji()} {randEmoji()} 
  </span>);
}

const CountDownTimer = ({totalSeconds}) =>{

  const [seconds, setSeconds] = useState(totalSeconds)
  const [timeLeft, setTimeLeft] = useState('')

  function getMinSec (seconds) {
      const format = val => `0${Math.floor(val)}`.slice(-2)
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60);
      // console.log('getMinSec',hours, mins, secs, seconds);
      return { hours, mins, secs};
    }

  function updateTime() {
        if(seconds >= 0){
          const {hours, mins, secs} = getMinSec(seconds);

          setTimeLeft(`${hours} : ${mins} : ${secs}`);
          setSeconds(seconds => seconds - 1);
        }
  }

  useEffect(() => {
    // use set timeout and be confident because updateTime will cause rerender
    // rerender mean re call this effect => then it will be similar to how setinterval works
    // but with easy to understand logic
    const token = setTimeout(updateTime, 1000)

    return function cleanUp() {
      clearTimeout(token);
    }
  })


  return (
    <h2>
    <p>
      <RandomEmoji/> {timeLeft} <RandomEmoji/>
    </p>
    <p>
     Hours : Minutes : Seconds 
    </p>
    </h2>
  );
}



export default CountDownTimer;


