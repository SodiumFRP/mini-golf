import golf from "./golf";
import {SecondsTimerSystem, Operational, Transaction, Cell, StreamSink} from "sodiumjs";
import * as modernizrConfig from "./../.modernizrrc.json";
import throttle from 'lodash.throttle';
import {Point, Dimensions} from "./types";
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
    const sMouseDown = new StreamSink<Point>();
    const sMouseMove = new StreamSink<Point>();
    const sMouseUp = new StreamSink<Point>();
    const throttledMouse = stream => throttle((e) => stream.send(getCoords(e, $canvas)), 16);
    const throttledMouseDown = throttledMouse(sMouseDown);
    const throttledMouseMove = throttledMouse(sMouseMove);
    const throttledMouseUp = throttledMouse(sMouseUp);
    
    sMouseDown.listen(pt => console.log("{x: "+Math.floor(pt.x)+", y: "+Math.floor(pt.y)+"},"));

    let toKill : () => void = () => { };

    const main = () => {
        toKill();  // Kill old instance
        const sys = new SecondsTimerSystem();

        updateFunc();
        toKill = Transaction.run(() => {

            const scene = golf(sys, windowSize, sMouseDown, sMouseMove, sMouseUp);
            // Dummy listener to hold the scene alive so that sample() functions properly.
            const killScene = scene.listen((sc) => {});
            let running = true;
            let n = 0;

            function animate() {
                if (running) {
                    ctx.fillStyle="#f0ff80";
                    ctx.fillRect(0, 0, windowSize.width, windowSize.height);
                    scene.sample()(ctx);
                    timeoutFunc(animate, 1000/frequency);
                }
            }

            animate();

            return () => {
                running = false;
                killScene();
            };
        });
    };

    $frequency.addEventListener("input", updateFunc);
    $btn.addEventListener("click", () => main());
    $canvas.addEventListener('mousedown', e => {
        e.preventDefault();
        throttledMouseDown(e);
        return false;
    });
    $canvas.addEventListener('mouseup', e => {
        e.preventDefault();
        throttledMouseUp(e);
        return false;
    });
    $canvas.addEventListener('mousemove', e => {
        e.preventDefault();
        throttledMouseMove(e);
        return false;
    });

    function touch2Mouse(e)
    {
      var theTouch = e.changedTouches[0];
      var mouseEv;
    
      switch(e.type)
      {
        case "touchstart": mouseEv="mousedown"; break;  
        case "touchend":   mouseEv="mouseup"; break;
        case "touchmove":  mouseEv="mousemove"; break;
        default: return;
      }
    
      var mouseEvent = document.createEvent("MouseEvent");
      mouseEvent.initMouseEvent(mouseEv, true, true, window, 1, theTouch.screenX, theTouch.screenY, theTouch.clientX, theTouch.clientY, false, false, false, false, 0, null);
      theTouch.target.dispatchEvent(mouseEvent);
    
      e.preventDefault();
    }
    $canvas.addEventListener("touchstart", touch2Mouse, true);
    $canvas.addEventListener("touchmove", touch2Mouse, true);
    $canvas.addEventListener("touchend", touch2Mouse, true);

    main();
};

