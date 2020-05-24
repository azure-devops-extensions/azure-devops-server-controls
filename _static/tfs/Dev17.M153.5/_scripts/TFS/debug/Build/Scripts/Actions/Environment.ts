import {Action} from "VSS/Flux/Action";

export interface TimerTickedPayload {
    time: Date;
}

export let timerTicked = new Action<TimerTickedPayload>();

// global action creator
setInterval(() => {
    timerTicked.invoke({
        time: new Date()
    });
}, 1000);