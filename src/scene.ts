// const green = [
//   { x: 492, y: 225 },
//   { x: 1056, y: 251 },
//   { x: 1401, y: 88 },
//   { x: 1558, y: 401 },
//   { x: 1210, y: 532 },
//   { x: 754, y: 584 },
//   { x: 341, y: 437 },
//   { x: 62, y: 287 },
//   { x: 210, y: 65 }];

const green = [
  { x: 12, y: 248 },
  { x: 183, y: 12 },
  { x: 384, y: 107 },
  { x: 497, y: 253 },
  { x: 528, y: 453 },
  { x: 915, y: 488 },
  { x: 1232, y: 428 },
  { x: 1275, y: 275 },
  { x: 1088, y: 225 },
  { x: 1144, y: 12 },
  { x: 1521, y: 80 },
  { x: 1672, y: 363 },
  { x: 1458, y: 708 },
  { x: 769, y: 678 },
  { x: 271, y: 671 },
  { x: 22, y: 355 }
];
const ballRadius = 20,
  resistance = -70,
  boostFactor = 4;

const holePos = { x: 1400, y: 270 },
  holeRadius = ballRadius + 4;

const grass = "#008f00";
const black = "#000";
const white = "#ffffff";
const initialVector = { x: 0, y: 0 };

export {
  ballRadius,
  resistance,
  boostFactor,
  green,
  holePos,
  white,
  grass,
  black,
  initialVector,
  holeRadius,
}