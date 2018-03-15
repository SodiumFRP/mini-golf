import {Cell, CellLoop, Stream, StreamLoop, SecondsTimerSystem, Operational} from "sodiumjs";
import Ball from "./Ball";
import Signal from "./Signal";
import {dimensions, Phase} from "./typing";

const bounceAt = (sys: SecondsTimerSystem, vel: Cell<Signal>, pos: Cell<Signal>, target: number) => {
    const restitution = 0.95;
    const cTargetTime = pos.map(p => p.when(target));
    return sys.at(cTargetTime)
        .snapshot(vel,
            (t, v) => t ? new Signal(t, v.a, v.b, -v.valueAt(t) * restitution) : null)
        .filterNotNull() as Stream<Signal>;
};

export default (sys: SecondsTimerSystem, windowSize: dimensions) => {
    const cTime = sys.time;
    const t0 = cTime.sample();
    const ballRadius = 25;
    const ballBorder = 1;
    const cBall = new Cell(new Ball({radius: ballRadius, border: ballBorder}));
    const leftWall = ballRadius + ballBorder;
    const rightWall = windowSize.width - ballRadius - ballBorder;
    const floor = windowSize.height - ballRadius - ballBorder;
    const roof = ballRadius + ballBorder;

    const gravity = new Signal(t0, 0, 0, 1200);
    const sBounceX = new StreamLoop();
    const sBounceY = new StreamLoop();
    const cVelX = sBounceX.hold(new Signal(t0, 0, 0, 350)) as Cell<Signal>;
    // velocity of Y axis is the integral of gravity.
    const cVelY = sBounceY.hold(gravity.integrate(0)) as Cell<Signal>;
    const cPosX = Signal.integrate(cVelX, leftWall);
    const cPosY = Signal.integrate(cVelY, roof);
    const cPhase = new CellLoop<Phase|null>();
    sBounceX.loop(bounceAt(sys, cVelX, cPosX, leftWall)
        .orElse(bounceAt(sys, cVelX, cPosX, rightWall)));
    sBounceY.loop(bounceAt(sys, cVelY, cPosY, floor));

    const sPhase = Operational.value(cTime.lift(cPosY, (t, y,) =>
        y.valueAt(t) > floor + 2 * ballRadius ? Phase.stopped : Phase.running
    ) as Cell<Phase|null>).snapshot(cPhase, (s, c) => s === c ? null : s).filterNotNull();
    cPhase.loop(sPhase.hold(null));
    return {
        cBall: cTime.lift4(cPosX, cPosY, cBall, (t, x, y, ball) =>
            ball.translate(x.valueAt(t), y.valueAt(t))
        ),
        sPhase
    };
}
