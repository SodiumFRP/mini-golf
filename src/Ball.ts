class Ball {
    public x: number;
    public y: number;
    public radius: number;
    private rotation: number;
    private scaleX: number;
    private scaleY: number;
    private color: string;
    private lineWidth: number;

    constructor({x = 0, y = 0, radius = 15, border = 1, color = "#ff0000"}) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.color = color;
        this.lineWidth = border;
    }

    public translate(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    public scale(scaleX, scaleY) {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        return this;
    }

    public draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.scale(this.scaleX, this.scaleY);

        context.lineWidth = this.lineWidth;
        context.fillStyle = this.color;
        context.beginPath();
        //x, y, radius, start_angle, end_angle, anti-clockwise
        context.arc(0, 0, this.radius, 0, (Math.PI * 2), true);
        context.closePath();
        context.fill();
        if (this.lineWidth > 0) {
            context.stroke();
        }
        context.restore();
    };
}

export default Ball;
