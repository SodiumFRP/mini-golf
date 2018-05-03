interface Pos {
    x: number,
    y: number
}

interface Dimensions {
    width: number;
    height: number;
}

interface Optional<A> {
    value?: A
}

export {
    Pos,
    Dimensions,
    Optional
}