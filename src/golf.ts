import {Cell, CellLoop, Stream, StreamLoop, SecondsTimerSystem, Operational} from "sodiumjs";
import {Dimensions, Point, lineSegmentToRay, polygonBounce, Ray, subtractPP,
        normalizeV, reflection, addPV, multiplyVS, magnitude, Vector} from "./types";
import {Option, option, some, none} from "ts-option";
import Signal from "./Signal";

function drawBall(ctx : CanvasRenderingContext2D, pos : Point, radius : number, colour : string)
{
    ctx.lineWidth = 2;
    ctx.fillStyle = colour;
    ctx.beginPath();
    //x, y, radius, start_angle, end_angle, anti-clockwise
    ctx.arc(pos.x, pos.y, radius, 0, (Math.PI * 2), true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawLineSegment(ctx : CanvasRenderingContext2D, p0 : Point, p1 : Point)
{
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
}

function drawRay(ctx : CanvasRenderingContext2D, ray : Ray)
{
    drawLineSegment(ctx, ray.orig, addPV(ray.orig, ray.vec));
}

function drawPolygon(ctx : CanvasRenderingContext2D, poly : Point[], colour : string)
{
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

const green1 = [
    {x:492,y:225},
    {x:1056,y:251},
    {x:1401,y:88},
    {x:1558,y:401},
    {x:1210,y:532},
    {x:754,y:584},
    {x:341,y:437},
    {x:62,y:287},
    {x:210,y:65}];

const green2 = [
    {x: 12, y: 248},
    {x: 183, y: 12},
    {x: 384, y: 107},
    {x: 497, y: 253},
    {x: 528, y: 453},
    {x: 915, y: 488},
    {x: 1232, y: 428},
    {x: 1275, y: 275},
    {x: 1088, y: 225},
    {x: 1144, y: 12},
    {x: 1521, y: 80},
    {x: 1672, y: 363},
    {x: 1458, y: 708},
    {x: 769, y: 678},
    {x: 271, y: 671},
    {x: 22, y: 355}];

const green = green2;

const ballRadius = 20,
      resistance = -70,
      boostFactor = 4;

class Bounce {
    public intersec   : Point;          // Bounce intersection point
    public tBounce    : number | null;  // Bounce time (absolute)
    public reflection : Vector;         // Velocity vector after bounce 

    constructor(sig : Signal, p0 : Point, v0 : Point)
    {
        const speed = magnitude(v0);
        if (speed != 0) {
            const dir = speed == 0 ? { x: 0, y: 0} : normalizeV(v0);
            const bounce = polygonBounce(green, { orig : p0, vec : dir });
            const distance = bounce.distance - ballRadius;
            this.tBounce = sig.when(distance) as number;
            if (this.tBounce != null) {
                this.intersec = addPV(p0, multiplyVS(dir, distance));
                this.reflection = reflection(
                    multiplyVS(dir, sig.velAt(this.tBounce)), bounce.normal);
            }
        }
        else
            this.tBounce = null;
    }

    public isValid() : boolean {
        return this.tBounce != null;
    }
}

// Ball trajectory: Describes the ball's motion as from time t0.
class Trajectory {
    public p0 : Point;                // Initial position
    public dir : Vector;              // Normalized direction
    public sig : Signal;              // Function of t -> distance
    public tStop : number;            // Time when ball rolls to a stop
    public oBounce : Option<Bounce>;  // Next ball bounce (if one exists)

    constructor(
        t0 : number,                  // Initial time
        p0 : Point,                   // Initial position
        v0 : Vector,                  // Initial velocity
        green : Point[])              // The green for calculating bounces
    {
        this.p0 = p0;
        const speed = magnitude(v0);
        this.dir = speed == 0 ? { x: 0, y: 0} : normalizeV(v0);
        this.sig = new Signal(t0, resistance, magnitude(v0), 0);
        this.tStop = this.sig.whenVelocity0();
        this.oBounce = none;

        if (speed != 0) {
           const bounce = new Bounce(this.sig, p0, v0);
           if (bounce.isValid())
               this.oBounce = option(bounce);
        }
    }

    // Position of the ball at time t
    public posAt(t : number) {
        // After time tStop (ball rolls to a stop) don't move any more.
        const tLim = t < this.tStop ? t : this.tStop;
        return addPV(this.p0, multiplyVS(this.dir, this.sig.posAt(tLim)));
    }
}

const constTrajectory = (p0 : Point) =>
      new Trajectory(0, p0, { x: 0, y: 0 }, green);

export default (                                           
        sys:        SecondsTimerSystem,
        windowSize: Dimensions,
        sMouseDown: Stream<Point>,
        sMouseMove: Stream<Point>,
        sMouseUp:   Stream<Point>,
    ) => {

    // Initial ball trajectory - stationary
    const traj0 = constTrajectory({x: 200, y: 200});

    const traj = new CellLoop<Trajectory>();
    // Current ball position
    const ball = sys.time.lift(traj, (t, traj) => traj.posAt(t));
    // Push the ball when the mouse is released
    const sPush = sMouseUp.snapshot3(ball, sys.time, (click, ball, t0) => {
        let push = multiplyVS(subtractPP(ball, click), boostFactor);
        return new Trajectory(t0, ball, push, green);
    });
    // Current ball trajectory
    traj.loop(sPush.hold(traj0));

    // Rubber band state
    const rubberBand = new CellLoop<Option<Point>>();
    rubberBand.loop(
        sMouseDown.map((pt) => option(pt))
        .orElse(sMouseUp.mapTo(none))
        .orElse(sMouseMove.snapshot(rubberBand, (pt, oband) =>
            oband.nonEmpty ? option(pt) : none))
        .hold(none));

    // Draw stuff
    return append(
            // Draw ball
            ball.map(pos => ctx => drawBall(ctx, pos, ballRadius, "#ffffff")),
            // Draw rubber band
            rubberBand.lift(ball, (oband, ball) => (ctx) => {
                if (oband.nonEmpty) drawLineSegment(ctx, oband.get, ball);
            })
        )
        // Draw green
        .map(draw => append_(ctx => drawPolygon(ctx, green, "#008f00"), draw));
}
