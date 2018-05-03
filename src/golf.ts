import {Cell, CellLoop, Stream, StreamLoop, SecondsTimerSystem, Operational} from "sodiumjs";
import {Dimensions, Pos} from "./types";
import {Option, option, some, none} from "ts-option";

function drawBall(ctx : CanvasRenderingContext2D, pos : Pos, colour : string)
{
    ctx.lineWidth = 2;
    ctx.fillStyle = colour;
    ctx.beginPath();
    const radius = 20;
    //x, y, radius, start_angle, end_angle, anti-clockwise
    ctx.arc(pos.x, pos.y, radius, 0, (Math.PI * 2), true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawLine(ctx : CanvasRenderingContext2D, p0 : Pos, p1 : Pos)
{
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
}

const append_ = (f, g) => (ctx) => {
        f(ctx);
        g(ctx);
    };
const append = (f, g) => f.lift(g, append_);

export default (
        sys: SecondsTimerSystem,
        windowSize: Dimensions,
        sMouseDown : Stream<Pos>,
        sMouseMove : Stream<Pos>,
        sMouseUp : Stream<Pos>,
    ) => {

    const ballPos = new Cell<Pos>({ x : 200, y: 200 });
    const rubberBand = new CellLoop<Option<Pos>>();
    rubberBand.loop(
        sMouseDown.map((pos) => option(pos))
        .orElse(sMouseUp.mapTo(none))
        .orElse(sMouseMove.snapshot(rubberBand, (pos, oband) =>
            oband.nonEmpty ? option(pos) : none))
        .hold(none));
    //const ballPos = sMouseDown.hold({ x : 200, y: 200 });
    return append(
        ballPos.map((pos) => (ctx) => drawBall(ctx, pos, "#ffff00")),
        rubberBand.lift(ballPos, (oband, ball) => (ctx) => {
            if (oband.nonEmpty) drawLine(ctx, oband.get, ball);
        })
    );
}
