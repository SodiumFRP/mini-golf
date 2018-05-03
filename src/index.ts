import golf from "./golf";
import {SecondsTimerSystem, Operational, Transaction, Cell, StreamSink} from "sodiumjs";
import * as modernizrConfig from "./../.modernizrrc.json";
import throttle from 'lodash.throttle';
import {Pos, Dimensions} from "./types";
import getCoords from './getCoords';

window.onload = () => {
    const modernizr = modernizrConfig;
    const $container = document.getElementsByClassName("container")[0] as HTMLDivElement;
    const $btn = document.getElementById("restart") as HTMLButtonElement;
    const $log = document.getElementById("log") as HTMLDivElement;
    const $frequency = document.getElementById("frequency") as HTMLInputElement;
    let frequency;
    let animationId;
    let timeoutFunc:(func:any,time?:number) => any;
    let cancelTimeoutFunc:(any) => any;

    const updateFunc = ()=>{
        frequency = +$frequency.value;
        if(frequency===60) {
            timeoutFunc = requestAnimationFrame;
            cancelTimeoutFunc = cancelAnimationFrame;
        }else{
            timeoutFunc = (func,time)=>setTimeout(func,time);
            cancelTimeoutFunc = clearTimeout;
        }
        (document.querySelector("label[for='frequency']") as HTMLLabelElement).innerText = `FPS:${frequency}`;
        cancelTimeoutFunc(animationId);                             
    };

    if (!modernizr.canvas) {
        $container.innerHTML = 'please use modern browsers like Chrome that' +
            ' supports canvas to get the best user experience.';
        return;
    }
    $container.innerHTML = "<canvas id='canvas' width='1680' height='720' style='width: 100%;" +
        "border:1px solid;box-sizing: border-box;'></canvas>";
    const $canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = $canvas.getContext("2d") as CanvasRenderingContext2D;
    const windowSize = {
        width: $canvas.width,
        height: $canvas.height
    };
    const sMouseDown = new StreamSink<Pos>();
    const sMouseMove = new StreamSink<Pos>();
    const sMouseUp = new StreamSink<Pos>();
    const throttledStream = stream => throttle((e) => stream.send(getCoords(e, $canvas)), 16);
    const throttledMouseDown = throttledStream(sMouseDown);
    const throttledMouseMove = throttledStream(sMouseMove);
    const throttledMouseUp = throttledStream(sMouseUp);

    const main = () => {
        const startTime = new Date();
        const sys = new SecondsTimerSystem();

        updateFunc();
        Transaction.run(() => {

            sMouseDown.listen((pos) => {});
            sMouseMove.listen((pos) => {});
            sMouseUp.listen((pos) => {});

            let scene = (ctx : CanvasRenderingContext2D) => {};
            golf(sys, windowSize, sMouseDown, sMouseMove, sMouseUp).listen((sc) => scene = sc);

            function animate() {
                ctx.clearRect(0, 0, windowSize.width, windowSize.height);
                scene(ctx);
                timeoutFunc(animate, 1000/frequency);
            }

            animate();
        });
    };

    $frequency.addEventListener("input", updateFunc);
    $btn.addEventListener("click", () => main());
    $canvas.addEventListener('mousedown', e => {
        throttledMouseDown(e);
        return false;
    });
    $canvas.addEventListener('mouseup', e => {
        throttledMouseUp(e);
        return false;
    });
    $canvas.addEventListener('mousemove', e => {
        throttledMouseMove(e);
        return false;
    });

    main();
};

