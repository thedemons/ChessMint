<p align="center">
  <img width="400" src="/img/logo-h.png">
</p>

# ChessMint
A chess.com extension for analyzing your game during play!

## Features

**Move Analysis**: See how every move compares to the best move.
- See whether a move is the best move, a good move, a blunder, or a missed win.
- Helps you identify bad moves during play to improve your chess skills.
- See how your opponent is doing and take advantage of their blunders.

**Move Hints**: You don't know what to move? Get some hints!
- Show you the top moves in the position.
- Display the moves that will lead to a checkmate, for both you and your opponent.

## Preview
<p align="center">
  <img width="600" src="/img/preview.gif">
</p>

## Build instruction
This extension is written in typescript, you need to [install npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) first.

Install typescript if you don't have it:
```none
npm i -g typescript
``` 
Clone this repo and build it:
```none
git clone https://github.com/thedemons/ChessMint.git
cd ChessMint
npm i
npm run build
```