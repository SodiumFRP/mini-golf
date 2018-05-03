import {Pos} from './types';

export default (evt: MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.offsetX / rect.width * canvas.width,
        y: evt.offsetY / rect.height * canvas.height
    } as Pos;
}