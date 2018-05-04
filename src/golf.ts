import {Cell, CellLoop, Stream, StreamLoop, SecondsTimerSystem, Operational} from "sodiumjs";
import {Dimensions, Point, lineSegmentToRay, polygonBounce, Ray, subtractPP,
        normalizeV, reflection, addPV, multiplyVS} from "./types";
import {Option, option, some, none} from "ts-option";

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

const ballRadius = 20;

export default (
        sys: SecondsTimerSystem,
        windowSize: Dimensions,
        sMouseDown : Stream<Point>,
        sMouseMove : Stream<Point>,
        sMouseUp : Stream<Point>,
    ) => {

    const ball = new Cell<Point>({ x : 200, y: 200 });
    const rubberBand = new CellLoop<Option<Point>>();
    rubberBand.loop(
        sMouseDown.map((pos) => option(pos))
        .orElse(sMouseUp.mapTo(none))
        .orElse(sMouseMove.snapshot(rubberBand, (pos, oband) =>
            oband.nonEmpty ? option(pos) : none))
        .hold(none));
    //const ball = sMouseDown.hold({ x : 200, y: 200 });
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
    sMouseUp.snapshot(ball, (pt, ball) => {
                 const velocity = subtractPP(ball, pt);
                 //const length = magnitude(direction);
                 const direction = { orig : ball, vec : normalizeV(velocity) } as Ray;
                 const bounce = polygonBounce(green, direction);
                 console.log(bounce.distance+" "+bounce.normal.x+","+bounce.normal.y);
                 return 0;
            })
            .listen(i => {});
    return append3(
            ball.map(pos => ctx => drawBall(ctx, pos, ballRadius, "#ffff00")),
            bounce.map(obounce => ctx => {
                if (obounce.nonEmpty) {
                    drawRay(ctx, obounce.get.incident);
                    drawRay(ctx, obounce.get.normal);
                    drawRay(ctx, obounce.get.refl);
                }
            }),
            rubberBand.lift(ball, (oband, ball) => (ctx) => {
                if (oband.nonEmpty) drawLineSegment(ctx, oband.get, ball);
            })
        )
        .map(draw => append_((ctx) => {
            drawPolygon(ctx, green, "#008f00");
        }, draw));
}
