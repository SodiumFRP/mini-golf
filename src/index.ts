import bounce from "./bounce";
import {SecondsTimerSystem, Operational, Transaction} from "sodiumjs";
import * as modernizrConfig from "./../.modernizrrc.json";

window.onload = () => {
    const modernizr = modernizrConfig;
    const $container = document.getElementsByClassName("container")[0] as HTMLDivElement;
    if (!modernizr.canvas) {
        $container.innerHTML = 'please use modern browsers like Chrome that' +
            ' supports canvas to get the best user experience.';
        return;
    }
    $container.innerHTML = "<canvas id='canvas' width='1680' height='720' style='width: 100%;border:1px solid;box-sizing: border-box;'></canvas>";
    const $canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = $canvas.getContext("2d") as CanvasRenderingContext2D;

    const windowSize = {
        width: $canvas.width,
        height: $canvas.height
    };
    const sys = new SecondsTimerSystem();
    const cBall = bounce(sys, windowSize);

    Operational.updates(cBall).listen(b => b.draw(ctx));

    function main() {
        ctx.clearRect(0, 0, windowSize.width, windowSize.height);
        Transaction.run(() => {
        });
        requestAnimationFrame(main);
    }

    main();
};

