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

const green = [
    {x:492,y:225},
    {x:1056,y:251},
    {x:1401,y:88},
    {x:1558,y:401},
    {x:1210,y:532},
    {x:754,y:584},
    {x:341,y:437},
    {x:62,y:287},
    {x:210,y:65}];

const ballRadius = 20,
      resistance = -20;

class Bounce {
    public intersec : Point;
    public distance : number;
    public refl     : Vector;
    constructor(p0 : Point, v0 : Point)
    {
        const speed = magnitude(v0);
        const dir = speed == 0 ? { x: 0, y: 0} : normalizeV(v0);
        const bounce = polygonBounce(green, { orig : p0, vec : dir });
        this.distance = bounce.distance;
        this.intersec = addPV(p0, multiplyVS(dir, bounce.distance));
        this.refl = reflection(v0, bounce.normal);
    }
}

class Trajectory {
    public p0 : Point;
    public dir : Vector;
    public sig : Signal;
    public tStop : number;
    public oBounce : Option<Bounce>;
    public tBounce : Option<number>;

    constructor(t0 : number, p0 : Point, v0 : Vector, green : Point[])
    {
        this.p0 = p0;
        const speed = magnitude(v0);
        this.dir = speed == 0 ? { x: 0, y: 0} : normalizeV(v0);
        this.sig = new Signal(t0, resistance, magnitude(v0), 0);
        this.tStop = this.sig.whenVelocity0();

        if (speed == 0) {
           this.oBounce = none;
           this.tBounce = none;
        }
        else {
           const b = new Bounce(p0, v0);
           const tBounce = this.sig.when(b.distance);
           if (tBounce == null) {
               this.tBounce = option(tBounce);
               this.oBounce = option(b);
           }
        }
    }

    public posAt(t : number) {
        const tLim = t < this.tStop ? t : this.tStop;
        return addPV(this.p0, multiplyVS(this.dir, this.sig.valueAt(tLim)));
    }
}

const constTrajectory = (p0 : Point) =>
      new Trajectory(0, p0, { x: 0, y: 0 }, green);

export default (
        sys: SecondsTimerSystem,
        windowSize: Dimensions,
        sMouseDown : Stream<Point>,
        sMouseMove : Stream<Point>,
        sMouseUp : Stream<Point>,
    ) => {

    const ball = new CellLoop<Point>();
    const sPush = sMouseUp.snapshot(ball, (pt, ballPos) =>
        subtractPP(ballPos, pt));
    const traj = sPush.snapshot3(ball, sys.time, (push, ballPos, t0) =>
        new Trajectory(t0, ballPos, push, green)).hold(constTrajectory({x: 200, y: 200}));
    ball.loop(
        sys.time.lift(traj, (t, traj) => traj.posAt(t)));
    const rubberBand = new CellLoop<Option<Point>>();
    rubberBand.loop(
        sMouseDown.map((pt) => option(pt))
        .orElse(sMouseUp.mapTo(none))
        .orElse(sMouseMove.snapshot(rubberBand, (pt, oband) =>
            oband.nonEmpty ? option(pt) : none))
        .hold(none));
/*
    const bounce = rubberBand.lift(ball, (opt, ball) => {
        if (opt.nonEmpty) {
            const pt = opt.get;
            const velocity = subtractPP(ball, pt);
            const direction = { orig : ball, vec : normalizeV(velocity) } as Ray;
            const bounce = polygonBounce(green, direction);
            const intersec = addPV(ball, multiplyVS(direction.vec, bounce.distance));
            const refl = reflection(velocity, bounce.normal);
            //console.log(bounce.distance+" "+bounce.normal.x+","+bounce.normal.y);
            //return option({ orig : intersec, vec : multiplyVS(bounce.normal, 200) } as Ray);
            return option( {
                incident : { orig : intersec, vec : velocity } as Ray,
                normal   : { orig : intersec, vec : multiplyVS(bounce.normal, 200) } as Ray,
                refl     : { orig : intersec, vec : refl } as Ray });
            //return option({ orig : intersec, vec : refl } as Ray);
        }
        else
            return none;
    });

            bounce.map(obounce => ctx => {
                if (obounce.nonEmpty) {
                    drawRay(ctx, obounce.get.incident);
                    drawRay(ctx, obounce.get.normal);
                    drawRay(ctx, obounce.get.refl);
                }
            }),
    */
    sMouseUp.snapshot(ball, (pt, ball) => {
                 const velocity = subtractPP(ball, pt);
                 //const length = magnitude(direction);
                 const direction = { orig : ball, vec : normalizeV(velocity) } as Ray;
                 const bounce = polygonBounce(green, direction);
                 //console.log(bounce.distance+" "+bounce.normal.x+","+bounce.normal.y);
                 return 0;
            })
            .listen(i => {});
    return append(
            ball.map(pos => ctx => drawBall(ctx, pos, ballRadius, "#ffffff")),
            rubberBand.lift(ball, (oband, ball) => (ctx) => {
                if (oband.nonEmpty) drawLineSegment(ctx, oband.get, ball);
            })
        )
        .map(draw => append_((ctx) => {
            drawPolygon(ctx, green, "#008f00");
        }, draw));
}
