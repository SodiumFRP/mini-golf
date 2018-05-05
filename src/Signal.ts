import {Cell, Operational} from "sodiumjs";
/**
 * Signals for quadratic motion can use for all three quantities: position, velocity, and acceleration.
 * For example,  t0 is the time of the start of the animation, and {t1, t2, t3, …} are the bounce times.
 * The position represented as a Cell<Signal> type starts with s0, and then, when the bounce happens at t1, it’s
 * updated to a new signal s1, and so on.
 */

class Signal {
    public t0: number;
    public a: number;
    public b: number;
    public c: number;
    protected static quantum = 0.000001;

    constructor(t0, a, b, c) {
        this.t0 = t0;
        this.a = a;
        this.b = b;
        this.c = c;
    }

    // Samples signal at a specified time
    public posAt(t: number) {
        const x = t - this.t0;
        return this.a * x * x + this.b * x + this.c;
    }

    public velAt(t: number) {
        const x = t - this.t0;
        return 2 * this.a * x + this.b;
    }

    // Solves the time when the signal’s value reaches x
    public when(x: number) {
        // console.log(`target position is ${x}, new position function is ${this.a}*t^2+${this.b}*t+${this.c}`)
        const c = this.c - x;
        let res;
        if (this.a === 0) {
            const t = -c / this.b;
            res = t >= Signal.quantum ? t + this.t0 : null;
        } else {
            const b24ac = Math.sqrt(this.b * this.b - 4 * this.a * c);
            const t1 = (-this.b + b24ac) / (2 * this.a);
            const t2 = (-this.b - b24ac) / (2 * this.a);

            res = t1 >= Signal.quantum ?
                t2 >= Signal.quantum
                    ? (t1 < t2 ? t1 : t2) + this.t0
                    : t1 + this.t0
                : t2 >= Signal.quantum
                    ? t2 + this.t0
                    : null;
        }
        return res;
    }

    // Solves the time when the velocity is 0.
    public whenVelocity0() {
        return this.t0 - 0.5 * this.b / this.a;
    }

    // handle the quadratic mathematical integral
    public integrate(initial) {
        if (this.a !== 0) {
            throw new Error("Signal can't handle x^3");
        }
        return new Signal(this.t0, this.b / 2, this.c, initial);
    }

    public static integrate(cSig: Cell<Signal>, initial) {
        const sSig = Operational.updates(cSig);
        return sSig.accum(cSig.sample().integrate(initial), (neu, old) => neu.integrate(old.posAt(neu.t0)));
    }
}

export default Signal;