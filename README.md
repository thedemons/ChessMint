<p align="center">
  <img width="350" src="/img/logo-h.png">
</p>

# ChessMint
A chess.com extension for analyzing your game during play!

## Features

**Move Analysis**: See how every move compares to the best move.
- See whether a move is the best move, a good move, a blunder, or even a missed win.
- Helps you identify bad moves during play to improve your chess skills.
- See how your opponent is doing and take advantage of their blunders.

**Move Hints**: Don't know what's the best move? Get some hints!
- Show the top moves in the position.
- Show the moves that will lead to a checkmate, for both you and your opponent.

**Evaluation Bar**: Are you winning? See how stockfish thinks!
- Show the evaluation of the current position.
- Do we have a checkmate? See how many moves it will take.

**Auto Move**: Let the computer make moves for you.
- Automatically make a move after finished thinking.
- !! Use this feature against computer opponents for testing purposes only. Using this against human players will get your account banned.

## Preview
<p align="center">
  <img width="500" src="/img/preview.gif">
</p>

## Installing the extension
This extension is only for chrome at the moment, support for firefox browsers is coming soon

I haven't uploaded it onto the chrome store, you must install it manually by following the steps below:

- Download the extension and extract it: [v1.0.0](https://github.com/thedemons/ChessMint/releases/download/v1.0.0/ChessMint.zip)
- Go to the Extensions page by entering `chrome://extensions` in a new tab, or go to the `Manage extensions` page.
- On the top right corner, you should see an option named `Developer mode
`, enable it.
- A button named `Load unpacked` will show up in the top left corner, click it.
- Select the extension folder which you have just extracted. *The right folder should have a file called `manifest.json` in it*.

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