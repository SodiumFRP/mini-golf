import { CellLoop, Stream, SecondsTimerSystem } from "sodiumjs";
import {
    Dimensions, Point, polygonBounce, ballIntersect, Ray, subtractPP,
    normalizeV, reflection, addPV, multiplyVS, magnitude, Vector
} from "./types";
import { Option, option, none } from "ts-option";
import Signal from "./Signal";
import {
    ballRadius,
    resistance,
    boostFactor,
    green,
    holePos,
    white,
    grass,
    black,
    initialVector,
    holeRadius,
} from "./scene";

function drawBall(ctx: CanvasRenderingContext2D, pos: Point, radius: number, colour: string) {
    ctx.lineWidth = 2;
    ctx.fillStyle = colour;
    ctx.beginPath();
    //x, y, radius, start_angle, end_angle, anti-clockwise
    ctx.arc(pos.x, pos.y, radius, 0, (Math.PI * 2), true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawLineSegment(ctx: CanvasRenderingContext2D, p0: Point, p1: Point) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
}

function drawLineDash(ctx: CanvasRenderingContext2D, p0: Point, p1: Point) {
    ctx.save();
    ctx.setLineDash([5, 15]);
    drawLineSegment(ctx, p0, p1);
    ctx.restore();
}

function drawRay(ctx: CanvasRenderingContext2D, ray: Ray) {
    drawLineSegment(ctx, ray.orig, addPV(ray.orig, ray.vec));
}

function drawPolygon(ctx: CanvasRenderingContext2D, poly: Point[], colour: string) {
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (var j = 0; j < poly.length; j++)
        ctx.lineTo(poly[j].x, poly[j].y);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.stroke();
}

const append_ = (f, g) => ctx => {
    f(ctx);
    g(ctx);
};
const append = (f, g) => f.lift(g, append_);
const append3 = (f, g, h) => append(append(f, g), h);

class Bounce {
    public intersec: Point;          // Bounce intersection point
    public tBounce: number | null;  // Bounce time (absolute)
    public reflection: Vector;         // Velocity vector after bounce 

    constructor(sig: Signal, p0: Point, v0: Vector) {
        const speed = magnitude(v0);
        if (speed != 0) {
            const dir = speed == 0 ? initialVector : normalizeV(v0);
            const bounce = polygonBounce(green, { orig: p0, vec: dir });
            const distance = bounce.distance - ballRadius;
            this.tBounce = sig.when(distance) as number;

            if (this.tBounce !== null) {
                this.intersec = addPV(p0, multiplyVS(dir, distance));
                this.reflection = reflection(
                    multiplyVS(dir, sig.velAt(this.tBounce)), bounce.normal);
            }
        } else {
            this.tBounce = null;
        }
    }

    public isValid(): boolean {
        return this.tBounce != null;
    }
}

class Fall {
    public tFall: number | null;            // Time when ball falls into hole

    constructor(sig: Signal, p0: Point, v0: Vector) {
        const speed = magnitude(v0);
        const dir = speed == 0 ? initialVector : normalizeV(v0);
        const fallDistance = ballIntersect(
            { center: holePos, radius: ballRadius },
            { orig: p0, vec: dir }
        );
        this.tFall = fallDistance !== null ? sig.when(fallDistance) as number : null;
    }

    public isValid(): boolean {
        return this.tFall != null;
    }
}

// Ball trajectory: Describes the ball's motion as from time t0.
class Trajectory {
    public p0: Point;                // Initial position
    public v0: Vector;               // Initial speed;
    public dir: Vector;              // Normalized direction
    public sig: Signal;              // Function of t -> distance
    public tStop: number;            // Time when ball rolls to a stop
    public oBounce: Option<Bounce>;  // Next ball bounce (if one exists)
    public oFall: Option<Fall>;      // Next ball fall (if one exists)

    constructor(
        t0: number,                  // Initial time
        p0: Point,                   // Initial position
        v0: Vector,                  // Initial velocity
        green: Point[])              // The green for calculating bounces
    {
        this.p0 = p0;
        this.v0 = v0;
        const speed = magnitude(v0);
        this.dir = speed == 0 ? initialVector : normalizeV(v0);
        this.sig = new Signal(t0, resistance, speed, 0);
        this.tStop = this.sig.whenVelocity0();
        this.oBounce = none;
        this.oFall = none;
        const fall = new Fall(this.sig, p0, v0);

        if (fall.isValid()) {
            this.oFall = option(fall);
        }
        if (speed != 0) {
            const bounce = new Bounce(this.sig, p0, v0);
            if (bounce.isValid()) {
                this.oBounce = option(bounce);
                if (bounce.tBounce && fall.tFall && bounce.tBounce < fall.tFall) {
                    this.oFall = none;
                }
            }
        }
    }

    // Position of the ball at time t
    public posAt(t: number) {
        // After time tStop (ball rolls to a stop) don't move any more.
        const tLim = t < this.tStop ? t : this.tStop;
        return addPV(this.p0, multiplyVS(this.dir, this.sig.posAt(tLim)));
    }
}

const constTrajectory = (p0: Point) =>
    new Trajectory(0, p0, initialVector, green);

export default (
    sys: SecondsTimerSystem,
    windowSize: Dimensions,
    sMouseDown: Stream<Point>,
    sMouseMove: Stream<Point>,
    sMouseUp: Stream<Point>,
) => {

    // Initial ball trajectory - stationary
    const traj0 = constTrajectory({ x: 200, y: 200 });

    const traj = new CellLoop<Trajectory>();
    // Current ball position
    const ball = sys.time.lift(traj, (t, traj) => traj.posAt(t));
    const end = new CellLoop<boolean>();

    // Push the ball when the mouse is released
    const sPush = sMouseUp.snapshot4(ball, sys.time, end, (click, ball, t0, end) => {
        if (end) {
            return null;
        }
        let push = multiplyVS(subtractPP(ball, click), boostFactor);
        return new Trajectory(t0, ball, push, green);
    }).filterNotNull() as Stream<Trajectory>;

    // The time of the next bounce.
    const tBounce = traj.map(traj =>
        (traj.oBounce.nonEmpty ? traj.oBounce.get.tBounce : null) as number);
    const sBounce =
        // Stream that fires at the time of the next bounce
        sys.at(tBounce)
            // At that time, calculate a new trajectory.
            .snapshot(traj,
                (t0, traj) => new Trajectory(t0, traj.oBounce.get.intersec,
                    traj.oBounce.get.reflection, green)
            )
            .filterNotNull() as Stream<Trajectory>;

    // The time of the fall.
    const tFall = traj.map(traj =>
        (traj.oFall.nonEmpty ? traj.oFall.get.tFall : null) as number);

    const sFall =
        // Stream that fires at the time of the next bounce
        sys.at(tFall)
            // At that time, calculate a new trajectory.
            .snapshot(end,
                (tFall, end) => end
                    ? null
                    : new Trajectory(tFall, holePos,
                        initialVector, green)
            )
            .filterNotNull() as Stream<Trajectory>;

    end.loop(sFall.map(() => true).hold(false));

    // Current ball trajectory
    const sGame = sFall.orElse(sPush.orElse(sBounce)) as Stream<Trajectory>;
    traj.loop(sGame.hold(traj0));

    // Rubber band state
    const rubberBand = new CellLoop<Option<Point>>();
    rubberBand.loop(
        sMouseDown.map(pt => option(pt))
            .orElse(sMouseUp.mapTo(none))
            .orElse(sMouseMove.snapshot(rubberBand, (pt, oband) =>
                oband.nonEmpty ? option(pt) : none))
            .snapshot(end, (pos, end) => end ? none : pos)
            .hold(none));

    // Draw stuff
    return append(
        // Draw ball
        ball.map(pos => ctx => drawBall(ctx, pos, ballRadius, white)),
        // Draw rubber band
        rubberBand.lift(ball, (oband, ball) => (ctx) => {
            if (oband.nonEmpty) {
                drawLineDash(ctx, oband.get, ball)
            };
        })
    )
        // Draw Hole
        .map(draw => append_(ctx => drawBall(ctx, holePos, holeRadius, black), draw))
        // Draw green
        .map(draw => append_(ctx => drawPolygon(ctx, green, grass), draw));
}
