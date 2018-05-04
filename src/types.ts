interface Point {
    readonly x: number;
    readonly y: number;
}

interface Dimensions {
    readonly width: number;
    readonly height: number;
}

interface Vector {
    readonly x: number;
    readonly y: number;
}

function addPV(p : Point, v : Vector) : Point
{
    return { x: p.x + v.x, y: p.y + v.y };
}

function subtractPP(a : Point, b : Point) : Vector
{
    return { x: a.x - b.x, y: a.y - b.y }; 
}

function subtractVV(a : Vector, b : Vector) : Vector
{
    return { x: a.x - b.x, y: a.y - b.y }; 
}

function crossProduct(a : Vector, b : Vector) : number
{
    return a.x * b.y - a.y * b.x; 
}

function dotProduct(a : Vector, b : Vector) : number
{
    return a.x * b.x + a.y * b.y; 
}

function magnitude(a : Vector) : number
{
    return Math.sqrt(a.x*a.x + a.y*a.y);
}

function multiplyVS(a : Vector, s : number) : Vector
{
    return { x : a.x * s, y : a.y * s };
}

function normalizeV(a : Vector) : Vector
{
    return multiplyVS(a, 1/magnitude(a));
}

interface Ray {
    readonly orig: Point;
    readonly vec: Vector; 
}

function lineSegmentToRay(a : Point, b : Point) : Ray
{
    return { orig : a, vec : subtractPP(b, a) };
}

interface Bounce {
    readonly distance : number;
    readonly normal : Vector;
}

// Note: Polygon is assumed to be clockwise
function polygonBounce(poly : Point[], pr : Ray) : Bounce
{
    let best : Bounce = { distance : 0, normal : { x: 0, y : 1 } },
        first = true;
    for (let i = 0; i < poly.length; i++) {
        const j = i == poly.length - 1 ? 0 : i + 1;
        const qs = lineSegmentToRay(poly[i], poly[j]);
        const r_x_s = crossProduct(pr.vec, qs.vec);
        if (r_x_s != 0) {  // Not parallel
            const u = crossProduct(subtractPP(pr.orig, qs.orig), pr.vec) /
                      crossProduct(qs.vec, pr.vec);
            //console.log(u);
            if (u >= 0 && u < 1) {
                const t = crossProduct(subtractPP(qs.orig, pr.orig), qs.vec) /
                          crossProduct(pr.vec, qs.vec);
                //console.log("t="+t);
                if (t >= 0 && (first || t < best.distance)) {
                    const wall = normalizeV(qs.vec),
                          normal = { x: wall.y, y: -wall.x };
                    best = { distance : t, normal : normal };
                    first = false;
                }
            }
        }
    }
    return best;
}

function reflection(incident : Vector, normal : Vector) : Vector
{
    return subtractVV(incident, multiplyVS(normal, 2 * dotProduct(incident, normal)))
}

export {
    Point,
    Dimensions,
    Vector,
    addPV, subtractPP, multiplyVS, normalizeV,
    Ray,
    lineSegmentToRay,
    polygonBounce,
    reflection
}