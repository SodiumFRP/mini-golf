import bounce from "./bounce";
import {SecondsTimerSystem, Operational, Transaction} from "sodiumjs";
import * as modernizrConfig from "./../.modernizrrc.json";
import {Phase} from "./typing";

window.onload = () => {
    const modernizr = modernizrConfig;
    const $container = document.getElementsByClassName("container")[0] as HTMLDivElement;
    const $btn = document.getElementById("restart") as HTMLButtonElement;
    const $log = document.getElementById("log") as HTMLDivElement;
    const $frequency = document.getElementById("frequency") as HTMLInputElement;
    let frequency;
    let animationId;
    let stopped = false;
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

    const main = () => {
        stopped = false;
        const startTime = new Date();
        const windowSize = {
            width: $canvas.width,
            height: $canvas.height
        };
        const sys = new SecondsTimerSystem();

        updateFunc();
        Transaction.run(() => {
            const {cBall, sPhase} = bounce(sys, windowSize);

            Operational.updates(cBall).listen(b => b);
            sPhase.listen(p => {
                if (p === Phase.stopped) {
                    stopped = true;

                    const stopTime = new Date();
                    const logTpl = `from ${startTime} to ${stopTime}, total: ${((+stopTime) - (+startTime)) / 1000} seconds`;
                    const $p = document.createElement("p");
                    $p.innerText = logTpl;
                    $log.appendChild($p);
                    $btn.disabled = false;

                    cancelTimeoutFunc(animationId);
                } else {
                    $btn.disabled = true;
                }
            });

            function animate() {
                if (stopped) return;
                ctx.clearRect(0, 0, windowSize.width, windowSize.height);
                cBall.sample().draw(ctx);
                timeoutFunc(animate, 1000/frequency);
            }

            animate();
        });
    };

    $frequency.addEventListener("input", updateFunc);
    $btn.addEventListener("click", () => main());
    main();
};

