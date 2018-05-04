import {Point} from './types';

export default (evt: MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / rect.width * canvas.width,
        y: (evt.clientY - rect.top) / rect.height * canvas.height
    } as Point;
}